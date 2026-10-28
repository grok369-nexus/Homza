import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Router, type IRouter } from "express";
import { db, directMessages, messageConversations, properties, users } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();
const tenantUsers = alias(users, "tenant");
const ownerUsers = alias(users, "owner");
const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function isParticipant(conversation: typeof messageConversations.$inferSelect, userId: string) {
  return conversation.tenantId === userId || conversation.ownerId === userId;
}

// The API is the only intended access path. Every read/write verifies membership.
router.get("/messages/conversations", requireAuth, async (req, res, next) => {
  try {
    const user = req.homzaUser!;
    if (user.role === "admin") return res.status(403).json({ error: "Messaging is only available to tenants and property owners." });
    const participantColumn = user.role === "owner" ? messageConversations.ownerId : messageConversations.tenantId;
    const rows = await db.select({
      id: messageConversations.id,
      propertyId: messageConversations.propertyId,
      tenantId: messageConversations.tenantId,
      ownerId: messageConversations.ownerId,
      lastTenantReadAt: messageConversations.lastTenantReadAt,
      lastOwnerReadAt: messageConversations.lastOwnerReadAt,
      updatedAt: messageConversations.updatedAt,
      propertyTitle: properties.title,
      propertyImage: properties.image,
      tenantName: tenantUsers.fullName,
      ownerName: ownerUsers.fullName,
    }).from(messageConversations)
      .innerJoin(properties, eq(messageConversations.propertyId, properties.id))
      .innerJoin(tenantUsers, eq(messageConversations.tenantId, tenantUsers.id))
      .innerJoin(ownerUsers, eq(messageConversations.ownerId, ownerUsers.id))
      .where(eq(participantColumn, user.id))
      .orderBy(desc(messageConversations.updatedAt))
      .limit(100);

    const conversations = await Promise.all(rows.map(async (row) => {
      const [latest] = await db.select({ id: directMessages.id, body: directMessages.body, senderId: directMessages.senderId, createdAt: directMessages.createdAt })
        .from(directMessages).where(eq(directMessages.conversationId, row.id))
        .orderBy(desc(directMessages.createdAt)).limit(1);
      const readAt = user.role === "owner" ? row.lastOwnerReadAt : row.lastTenantReadAt;
      const unread = latest && latest.senderId !== user.id && (!readAt || latest.createdAt > readAt);
      return { ...row, otherParticipantName: user.role === "owner" ? row.tenantName : row.ownerName, latestMessage: latest ?? null, unread: Boolean(unread) };
    }));
    return res.json(conversations);
  } catch (error) { return next(error); }
});

router.post("/messages/conversations", requireAuth, requireRole("tenant"), async (req, res, next) => {
  try {
    const propertyId = req.body?.propertyId;
    const body = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!isUuid(propertyId)) return res.status(400).json({ error: "Choose a valid property." });
    if (body.length < 1 || body.length > 4000) return res.status(400).json({ error: "Message must be between 1 and 4,000 characters." });
    const [listing] = await db.select({ id: properties.id, ownerId: properties.ownerId, status: properties.status })
      .from(properties).where(eq(properties.id, propertyId)).limit(1);
    if (!listing || listing.status !== "available") return res.status(404).json({ error: "This property is no longer available." });
    if (listing.ownerId === req.homzaUser!.id) return res.status(400).json({ error: "You cannot message yourself about your own listing." });

    const [existing] = await db.select().from(messageConversations)
      .where(and(eq(messageConversations.propertyId, propertyId), eq(messageConversations.tenantId, req.homzaUser!.id))).limit(1);
    const conversation = existing ?? (await db.insert(messageConversations).values({
      propertyId, tenantId: req.homzaUser!.id, ownerId: listing.ownerId,
      lastTenantReadAt: new Date(), updatedAt: new Date(),
    }).returning())[0];
    if (!conversation || conversation.ownerId !== listing.ownerId) return res.status(409).json({ error: "This conversation needs to be refreshed. Please try again." });
    const [message] = await db.insert(directMessages).values({ conversationId: conversation.id, senderId: req.homzaUser!.id, body }).returning();
    await db.update(messageConversations).set({ updatedAt: new Date(), lastTenantReadAt: new Date() }).where(eq(messageConversations.id, conversation.id));
    return res.status(201).json({ conversationId: conversation.id, message });
  } catch (error) { return next(error); }
});

router.get("/messages/conversations/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!isUuid(id)) return res.status(400).json({ error: "Invalid conversation." });
    const [conversation] = await db.select().from(messageConversations).where(eq(messageConversations.id, id)).limit(1);
    if (!conversation || !isParticipant(conversation, req.homzaUser!.id)) return res.status(404).json({ error: "Conversation not found." });
    const now = new Date();
    if (conversation.tenantId === req.homzaUser!.id) await db.update(messageConversations).set({ lastTenantReadAt: now }).where(eq(messageConversations.id, id));
    else await db.update(messageConversations).set({ lastOwnerReadAt: now }).where(eq(messageConversations.id, id));
    const messages = await db.select({ id: directMessages.id, senderId: directMessages.senderId, body: directMessages.body, createdAt: directMessages.createdAt })
      .from(directMessages).where(eq(directMessages.conversationId, id)).orderBy(directMessages.createdAt).limit(500);
    return res.json({ conversation: { id: conversation.id, propertyId: conversation.propertyId, tenantId: conversation.tenantId, ownerId: conversation.ownerId }, messages });
  } catch (error) { return next(error); }
});

router.post("/messages/conversations/:id/messages", requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!isUuid(id)) return res.status(400).json({ error: "Invalid conversation." });
    if (body.length < 1 || body.length > 4000) return res.status(400).json({ error: "Message must be between 1 and 4,000 characters." });
    const [conversation] = await db.select().from(messageConversations).where(eq(messageConversations.id, id)).limit(1);
    if (!conversation || !isParticipant(conversation, req.homzaUser!.id)) return res.status(404).json({ error: "Conversation not found." });
    if (req.homzaUser!.role === "admin" || (req.homzaUser!.role !== "tenant" && req.homzaUser!.role !== "owner")) {
      return res.status(403).json({ error: "Only conversation participants can send messages." });
    }
    const now = new Date();
    const [message] = await db.insert(directMessages).values({ conversationId: id, senderId: req.homzaUser!.id, body }).returning();
    const updates: Partial<typeof messageConversations.$inferInsert> = { updatedAt: now };
    if (conversation.tenantId === req.homzaUser!.id) updates.lastTenantReadAt = now;
    else updates.lastOwnerReadAt = now;
    await db.update(messageConversations).set(updates).where(eq(messageConversations.id, id));
    return res.status(201).json(message);
  } catch (error) { return next(error); }
});

export default router;

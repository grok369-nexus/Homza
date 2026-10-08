import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  AddFavoriteParams,
  CreatePropertyBody,
  CreateSavedSearchBody,
  GetPropertyParams,
  ListPropertiesQueryParams,
  ReportPropertyBody,
  SubmitContactMessageBody,
  UpdatePropertyBody,
} from "@workspace/api-zod";
import { db, favorites, properties, reports, savedSearches, users, contactMessages } from "@workspace/db";
import { optionalAuth, requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

function toPropertyDto(row: typeof properties.$inferSelect, owner: typeof users.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    location: row.location,
    district: row.district,
    neighborhood: row.neighborhood,
    rent: row.rent,
    advanceMonths: row.advanceMonths,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    size: row.size,
    image: row.image,
    images: row.images ?? [],
    description: row.description,
    amenities: row.amenities ?? [],
    status: row.status,
    verified: row.verified,
    owner: {
      name: owner.fullName,
      phone: owner.phone ?? "",
      initials: owner.fullName.split(/\s+/).map((part) => part[0] ?? "").join("").slice(0, 2).toUpperCase(),
      verified: owner.ownerVerificationStatus === "verified",
    },
    views: row.views,
    leads: row.leads,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    lastVerifiedAt: row.lastVerifiedAt?.toISOString().slice(0, 10) ?? null,
  };
}

async function propertyWithOwner(id: string) {
  const [record] = await db
    .select({ property: properties, owner: users })
    .from(properties)
    .innerJoin(users, eq(properties.ownerId, users.id))
    .where(eq(properties.id, id))
    .limit(1);
  return record;
}

const sortProperties = (rows: Array<{ property: typeof properties.$inferSelect; owner: typeof users.$inferSelect }>, sort?: string) => {
  const result = [...rows];
  if (sort === "lowest") return result.sort((a, b) => a.property.rent - b.property.rent);
  if (sort === "highest") return result.sort((a, b) => b.property.rent - a.property.rent);
  if (sort === "newest") return result.sort((a, b) => b.property.createdAt.getTime() - a.property.createdAt.getTime());
  if (sort === "viewed") return result.sort((a, b) => b.property.views - a.property.views);
  return result.sort((a, b) => Number(b.property.verified) - Number(a.property.verified) || b.property.views - a.property.views);
};

// Public browsing exposes available listings only. Drafts and moderation states stay private.
router.get("/properties", async (req, res, next) => {
  try {
    const parsed = ListPropertiesQueryParams.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "Invalid property filters" });
    const { location, type, minRent, maxRent, bedrooms, advanceMonths, amenity, sort } = parsed.data;
    const conditions = [eq(properties.status, "available")];
    if (location) conditions.push(ilike(properties.location, `%${location}%`));
    if (type && type !== "All types") conditions.push(eq(properties.type, type));
    if (minRent) conditions.push(gte(properties.rent, minRent));
    if (maxRent) conditions.push(lte(properties.rent, maxRent));
    if (bedrooms) conditions.push(gte(properties.bedrooms, bedrooms));
    if (advanceMonths) conditions.push(lte(properties.advanceMonths, advanceMonths));

    const rows = await db.select({ property: properties, owner: users })
      .from(properties)
      .innerJoin(users, eq(properties.ownerId, users.id))
      .where(and(...conditions))
      .orderBy(desc(properties.verified), desc(properties.createdAt))
      .limit(200);
    let filtered = rows;
    if (amenity) {
      const needle = amenity.toLowerCase();
      filtered = rows.filter(({ property }) => (property.amenities ?? []).some((item) => item.toLowerCase().includes(needle)));
    }
    return res.json(sortProperties(filtered, sort).map(({ property, owner }) => toPropertyDto(property, owner)));
  } catch (error) {
    return next(error);
  }
});

router.get("/properties/:id", optionalAuth, async (req, res, next) => {
  try {
    const parsed = GetPropertyParams.safeParse(req.params);
    if (!parsed.success) return res.status(400).json({ error: "Invalid property id" });
    const record = await propertyWithOwner(parsed.data.id);
    if (!record) return res.status(404).json({ error: "Property not found" });
    const isOwner = req.homzaUser?.id === record.property.ownerId;
    const isAdmin = req.homzaUser?.role === "admin";
    if (record.property.status !== "available" && !isOwner && !isAdmin) {
      return res.status(404).json({ error: "Property not found" });
    }
    if (record.property.status === "available") {
      await db.update(properties).set({ views: sql`${properties.views} + 1` }).where(eq(properties.id, record.property.id));
      record.property.views += 1;
    }
    return res.json(toPropertyDto(record.property, record.owner));
  } catch (error) {
    return next(error);
  }
});

router.patch("/properties/:id", requireAuth, requireRole("owner", "admin"), async (req, res, next) => {
  try {
    const params = GetPropertyParams.safeParse(req.params);
    const body = UpdatePropertyBody.safeParse(req.body);
    if (!params.success || !body.success) return res.status(400).json({ error: "Invalid property update" });
    const existing = await propertyWithOwner(params.data.id);
    if (!existing) return res.status(404).json({ error: "Property not found" });
    if (req.homzaUser!.role !== "admin" && existing.property.ownerId !== req.homzaUser!.id) {
      return res.status(403).json({ error: "You can only update your own listings" });
    }

    const input = body.data as Record<string, unknown>;
    const update: Partial<typeof properties.$inferInsert> = {};
    const editableText = ["title", "type", "location", "district", "neighborhood", "image", "description"] as const;
    for (const key of editableText) {
      if (typeof input[key] === "string") update[key] = input[key] as never;
    }
    for (const key of ["rent", "advanceMonths", "bedrooms", "bathrooms", "size"] as const) {
      if (typeof input[key] === "number") update[key] = input[key] as never;
    }
    if (Array.isArray(input.images) && input.images.every((item) => typeof item === "string")) update.images = input.images as string[];
    if (Array.isArray(input.amenities) && input.amenities.every((item) => typeof item === "string")) update.amenities = input.amenities as string[];
    if (req.homzaUser!.role === "admin") {
      if (typeof input.verified === "boolean") {
        update.verified = input.verified;
        update.lastVerifiedAt = input.verified ? new Date() : null;
      }
      if (["available", "pending", "rented", "paused", "hidden"].includes(String(input.status))) {
        update.status = input.status as typeof properties.$inferInsert.status;
      }
    } else if (["available", "rented", "paused", "hidden"].includes(String(input.status))) {
      update.status = input.status as typeof properties.$inferInsert.status;
    }

    const [updated] = await db.update(properties).set(update).where(eq(properties.id, existing.property.id)).returning();
    const record = await propertyWithOwner(updated.id);
    return res.json(toPropertyDto(record!.property, record!.owner));
  } catch (error) {
    return next(error);
  }
});

router.get("/owner/properties", requireAuth, requireRole("owner", "admin"), async (req, res, next) => {
  try {
    const rows = await db.select({ property: properties, owner: users })
      .from(properties)
      .innerJoin(users, eq(properties.ownerId, users.id))
      .where(req.homzaUser!.role === "admin" ? undefined : eq(properties.ownerId, req.homzaUser!.id))
      .orderBy(desc(properties.createdAt));
    return res.json(rows.map(({ property, owner }) => toPropertyDto(property, owner)));
  } catch (error) {
    return next(error);
  }
});

router.post("/owner/properties", requireAuth, requireRole("owner"), async (req, res, next) => {
  try {
    const body = CreatePropertyBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Please complete all required listing fields" });
    const data = body.data;
    const [created] = await db.insert(properties).values({
      ownerId: req.homzaUser!.id,
      title: data.title,
      type: data.type,
      location: `${data.neighborhood}, ${data.district}`,
      district: data.district,
      neighborhood: data.neighborhood,
      rent: data.rent,
      advanceMonths: data.advanceMonths,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      image: data.image ?? "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=75",
      images: data.image ? [data.image] : [],
      description: data.description ?? "",
      amenities: data.amenities,
      status: "pending",
      verified: false,
    }).returning();
    const record = await propertyWithOwner(created.id);
    return res.status(201).json(toPropertyDto(record!.property, record!.owner));
  } catch (error) {
    return next(error);
  }
});

router.get("/favorites", requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select({ property: properties, owner: users })
      .from(favorites)
      .innerJoin(properties, eq(favorites.propertyId, properties.id))
      .innerJoin(users, eq(properties.ownerId, users.id))
      .where(eq(favorites.userId, req.homzaUser!.id));
    return res.json(rows.map(({ property, owner }) => toPropertyDto(property, owner)));
  } catch (error) {
    return next(error);
  }
});

router.post("/favorites/:propertyId", requireAuth, async (req, res, next) => {
  try {
    const params = AddFavoriteParams.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid property id" });
    const [property] = await db.select().from(properties).where(and(eq(properties.id, params.data.propertyId), eq(properties.status, "available"))).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });
    await db.insert(favorites).values({ userId: req.homzaUser!.id, propertyId: property.id }).onConflictDoNothing();
    return res.status(201).json({ id: property.id, saved: true });
  } catch (error) {
    return next(error);
  }
});

router.delete("/favorites/:propertyId", requireAuth, async (req, res, next) => {
  try {
    const params = AddFavoriteParams.safeParse(req.params);
    if (!params.success) return res.status(400).json({ error: "Invalid property id" });
    await db.delete(favorites).where(and(eq(favorites.userId, req.homzaUser!.id), eq(favorites.propertyId, params.data.propertyId)));
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.get("/searches", requireAuth, async (req, res, next) => {
  try {
    const rows = await db.select().from(savedSearches).where(eq(savedSearches.userId, req.homzaUser!.id)).orderBy(desc(savedSearches.createdAt));
    return res.json(rows.map((row) => ({ id: row.id, name: row.name, location: row.location, summary: row.summary, matches: 0, updatedAt: row.createdAt.toISOString() })));
  } catch (error) {
    return next(error);
  }
});

router.post("/searches", requireAuth, async (req, res, next) => {
  try {
    const body = CreateSavedSearchBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Please name your saved search" });
    const [saved] = await db.insert(savedSearches).values({ userId: req.homzaUser!.id, ...body.data }).returning();
    return res.status(201).json({ id: saved.id, name: saved.name, location: saved.location, summary: saved.summary, matches: 0, updatedAt: saved.createdAt.toISOString() });
  } catch (error) {
    return next(error);
  }
});

router.get("/owner/leads", requireAuth, requireRole("owner", "admin"), (_req, res) => res.json([]));

router.post("/reports", optionalAuth, async (req, res, next) => {
  try {
    const body = ReportPropertyBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Please select a report reason" });
    const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, body.data.propertyId)).limit(1);
    if (!property) return res.status(404).json({ error: "Property not found" });
    const [report] = await db.insert(reports).values({
      propertyId: property.id,
      reporterId: req.homzaUser?.id ?? null,
      reason: body.data.reason,
    }).returning();
    return res.status(201).json({ id: report.id, propertyId: report.propertyId, reason: report.reason, createdAt: report.createdAt.toISOString() });
  } catch (error) {
    return next(error);
  }
});

router.post("/contact", optionalAuth, async (req, res, next) => {
  try {
    const body = SubmitContactMessageBody.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: "Please complete the contact form" });
    const [message] = await db.insert(contactMessages).values({
      userId: req.homzaUser?.id ?? null,
      ...body.data,
    }).returning();
    return res.status(201).json({ id: message.id, name: message.name, email: message.email, topic: message.topic, message: message.message, createdAt: message.createdAt.toISOString() });
  } catch (error) {
    return next(error);
  }
});

export default router;

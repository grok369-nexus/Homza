import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, favorites, properties, reports, savedSearches, users } from "@workspace/db";
import { requireAuth, requireRole } from "../lib/auth";

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

async function listedProperties(whereClause?: ReturnType<typeof eq>) {
  const rows = await db.select({ property: properties, owner: users })
    .from(properties)
    .innerJoin(users, eq(properties.ownerId, users.id))
    .where(whereClause)
    .orderBy(desc(properties.createdAt))
    .limit(200);
  return rows.map(({ property, owner }) => toPropertyDto(property, owner));
}

router.get("/dashboard/tenant", requireAuth, requireRole("tenant"), async (req, res, next) => {
  try {
    const [favoriteCount] = await db.select({ value: count() }).from(favorites).where(eq(favorites.userId, req.homzaUser!.id));
    const [searchCount] = await db.select({ value: count() }).from(savedSearches).where(eq(savedSearches.userId, req.homzaUser!.id));
    const available = await listedProperties(eq(properties.status, "available"));
    return res.json({
      savedProperties: favoriteCount.value,
      savedSearches: searchCount.value,
      recentViews: 0,
      messages: 0,
      recommended: available.slice(0, 3),
      nearby: available.slice(3, 6),
      recentlyViewed: [],
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/dashboard/owner", requireAuth, requireRole("owner"), async (req, res, next) => {
  try {
    const rows = await db.select().from(properties).where(eq(properties.ownerId, req.homzaUser!.id)).orderBy(desc(properties.createdAt));
    return res.json({
      totalProperties: rows.length,
      activeListings: rows.filter((property) => property.status === "available").length,
      totalViews: rows.reduce((sum, property) => sum + property.views, 0),
      leads: rows.reduce((sum, property) => sum + property.leads, 0),
      weeklyViews: [],
      properties: await listedProperties(eq(properties.ownerId, req.homzaUser!.id)),
      activity: [],
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/dashboard/admin", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const [userCount] = await db.select({ value: count() }).from(users);
    const [tenantCount] = await db.select({ value: count() }).from(users).where(eq(users.role, "tenant"));
    const [ownerCount] = await db.select({ value: count() }).from(users).where(eq(users.role, "owner"));
    const [activeCount] = await db.select({ value: count() }).from(properties).where(eq(properties.status, "available"));
    const [pendingVerificationCount] = await db.select({ value: count() }).from(users).where(and(eq(users.role, "owner"), inArray(users.ownerVerificationStatus, ["unverified", "pending"])));
    const [reportCount] = await db.select({ value: count() }).from(reports).where(inArray(reports.status, ["open", "reviewing"]));
    const verificationQueue = await db.select({
      id: users.id,
      owner: users.fullName,
      phone: users.phone,
      submittedAt: users.createdAt,
      status: users.ownerVerificationStatus,
    }).from(users).where(and(eq(users.role, "owner"), inArray(users.ownerVerificationStatus, ["unverified", "pending"]))).orderBy(desc(users.createdAt)).limit(50);
    const moderationQueue = await listedProperties(eq(properties.status, "pending"));
    return res.json({
      totalUsers: userCount.value,
      tenants: tenantCount.value,
      owners: ownerCount.value,
      activeProperties: activeCount.value,
      pendingVerification: pendingVerificationCount.value,
      monthlyRevenue: 0,
      reportedListings: reportCount.value,
      verificationQueue: verificationQueue.map((row) => ({
        id: row.id,
        owner: row.owner,
        phone: row.phone ?? "",
        submittedAt: row.submittedAt.toISOString(),
        status: row.status,
      })),
      moderationQueue,
    });
  } catch (error) {
    return next(error);
  }
});


router.get("/admin/users", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      phone: users.phone,
      ownerVerificationStatus: users.ownerVerificationStatus,
      createdAt: users.createdAt,
    }).from(users).orderBy(desc(users.createdAt)).limit(200);
    return res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/owners", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      ownerVerificationStatus: users.ownerVerificationStatus,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, "owner")).orderBy(desc(users.createdAt)).limit(200);
    return res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/properties", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    return res.json(await listedProperties());
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/reports", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const rows = await db.select({
      id: reports.id,
      propertyId: reports.propertyId,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      propertyTitle: properties.title,
      location: properties.location,
    }).from(reports)
      .innerJoin(properties, eq(reports.propertyId, properties.id))
      .orderBy(desc(reports.createdAt))
      .limit(200);
    return res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
  } catch (error) {
    return next(error);
  }
});

export default router;

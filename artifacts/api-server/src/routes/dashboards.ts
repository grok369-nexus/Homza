import { Router, type IRouter } from "express";
import { properties, visibleProperties, leads, savedSearches } from "../lib/homza-data";

const router: IRouter = Router();

router.get("/dashboard/tenant", (_req, res) => {
  const available = visibleProperties();
  res.json({
    savedProperties: 2,
    savedSearches: savedSearches.length,
    recentViews: 14,
    messages: 3,
    recommended: available.slice(0, 3),
    nearby: available.slice(2, 5),
    recentlyViewed: available.slice(1, 4),
  });
});

router.get("/dashboard/owner", (_req, res) => {
  const ownerProperties = properties.filter((property) => property.owner.name === "Michael Okello");
  res.json({
    totalProperties: ownerProperties.length,
    activeListings: ownerProperties.filter((property) => property.status === "available").length,
    totalViews: ownerProperties.reduce((sum, property) => sum + property.views, 0),
    leads: ownerProperties.reduce((sum, property) => sum + property.leads, 0),
    weeklyViews: [
      { label: "Mon", value: 180 },
      { label: "Tue", value: 150 },
      { label: "Wed", value: 220 },
      { label: "Thu", value: 305 },
      { label: "Fri", value: 245 },
      { label: "Sat", value: 165 },
      { label: "Sun", value: 112 },
    ],
    properties: ownerProperties,
    activity: [
      { id: "activity-1", text: "New view on 2 Bedroom Apartment — Kyanja", time: "2 minutes ago", kind: "view" },
      { id: "activity-2", text: "New lead from WhatsApp", time: "15 minutes ago", kind: "lead" },
      { id: "activity-3", text: "Availability check sent for 3 properties", time: "1 hour ago", kind: "reminder" },
    ],
  });
});

router.get("/dashboard/admin", (_req, res) => {
  res.json({
    totalUsers: 248,
    tenants: 201,
    owners: 47,
    activeProperties: visibleProperties().length,
    pendingVerification: 6,
    monthlyRevenue: 1840000,
    reportedListings: 3,
    verificationQueue: [
      { id: "verify-1", owner: "Peter Mugisha", phone: "+256 783 419 027", submittedAt: "Today, 09:42", status: "under_review" },
      { id: "verify-2", owner: "Grace Achieng", phone: "+256 779 314 880", submittedAt: "Yesterday", status: "pending" },
      { id: "verify-3", owner: "Robert Ssentongo", phone: "+256 704 182 662", submittedAt: "Aug 30, 2026", status: "pending" },
    ],
    moderationQueue: properties.filter((property) => property.status === "pending"),
  });
});

export default router;
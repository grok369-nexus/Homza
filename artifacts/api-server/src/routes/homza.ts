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
import {
  favorites,
  getProperty,
  leads,
  properties,
  savedSearches,
  contactMessages,
  visibleProperties,
  type HomzaProperty,
} from "../lib/homza-data";

const router: IRouter = Router();

const propertySort = (items: HomzaProperty[], sort?: string) => {
  const sorted = [...items];
  if (sort === "lowest") return sorted.sort((a, b) => a.rent - b.rent);
  if (sort === "highest") return sorted.sort((a, b) => b.rent - a.rent);
  if (sort === "newest") return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === "viewed") return sorted.sort((a, b) => b.views - a.views);
  return sorted.sort((a, b) => Number(b.verified) - Number(a.verified) || b.views - a.views);
};

router.get("/properties", (req, res) => {
  const parsed = ListPropertiesQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid property filters" });
  const { location, type, minRent, maxRent, bedrooms, advanceMonths, amenity, sort } = parsed.data;
  let result = visibleProperties();
  if (location) {
    const needle = location.toLowerCase();
    result = result.filter((property) =>
      `${property.location} ${property.district} ${property.neighborhood}`.toLowerCase().includes(needle),
    );
  }
  if (type && type !== "All types") result = result.filter((property) => property.type.toLowerCase() === type.toLowerCase());
  if (maxRent) result = result.filter((property) => property.rent <= maxRent);
  if (minRent) result = result.filter((property) => property.rent >= minRent);
  if (bedrooms) result = result.filter((property) => property.bedrooms >= bedrooms);
  if (advanceMonths) result = result.filter((property) => property.advanceMonths <= advanceMonths);
  if (amenity) {
    const needle = amenity.toLowerCase();
    result = result.filter((property) => property.amenities.some((item) => item.toLowerCase().includes(needle)));
  }
  return res.json(propertySort(result, sort));
});

router.get("/properties/:id", (req, res) => {
  const parsed = GetPropertyParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid property id" });
  const property = getProperty(parsed.data.id);
  if (!property) return res.status(404).json({ error: "Property not found" });
  property.views += 1;
  return res.json(property);
});

router.patch("/properties/:id", (req, res) => {
  const params = GetPropertyParams.safeParse(req.params);
  const body = UpdatePropertyBody.safeParse(req.body);
  if (!params.success || !body.success) return res.status(400).json({ error: "Invalid property update" });
  const property = getProperty(params.data.id);
  if (!property) return res.status(404).json({ error: "Property not found" });
  Object.assign(property, body.data);
  return res.json(property);
});

router.get("/owner/properties", (_req, res) => {
  return res.json(properties.filter((property) => property.owner.name === "Michael Okello"));
});

router.post("/owner/properties", (req, res) => {
  const body = CreatePropertyBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Please complete all required listing fields" });
  const now = new Date().toISOString().slice(0, 10);
  const property: HomzaProperty = {
    id: `prop-${Date.now()}`,
    title: body.data.title,
    type: body.data.type,
    location: `${body.data.neighborhood}, ${body.data.district}`,
    district: body.data.district,
    neighborhood: body.data.neighborhood,
    rent: body.data.rent,
    advanceMonths: body.data.advanceMonths,
    bedrooms: body.data.bedrooms,
    bathrooms: body.data.bathrooms,
    size: null,
    image: body.data.image ?? "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=75",
    images: body.data.image ? [body.data.image] : [],
    description: body.data.description,
    amenities: body.data.amenities,
    status: "pending",
    verified: false,
    owner: { name: "Michael Okello", phone: "+256 772 451 903", initials: "MO", verified: true },
    views: 0,
    leads: 0,
    createdAt: now,
    lastVerifiedAt: null,
  };
  properties.unshift(property);
  return res.status(201).json(property);
});

router.get("/favorites", (_req, res) => {
  return res.json(properties.filter((property) => favorites.has(property.id)));
});

router.post("/favorites/:propertyId", (req, res) => {
  const params = AddFavoriteParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid property id" });
  const property = getProperty(params.data.propertyId);
  if (!property) return res.status(404).json({ error: "Property not found" });
  favorites.add(property.id);
  return res.status(201).json(property);
});

router.delete("/favorites/:propertyId", (req, res) => {
  const params = AddFavoriteParams.safeParse(req.params);
  if (!params.success) return res.status(400).json({ error: "Invalid property id" });
  favorites.delete(params.data.propertyId);
  return res.status(204).send();
});

router.get("/searches", (_req, res) => res.json(savedSearches));

router.post("/searches", (req, res) => {
  const body = CreateSavedSearchBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Please name your saved search" });
  const saved = { id: `search-${Date.now()}`, ...body.data, matches: 0, updatedAt: "Just now" };
  savedSearches.unshift(saved);
  return res.status(201).json(saved);
});

router.get("/owner/leads", (_req, res) => res.json(leads));

router.post("/reports", (req, res) => {
  const body = ReportPropertyBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Please select a report reason" });
  return res.status(201).json({
    id: `report-${Date.now()}`,
    propertyId: body.data.propertyId,
    reason: body.data.reason,
    createdAt: new Date().toISOString(),
  });
});

router.post("/contact", (req, res) => {
  const body = SubmitContactMessageBody.safeParse(req.body);
  if (!body.success) return res.status(400).json({ error: "Please complete the contact form" });
  const message = {
    id: `contact-${Date.now()}`,
    ...body.data,
    createdAt: new Date().toISOString(),
  };
  contactMessages.unshift(message);
  return res.status(201).json(message);
});

export default router;
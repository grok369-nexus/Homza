export type HomzaProperty = {
  id: string;
  title: string;
  type: string;
  location: string;
  district: string;
  neighborhood: string;
  rent: number;
  advanceMonths: number;
  bedrooms: number;
  bathrooms: number;
  size?: number | null;
  image: string;
  images?: string[];
  description?: string;
  amenities: string[];
  status: "available" | "pending" | "rented" | "hidden";
  verified: boolean;
  owner: { name: string; phone: string; initials: string; verified: boolean };
  views: number;
  leads: number;
  createdAt: string;
  lastVerifiedAt?: string | null;
};

export type HomzaLead = {
  id: string;
  name: string;
  property: string;
  message: string;
  source: string;
  status: "new" | "contacted" | "viewing" | "closed";
  createdAt: string;
};

export type HomzaSavedSearch = {
  id: string;
  name: string;
  location: string;
  summary: string;
  matches: number;
  updatedAt: string;
};

const homes = [
  {
    id: "prop-kyanja-2bed",
    title: "Sunlit 2 Bedroom Apartment",
    type: "Apartment",
    location: "Kyanja, Kampala",
    district: "Kampala",
    neighborhood: "Kyanja",
    rent: 850000,
    advanceMonths: 3,
    bedrooms: 2,
    bathrooms: 2,
    size: 92,
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=75",
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=75",
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=75",
      "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=75",
    ],
    description:
      "A bright, well-kept apartment in a quiet part of Kyanja with generous living space, natural light, and easy access to shops and transport.",
    amenities: ["Yaka meter", "Water tank", "Parking", "Security", "Balcony"],
    status: "available" as const,
    verified: true,
    owner: { name: "Michael Okello", phone: "+256 772 451 903", initials: "MO", verified: true },
    views: 312,
    leads: 18,
    createdAt: "2026-08-26",
    lastVerifiedAt: "2026-09-02",
  },
  {
    id: "prop-ntinda-1bed",
    title: "Quiet 1 Bedroom Apartment",
    type: "Apartment",
    location: "Ntinda, Kampala",
    district: "Kampala",
    neighborhood: "Ntinda",
    rent: 650000,
    advanceMonths: 3,
    bedrooms: 1,
    bathrooms: 1,
    size: 58,
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=75",
    images: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=75",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=75",
    ],
    description:
      "A calm, recently refreshed one-bedroom home close to Ntinda shopping centre. Ideal for a professional or couple looking for convenience.",
    amenities: ["Yaka meter", "NWSC water", "Fenced", "Parking"],
    status: "available" as const,
    verified: true,
    owner: { name: "Sarah Nansubuga", phone: "+256 701 886 221", initials: "SN", verified: true },
    views: 245,
    leads: 8,
    createdAt: "2026-08-28",
    lastVerifiedAt: "2026-09-01",
  },
  {
    id: "prop-kira-house",
    title: "Family Home with Garden",
    type: "House",
    location: "Kira, Wakiso",
    district: "Wakiso",
    neighborhood: "Kira",
    rent: 900000,
    advanceMonths: 3,
    bedrooms: 2,
    bathrooms: 2,
    size: 118,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=75",
    images: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=75",
      "https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=75",
    ],
    description:
      "A comfortable standalone home with a private compound, secure perimeter, and room for a small family. Available immediately.",
    amenities: ["Water tank", "Parking", "Perimeter wall", "Security", "Furnished kitchen"],
    status: "available" as const,
    verified: true,
    owner: { name: "David Kato", phone: "+256 758 200 641", initials: "DK", verified: true },
    views: 198,
    leads: 6,
    createdAt: "2026-08-25",
    lastVerifiedAt: "2026-08-30",
  },
  {
    id: "prop-kawempe-room",
    title: "Clean Single Room",
    type: "Single room",
    location: "Kawempe, Kampala",
    district: "Kampala",
    neighborhood: "Kawempe",
    rent: 250000,
    advanceMonths: 1,
    bedrooms: 1,
    bathrooms: 1,
    size: 24,
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=75",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=75",
    ],
    description:
      "Affordable, clean single room in a secure compound with shared water facilities and a short walk to public transport.",
    amenities: ["NWSC water", "Fenced", "Security"],
    status: "available" as const,
    verified: false,
    owner: { name: "Grace Achieng", phone: "+256 779 314 880", initials: "GA", verified: false },
    views: 172,
    leads: 4,
    createdAt: "2026-08-30",
    lastVerifiedAt: null,
  },
  {
    id: "prop-buziga-3bed",
    title: "Spacious 3 Bedroom Home",
    type: "House",
    location: "Buziga, Kampala",
    district: "Kampala",
    neighborhood: "Buziga",
    rent: 1500000,
    advanceMonths: 6,
    bedrooms: 3,
    bathrooms: 3,
    size: 180,
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=75",
    images: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=75",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=75",
    ],
    description:
      "A spacious home with tasteful finishes, three bedrooms, and a secure compound in the Buziga hills.",
    amenities: ["Yaka meter", "Water tank", "Parking", "Perimeter wall", "Balcony"],
    status: "available" as const,
    verified: true,
    owner: { name: "Michael Okello", phone: "+256 772 451 903", initials: "MO", verified: true },
    views: 404,
    leads: 11,
    createdAt: "2026-08-19",
    lastVerifiedAt: "2026-09-03",
  },
  {
    id: "prop-entebbe-bungalow",
    title: "Garden Bungalow near Entebbe Road",
    type: "Bungalow",
    location: "Entebbe, Wakiso",
    district: "Wakiso",
    neighborhood: "Entebbe",
    rent: 1100000,
    advanceMonths: 3,
    bedrooms: 2,
    bathrooms: 2,
    size: 130,
    image:
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=75",
    images: [
      "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=75",
    ],
    description:
      "A peaceful bungalow with a leafy garden and reliable access to the airport corridor.",
    amenities: ["Water tank", "Parking", "Fenced", "Wi-Fi ready"],
    status: "pending" as const,
    verified: false,
    owner: { name: "Peter Mugisha", phone: "+256 783 419 027", initials: "PM", verified: true },
    views: 86,
    leads: 2,
    createdAt: "2026-09-01",
    lastVerifiedAt: null,
  },
] satisfies HomzaProperty[];

export const properties: HomzaProperty[] = homes;

export const favorites = new Set(["prop-kyanja-2bed", "prop-ntinda-1bed"]);

export const savedSearches: HomzaSavedSearch[] = [
  {
    id: "search-kira-2bed",
    name: "2 Bedroom in Kira",
    location: "Kira, Wakiso",
    summary: "UGX 600K - 1M • 1 - 3 months advance",
    matches: 8,
    updatedAt: "2 hours ago",
  },
  {
    id: "search-ntinda-1bed",
    name: "1 Bedroom in Ntinda",
    location: "Ntinda, Kampala",
    summary: "UGX 400K - 700K • Any advance",
    matches: 5,
    updatedAt: "Yesterday",
  },
  {
    id: "search-buziga-apartments",
    name: "Apartments in Buziga",
    location: "Buziga, Kampala",
    summary: "UGX 800K - 1.5M • 3 - 6 months advance",
    matches: 12,
    updatedAt: "3 days ago",
  },
];

export const leads: HomzaLead[] = [
  {
    id: "lead-1",
    name: "Sharon Namirembe",
    property: "2 Bedroom Apartment — Kyanja",
    message: "Is the apartment still available? I would like to view it this weekend.",
    source: "WhatsApp",
    status: "new",
    createdAt: "12 min ago",
  },
  {
    id: "lead-2",
    name: "Brian Ouma",
    property: "3 Bedroom Home — Buziga",
    message: "Can you share the exact location and parking details?",
    source: "In-app message",
    status: "contacted",
    createdAt: "Yesterday",
  },
  {
    id: "lead-3",
    name: "Amina Nakitto",
    property: "2 Bedroom Apartment — Kyanja",
    message: "I am interested in a viewing next week.",
    source: "Call",
    status: "viewing",
    createdAt: "2 days ago",
  },
];

export function getProperty(id: string) {
  return properties.find((property) => property.id === id);
}

export function visibleProperties() {
  return properties.filter((property) => property.status === "available");
}
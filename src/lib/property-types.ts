// Property/space types a host can pick when creating a listing. The `icon` is
// an mdi icon name (rendered offline via the bundled mdi-amenities collection —
// see scripts/gen-amenities-icons.mjs). Keep icons in mdi: so the generator can
// pick them up automatically.

export interface PropertyType {
  value: string;
  label: string;
  icon: string; // mdi:...
  group: string;
}

export const PROPERTY_TYPES: PropertyType[] = [
  // Homes
  { value: "apartment", label: "Apartment", icon: "mdi:office-building", group: "Homes" },
  { value: "house", label: "House", icon: "mdi:home", group: "Homes" },
  { value: "villa", label: "Villa", icon: "mdi:home-modern", group: "Homes" },
  { value: "bungalow", label: "Bungalow", icon: "mdi:home-city", group: "Homes" },
  { value: "maisonette", label: "Maisonette", icon: "mdi:home-group", group: "Homes" },
  { value: "townhouse", label: "Townhouse", icon: "mdi:home-group", group: "Homes" },
  { value: "mansion", label: "Mansion", icon: "mdi:castle", group: "Homes" },
  { value: "penthouse", label: "Penthouse", icon: "mdi:home-roof", group: "Homes" },
  { value: "studio", label: "Studio", icon: "mdi:home-floor-0", group: "Homes" },
  { value: "cottage", label: "Cottage", icon: "mdi:home-heart", group: "Homes" },
  { value: "container_home", label: "Container home", icon: "mdi:shipping-pallet", group: "Homes" },
  { value: "tiny_home", label: "Tiny home", icon: "mdi:home-variant", group: "Homes" },

  // Rooms
  { value: "private_room", label: "Private room", icon: "mdi:bed", group: "Rooms" },
  { value: "shared_room", label: "Shared room", icon: "mdi:bunk-bed", group: "Rooms" },
  { value: "hotel_room", label: "Hotel room", icon: "mdi:bed-king", group: "Rooms" },
  { value: "suite", label: "Suite", icon: "mdi:bed-king-outline", group: "Rooms" },
  { value: "serviced_apartment", label: "Serviced apartment", icon: "mdi:room-service", group: "Rooms" },

  // Stays
  { value: "guesthouse", label: "Guesthouse", icon: "mdi:home-account", group: "Stays" },
  { value: "bnb", label: "Bed & breakfast", icon: "mdi:coffee", group: "Stays" },
  { value: "hostel", label: "Hostel", icon: "mdi:bunk-bed-outline", group: "Stays" },
  { value: "lodge", label: "Lodge", icon: "mdi:pine-tree", group: "Stays" },
  { value: "resort", label: "Resort", icon: "mdi:palm-tree", group: "Stays" },
  { value: "hotel", label: "Hotel", icon: "mdi:office-building-marker", group: "Stays" },
  { value: "motel", label: "Motel", icon: "mdi:car-side", group: "Stays" },

  // Unique
  { value: "cabin", label: "Cabin", icon: "mdi:home-roof", group: "Unique" },
  { value: "farm_stay", label: "Farm stay", icon: "mdi:barn", group: "Unique" },
  { value: "treehouse", label: "Treehouse", icon: "mdi:tree", group: "Unique" },
  { value: "tent", label: "Tent / glamping", icon: "mdi:tent", group: "Unique" },
  { value: "boat", label: "Boat", icon: "mdi:sail-boat", group: "Unique" },
  { value: "houseboat", label: "Houseboat", icon: "mdi:ferry", group: "Unique" },
  { value: "camper", label: "Camper / RV", icon: "mdi:rv-truck", group: "Unique" },
  { value: "dome", label: "Dome", icon: "mdi:dome-light", group: "Unique" },

  // Spaces & experiences
  { value: "event_space", label: "Event space", icon: "mdi:party-popper", group: "Spaces" },
  { value: "workspace", label: "Workspace / office", icon: "mdi:briefcase", group: "Spaces" },
  { value: "studio_space", label: "Studio space", icon: "mdi:camera", group: "Spaces" },
  { value: "conference_room", label: "Conference room", icon: "mdi:presentation", group: "Spaces" },
  { value: "venue", label: "Venue", icon: "mdi:stadium", group: "Spaces" },
  { value: "other", label: "Other", icon: "mdi:dots-horizontal-circle", group: "Spaces" },
];

export const PROPERTY_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  PROPERTY_TYPES.map((p) => [p.value, p.label])
);

export const PROPERTY_TYPE_GROUPS: string[] = [
  ...new Set(PROPERTY_TYPES.map((p) => p.group)),
];

// The full amenity catalog. Stored on a listing as a string[] of `value`s, so
// existing listings keep working. Icons are mdi names, rendered offline via the
// bundled mdi-amenities collection (scripts/gen-amenities-icons.mjs scrapes the
// `mdi:` names below). Keep icon strings prefixed with `mdi:`.

export interface Amenity {
  value: string;
  label: string;
  icon: string; // mdi:...
}

export interface AmenityGroup {
  group: string;
  items: Amenity[];
}

export const AMENITY_GROUPS: AmenityGroup[] = [
  {
    group: "Essentials",
    items: [
      { value: "wifi", label: "WiFi", icon: "mdi:wifi" },
      { value: "free_wifi", label: "Free fast WiFi", icon: "mdi:wifi-star" },
      { value: "hot_water", label: "Hot water", icon: "mdi:water-boiler" },
      { value: "running_water", label: "Running water", icon: "mdi:water-pump" },
      { value: "towels", label: "Towels", icon: "mdi:hanger" },
      { value: "bed_linen", label: "Bed linen", icon: "mdi:bed" },
      { value: "toiletries", label: "Toiletries", icon: "mdi:bottle-tonic" },
      { value: "soap", label: "Soap", icon: "mdi:hand-wash" },
      { value: "hangers", label: "Hangers", icon: "mdi:hanger" },
      { value: "electricity", label: "Electricity", icon: "mdi:flash" },
      { value: "backup_generator", label: "Backup generator", icon: "mdi:engine" },
      { value: "solar_power", label: "Solar power", icon: "mdi:solar-power" },
      { value: "inverter", label: "Power inverter / UPS", icon: "mdi:battery-charging" },
    ],
  },
  {
    group: "Kitchen & dining",
    items: [
      { value: "kitchen", label: "Kitchen", icon: "mdi:silverware-fork-knife" },
      { value: "kitchenette", label: "Kitchenette", icon: "mdi:countertop" },
      { value: "refrigerator", label: "Refrigerator", icon: "mdi:fridge" },
      { value: "freezer", label: "Freezer", icon: "mdi:fridge-bottom" },
      { value: "microwave", label: "Microwave", icon: "mdi:microwave" },
      { value: "oven", label: "Oven", icon: "mdi:stove" },
      { value: "stove", label: "Cooker / stove", icon: "mdi:stove" },
      { value: "gas_cooker", label: "Gas cooker", icon: "mdi:gas-burner" },
      { value: "electric_kettle", label: "Electric kettle", icon: "mdi:kettle" },
      { value: "coffee_maker", label: "Coffee maker", icon: "mdi:coffee-maker" },
      { value: "toaster", label: "Toaster", icon: "mdi:toaster-oven" },
      { value: "blender", label: "Blender", icon: "mdi:blender" },
      { value: "dishwasher", label: "Dishwasher", icon: "mdi:dishwasher" },
      { value: "cookware", label: "Cookware & utensils", icon: "mdi:pot-steam" },
      { value: "dishes", label: "Dishes & cutlery", icon: "mdi:silverware-variant" },
      { value: "dining_table", label: "Dining table", icon: "mdi:table-furniture" },
      { value: "water_dispenser", label: "Water dispenser", icon: "mdi:water" },
      { value: "wine_glasses", label: "Wine glasses", icon: "mdi:glass-wine" },
    ],
  },
  {
    group: "Bathroom",
    items: [
      { value: "private_bathroom", label: "Private bathroom", icon: "mdi:shower" },
      { value: "shared_bathroom", label: "Shared bathroom", icon: "mdi:shower-head" },
      { value: "bathtub", label: "Bathtub", icon: "mdi:bathtub" },
      { value: "shower", label: "Shower", icon: "mdi:shower" },
      { value: "hairdryer", label: "Hair dryer", icon: "mdi:hair-dryer" },
      { value: "hot_shower", label: "Hot shower", icon: "mdi:shower-head" },
      { value: "bidet", label: "Bidet", icon: "mdi:toilet" },
      { value: "indoor_toilet", label: "Indoor toilet", icon: "mdi:toilet" },
    ],
  },
  {
    group: "Bedroom & laundry",
    items: [
      { value: "extra_pillows", label: "Extra pillows & blankets", icon: "mdi:bed-outline" },
      { value: "mosquito_net", label: "Mosquito net", icon: "mdi:spider-web" },
      { value: "wardrobe", label: "Wardrobe / closet", icon: "mdi:wardrobe" },
      { value: "iron", label: "Iron", icon: "mdi:iron" },
      { value: "washing_machine", label: "Washing machine", icon: "mdi:washing-machine" },
      { value: "dryer", label: "Dryer", icon: "mdi:tumble-dryer" },
      { value: "drying_rack", label: "Drying rack", icon: "mdi:hanger" },
      { value: "laundry_service", label: "Laundry service", icon: "mdi:washing-machine-alert" },
      { value: "blackout_curtains", label: "Blackout curtains", icon: "mdi:curtains-closed" },
      { value: "safe_box", label: "Safe / lockbox", icon: "mdi:safe-square" },
    ],
  },
  {
    group: "Heating & cooling",
    items: [
      { value: "air_conditioning", label: "Air conditioning", icon: "mdi:air-conditioner" },
      { value: "ceiling_fan", label: "Ceiling fan", icon: "mdi:ceiling-fan" },
      { value: "portable_fan", label: "Portable fan", icon: "mdi:fan" },
      { value: "heating", label: "Heating", icon: "mdi:radiator" },
      { value: "fireplace", label: "Fireplace", icon: "mdi:fireplace" },
    ],
  },
  {
    group: "Entertainment",
    items: [
      { value: "tv", label: "TV", icon: "mdi:television" },
      { value: "smart_tv", label: "Smart TV", icon: "mdi:television-classic" },
      { value: "netflix", label: "Netflix / streaming", icon: "mdi:netflix" },
      { value: "dstv", label: "DStv / cable", icon: "mdi:satellite-variant" },
      { value: "sound_system", label: "Sound system", icon: "mdi:speaker" },
      { value: "bluetooth_speaker", label: "Bluetooth speaker", icon: "mdi:speaker-wireless" },
      { value: "game_console", label: "Game console", icon: "mdi:gamepad-variant" },
      { value: "board_games", label: "Board games", icon: "mdi:chess-king" },
      { value: "books", label: "Books", icon: "mdi:bookshelf" },
      { value: "projector", label: "Projector", icon: "mdi:projector" },
      { value: "piano", label: "Piano", icon: "mdi:piano" },
    ],
  },
  {
    group: "Internet & office",
    items: [
      { value: "workspace", label: "Dedicated workspace", icon: "mdi:desk" },
      { value: "desk", label: "Desk", icon: "mdi:desk-lamp" },
      { value: "ethernet", label: "Wired internet", icon: "mdi:ethernet-cable" },
      { value: "printer", label: "Printer", icon: "mdi:printer" },
      { value: "monitor", label: "External monitor", icon: "mdi:monitor" },
      { value: "office_chair", label: "Ergonomic chair", icon: "mdi:seat-recline-extra" },
    ],
  },
  {
    group: "Outdoor",
    items: [
      { value: "balcony", label: "Balcony", icon: "mdi:balcony" },
      { value: "patio", label: "Patio", icon: "mdi:table-chair" },
      { value: "garden", label: "Garden", icon: "mdi:flower" },
      { value: "backyard", label: "Backyard", icon: "mdi:grass" },
      { value: "bbq", label: "BBQ / grill", icon: "mdi:grill" },
      { value: "outdoor_dining", label: "Outdoor dining", icon: "mdi:table-chair" },
      { value: "fire_pit", label: "Fire pit", icon: "mdi:campfire" },
      { value: "hammock", label: "Hammock", icon: "mdi:beach" },
      { value: "sea_view", label: "Sea view", icon: "mdi:beach" },
      { value: "mountain_view", label: "Mountain view", icon: "mdi:image-filter-hdr" },
      { value: "city_view", label: "City view", icon: "mdi:city" },
      { value: "lake_view", label: "Lake view", icon: "mdi:waves" },
      { value: "beach_access", label: "Beach access", icon: "mdi:umbrella-beach" },
    ],
  },
  {
    group: "Wellness & luxury",
    items: [
      { value: "pool", label: "Swimming pool", icon: "mdi:pool" },
      { value: "private_pool", label: "Private pool", icon: "mdi:pool" },
      { value: "hot_tub", label: "Hot tub / jacuzzi", icon: "mdi:hot-tub" },
      { value: "sauna", label: "Sauna", icon: "mdi:radiator" },
      { value: "steam_room", label: "Steam room", icon: "mdi:weather-fog" },
      { value: "gym", label: "Gym", icon: "mdi:dumbbell" },
      { value: "spa", label: "Spa", icon: "mdi:spa" },
      { value: "massage", label: "Massage", icon: "mdi:human-handsup" },
    ],
  },
  {
    group: "Parking & facilities",
    items: [
      { value: "free_parking", label: "Free parking", icon: "mdi:parking" },
      { value: "paid_parking", label: "Paid parking", icon: "mdi:credit-card-outline" },
      { value: "street_parking", label: "Street parking", icon: "mdi:road-variant" },
      { value: "garage", label: "Garage", icon: "mdi:garage" },
      { value: "ev_charger", label: "EV charger", icon: "mdi:ev-station" },
      { value: "elevator", label: "Elevator / lift", icon: "mdi:elevator" },
      { value: "gated_compound", label: "Gated compound", icon: "mdi:gate" },
      { value: "borehole", label: "Borehole water", icon: "mdi:water-well" },
      { value: "water_tank", label: "Water storage tank", icon: "mdi:storage-tank" },
    ],
  },
  {
    group: "Family",
    items: [
      { value: "crib", label: "Crib / cot", icon: "mdi:crib" },
      { value: "high_chair", label: "High chair", icon: "mdi:baby-face" },
      { value: "baby_bath", label: "Baby bath", icon: "mdi:baby-bottle" },
      { value: "kids_toys", label: "Kids' toys", icon: "mdi:teddy-bear" },
      { value: "baby_gate", label: "Baby safety gates", icon: "mdi:gate-alert" },
      { value: "family_friendly", label: "Family friendly", icon: "mdi:human-male-female-child" },
    ],
  },
  {
    group: "Safety",
    items: [
      { value: "security_guard", label: "Security guard", icon: "mdi:shield-account" },
      { value: "cctv", label: "CCTV / cameras", icon: "mdi:cctv" },
      { value: "smoke_alarm", label: "Smoke alarm", icon: "mdi:smoke-detector" },
      { value: "co_alarm", label: "Carbon monoxide alarm", icon: "mdi:smoke-detector-variant" },
      { value: "fire_extinguisher", label: "Fire extinguisher", icon: "mdi:fire-extinguisher" },
      { value: "first_aid", label: "First aid kit", icon: "mdi:medical-bag" },
      { value: "smart_lock", label: "Smart lock", icon: "mdi:lock-smart" },
      { value: "self_checkin", label: "Self check-in", icon: "mdi:key-chain" },
      { value: "alarm_system", label: "Alarm system", icon: "mdi:alarm-light" },
      { value: "electric_fence", label: "Electric fence", icon: "mdi:fence-electric" },
    ],
  },
  {
    group: "Accessibility",
    items: [
      { value: "step_free", label: "Step-free access", icon: "mdi:wheelchair-accessibility" },
      { value: "wide_doorways", label: "Wide doorways", icon: "mdi:door-open" },
      { value: "ground_floor", label: "Ground-floor access", icon: "mdi:home-floor-g" },
      { value: "grab_rails", label: "Bathroom grab rails", icon: "mdi:human-cane" },
      { value: "accessible_parking", label: "Accessible parking", icon: "mdi:wheelchair" },
    ],
  },
  {
    group: "Services & rules",
    items: [
      { value: "pets_allowed", label: "Pets allowed", icon: "mdi:paw" },
      { value: "smoking_allowed", label: "Smoking allowed", icon: "mdi:smoking" },
      { value: "events_allowed", label: "Events allowed", icon: "mdi:party-popper" },
      { value: "long_stays", label: "Long stays allowed", icon: "mdi:calendar-month" },
      { value: "breakfast", label: "Breakfast included", icon: "mdi:food-croissant" },
      { value: "cleaning_service", label: "Cleaning service", icon: "mdi:broom" },
      { value: "housekeeping", label: "Daily housekeeping", icon: "mdi:account-tie" },
      { value: "room_service", label: "Room service", icon: "mdi:room-service-outline" },
      { value: "airport_pickup", label: "Airport pickup", icon: "mdi:airplane" },
      { value: "concierge", label: "Concierge", icon: "mdi:bell-ring" },
      { value: "luggage_dropoff", label: "Luggage drop-off", icon: "mdi:bag-suitcase" },
    ],
  },
];

// Flat value -> icon lookup, so listing pages can render an icon for any stored
// amenity string.
export const AMENITY_ICON: Record<string, string> = Object.fromEntries(
  AMENITY_GROUPS.flatMap((g) => g.items.map((a) => [a.value, a.icon]))
);

// Flat value -> label lookup.
export const AMENITY_LABEL: Record<string, string> = Object.fromEntries(
  AMENITY_GROUPS.flatMap((g) => g.items.map((a) => [a.value, a.label]))
);

export const ALL_AMENITIES: Amenity[] = AMENITY_GROUPS.flatMap((g) => g.items);

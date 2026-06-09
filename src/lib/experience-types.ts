// Experience types a host can offer when the listing is bookable as an
// "experience". Large catalog so hosts can be specific. `icon` is an mdi name
// (scraped by scripts/gen-amenities-icons.mjs and bundled offline).

export interface ExperienceType {
  value: string;
  label: string;
  icon: string; // mdi:...
}

export interface ExperienceGroup {
  group: string;
  items: ExperienceType[];
}

export const EXPERIENCE_GROUPS: ExperienceGroup[] = [
  {
    group: "Outdoor & adventure",
    items: [
      { value: "hiking", label: "Hiking & trekking", icon: "mdi:hiking" },
      { value: "mountain_climbing", label: "Mountain climbing", icon: "mdi:image-filter-hdr" },
      { value: "safari", label: "Safari / game drive", icon: "mdi:elephant" },
      { value: "camping", label: "Camping", icon: "mdi:tent" },
      { value: "cycling", label: "Cycling / mountain biking", icon: "mdi:bike" },
      { value: "quad_biking", label: "Quad biking", icon: "mdi:atv" },
      { value: "zip_lining", label: "Zip-lining", icon: "mdi:slope-downhill" },
      { value: "rock_climbing", label: "Rock climbing", icon: "mdi:carabiner" },
      { value: "bird_watching", label: "Bird watching", icon: "mdi:bird" },
      { value: "nature_walk", label: "Nature walk", icon: "mdi:forest" },
      { value: "horse_riding", label: "Horse riding", icon: "mdi:horse" },
      { value: "camel_riding", label: "Camel riding", icon: "mdi:paw" },
    ],
  },
  {
    group: "Water & beach",
    items: [
      { value: "snorkeling", label: "Snorkeling", icon: "mdi:diving-snorkel" },
      { value: "scuba_diving", label: "Scuba diving", icon: "mdi:diving-scuba" },
      { value: "boat_cruise", label: "Boat cruise", icon: "mdi:sail-boat" },
      { value: "dhow_trip", label: "Dhow trip", icon: "mdi:ferry" },
      { value: "fishing", label: "Fishing trip", icon: "mdi:fish" },
      { value: "kayaking", label: "Kayaking / canoeing", icon: "mdi:kayaking" },
      { value: "jet_ski", label: "Jet ski", icon: "mdi:ferry" },
      { value: "surfing", label: "Surfing / kitesurfing", icon: "mdi:surfing" },
      { value: "swimming", label: "Swimming", icon: "mdi:swim" },
      { value: "white_water", label: "White-water rafting", icon: "mdi:waves" },
      { value: "beach_day", label: "Beach day", icon: "mdi:umbrella-beach" },
      { value: "sunset_cruise", label: "Sunset cruise", icon: "mdi:weather-sunset" },
    ],
  },
  {
    group: "Food & drink",
    items: [
      { value: "food_tour", label: "Food tour", icon: "mdi:food" },
      { value: "cooking_class", label: "Cooking class", icon: "mdi:chef-hat" },
      { value: "wine_tasting", label: "Wine tasting", icon: "mdi:glass-wine" },
      { value: "coffee_tour", label: "Coffee farm tour", icon: "mdi:coffee" },
      { value: "tea_tour", label: "Tea farm tour", icon: "mdi:tea" },
      { value: "street_food", label: "Street food crawl", icon: "mdi:food-takeout-box" },
      { value: "brewery", label: "Brewery / distillery", icon: "mdi:beer" },
      { value: "private_chef", label: "Private chef dinner", icon: "mdi:silverware-fork-knife" },
      { value: "bbq_nyama", label: "BBQ / nyama choma", icon: "mdi:grill" },
      { value: "baking", label: "Baking class", icon: "mdi:cupcake" },
    ],
  },
  {
    group: "Arts & culture",
    items: [
      { value: "city_tour", label: "City / walking tour", icon: "mdi:walk" },
      { value: "historical_tour", label: "Historical tour", icon: "mdi:bank" },
      { value: "museum_tour", label: "Museum / gallery tour", icon: "mdi:bank-outline" },
      { value: "village_visit", label: "Village / community visit", icon: "mdi:home-group" },
      { value: "craft_workshop", label: "Craft workshop", icon: "mdi:palette" },
      { value: "pottery", label: "Pottery class", icon: "mdi:pot" },
      { value: "painting", label: "Painting / art class", icon: "mdi:brush" },
      { value: "music_class", label: "Music / drumming class", icon: "mdi:music" },
      { value: "dance_class", label: "Dance class", icon: "mdi:dance-ballroom" },
      { value: "photography", label: "Photography walk", icon: "mdi:camera" },
      { value: "language", label: "Language lesson", icon: "mdi:translate" },
      { value: "storytelling", label: "Storytelling / poetry", icon: "mdi:book-open-page-variant" },
    ],
  },
  {
    group: "Wellness",
    items: [
      { value: "yoga", label: "Yoga session", icon: "mdi:yoga" },
      { value: "meditation", label: "Meditation", icon: "mdi:meditation" },
      { value: "spa_day", label: "Spa day", icon: "mdi:spa" },
      { value: "massage_exp", label: "Massage", icon: "mdi:hand-heart" },
      { value: "fitness", label: "Fitness / bootcamp", icon: "mdi:dumbbell" },
      { value: "retreat", label: "Wellness retreat", icon: "mdi:flower-tulip" },
      { value: "nature_therapy", label: "Nature therapy", icon: "mdi:leaf" },
    ],
  },
  {
    group: "Nightlife & social",
    items: [
      { value: "nightlife_tour", label: "Nightlife tour", icon: "mdi:glass-cocktail" },
      { value: "live_music", label: "Live music night", icon: "mdi:music" },
      { value: "comedy", label: "Comedy night", icon: "mdi:emoticon-happy" },
      { value: "game_night", label: "Game night", icon: "mdi:cards-playing" },
      { value: "rooftop", label: "Rooftop hangout", icon: "mdi:glass-wine" },
      { value: "party", label: "Party / event", icon: "mdi:party-popper" },
    ],
  },
  {
    group: "Tours & sightseeing",
    items: [
      { value: "day_trip", label: "Day trip / road trip", icon: "mdi:car-convertible" },
      { value: "guided_tour", label: "Guided tour", icon: "mdi:account-tie-voice" },
      { value: "scenic_drive", label: "Scenic drive", icon: "mdi:road-variant" },
      { value: "hot_air_balloon", label: "Hot air balloon", icon: "mdi:airballoon" },
      { value: "helicopter", label: "Helicopter tour", icon: "mdi:helicopter" },
      { value: "waterfall", label: "Waterfall visit", icon: "mdi:waterfall" },
      { value: "national_park", label: "National park", icon: "mdi:tree" },
      { value: "wildlife", label: "Wildlife sanctuary", icon: "mdi:paw" },
    ],
  },
  {
    group: "Sports & activities",
    items: [
      { value: "golf", label: "Golf", icon: "mdi:golf" },
      { value: "tennis", label: "Tennis", icon: "mdi:tennis" },
      { value: "football", label: "Football", icon: "mdi:soccer" },
      { value: "go_karting", label: "Go-karting", icon: "mdi:go-kart" },
      { value: "paintball", label: "Paintball", icon: "mdi:bullseye" },
      { value: "bowling", label: "Bowling", icon: "mdi:bowling" },
      { value: "skating", label: "Skating", icon: "mdi:roller-skate" },
      { value: "skydiving", label: "Skydiving", icon: "mdi:parachute" },
    ],
  },
];

export const ALL_EXPERIENCES: ExperienceType[] = EXPERIENCE_GROUPS.flatMap((g) => g.items);

export const EXPERIENCE_LABEL: Record<string, string> = Object.fromEntries(
  ALL_EXPERIENCES.map((e) => [e.value, e.label])
);

export const EXPERIENCE_ICON: Record<string, string> = Object.fromEntries(
  ALL_EXPERIENCES.map((e) => [e.value, e.icon])
);

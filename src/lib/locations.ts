// Strictly nested location dataset for the cascading location picker:
//   Country -> Region -> District -> Village
// Each village carries explicit latitude, longitude and a default map zoom so
// the map can flyTo() it. Curated for Beddn's active markets (KE, TZ, RW, UG).
// Places outside this tree fall back to the OpenStreetMap geocode search.

export interface Village {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
}

export interface District {
  name: string;
  villages: Village[];
}

export interface Region {
  name: string;
  districts: District[];
}

export interface Country {
  code: string;
  name: string;
  regions: Region[];
}

export const COUNTRIES: Country[] = [
  {
    code: "KE",
    name: "Kenya",
    regions: [
      {
        name: "Nairobi",
        districts: [
          {
            name: "Westlands",
            villages: [
              { name: "Westlands", lat: -1.2649, lng: 36.8059, zoom: 15 },
              { name: "Parklands", lat: -1.2606, lng: 36.8226, zoom: 15 },
              { name: "Kileleshwa", lat: -1.2845, lng: 36.7836, zoom: 15 },
              { name: "Lavington", lat: -1.2792, lng: 36.7669, zoom: 15 },
              { name: "Spring Valley", lat: -1.2456, lng: 36.7905, zoom: 15 },
            ],
          },
          {
            name: "Dagoretti",
            villages: [
              { name: "Kilimani", lat: -1.2906, lng: 36.7869, zoom: 15 },
              { name: "Kawangware", lat: -1.2864, lng: 36.7472, zoom: 15 },
              { name: "Ngong Road", lat: -1.3, lng: 36.7667, zoom: 15 },
            ],
          },
          {
            name: "Langata",
            villages: [
              { name: "Karen", lat: -1.3197, lng: 36.7085, zoom: 14 },
              { name: "Langata", lat: -1.3667, lng: 36.7333, zoom: 14 },
              { name: "South C", lat: -1.3186, lng: 36.8294, zoom: 15 },
              { name: "Nairobi West", lat: -1.3145, lng: 36.8167, zoom: 15 },
            ],
          },
          {
            name: "Embakasi",
            villages: [
              { name: "Donholm", lat: -1.2917, lng: 36.8917, zoom: 15 },
              { name: "Pipeline", lat: -1.3203, lng: 36.9028, zoom: 15 },
              { name: "Utawala", lat: -1.2842, lng: 36.9594, zoom: 14 },
              { name: "Syokimau", lat: -1.3667, lng: 36.9333, zoom: 14 },
            ],
          },
          {
            name: "Central Nairobi",
            villages: [
              { name: "CBD", lat: -1.2864, lng: 36.8172, zoom: 15 },
              { name: "Upper Hill", lat: -1.2986, lng: 36.8147, zoom: 15 },
              { name: "Ngara", lat: -1.2728, lng: 36.8306, zoom: 15 },
            ],
          },
        ],
      },
      {
        name: "Mombasa",
        districts: [
          {
            name: "Mvita",
            villages: [
              { name: "Old Town", lat: -4.0619, lng: 39.6764, zoom: 15 },
              { name: "Mombasa CBD", lat: -4.0435, lng: 39.6682, zoom: 14 },
            ],
          },
          {
            name: "Nyali",
            villages: [
              { name: "Nyali", lat: -4.0231, lng: 39.7036, zoom: 14 },
              { name: "Bamburi", lat: -3.9847, lng: 39.7222, zoom: 14 },
              { name: "Shanzu", lat: -3.9667, lng: 39.7333, zoom: 14 },
            ],
          },
          {
            name: "Kisauni",
            villages: [
              { name: "Mtwapa", lat: -3.9419, lng: 39.7447, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Kiambu",
        districts: [
          {
            name: "Kiambaa",
            villages: [
              { name: "Ruaka", lat: -1.2056, lng: 36.7889, zoom: 14 },
              { name: "Banana Hill", lat: -1.1833, lng: 36.7667, zoom: 14 },
            ],
          },
          {
            name: "Thika Town",
            villages: [
              { name: "Thika", lat: -1.0333, lng: 37.0693, zoom: 13 },
              { name: "Juja", lat: -1.1036, lng: 37.0144, zoom: 14 },
            ],
          },
          {
            name: "Ruiru",
            villages: [
              { name: "Ruiru", lat: -1.1456, lng: 36.9586, zoom: 14 },
              { name: "Kahawa Wendani", lat: -1.18, lng: 36.93, zoom: 15 },
            ],
          },
        ],
      },
      {
        name: "Nakuru",
        districts: [
          {
            name: "Nakuru Town",
            villages: [
              { name: "Nakuru CBD", lat: -0.3031, lng: 36.08, zoom: 14 },
              { name: "Milimani", lat: -0.2989, lng: 36.0719, zoom: 15 },
            ],
          },
          {
            name: "Naivasha",
            villages: [
              { name: "Naivasha", lat: -0.7167, lng: 36.4356, zoom: 13 },
              { name: "Karagita", lat: -0.7667, lng: 36.35, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Kisumu",
        districts: [
          {
            name: "Kisumu Central",
            villages: [
              { name: "Kisumu CBD", lat: -0.0917, lng: 34.7681, zoom: 14 },
              { name: "Milimani (Kisumu)", lat: -0.1, lng: 34.75, zoom: 15 },
              { name: "Dunga Beach", lat: -0.1281, lng: 34.7361, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Kilifi",
        districts: [
          {
            name: "Kilifi Town",
            villages: [
              { name: "Kilifi", lat: -3.6305, lng: 39.8499, zoom: 13 },
              { name: "Bofa", lat: -3.6, lng: 39.85, zoom: 14 },
            ],
          },
          {
            name: "Malindi",
            villages: [
              { name: "Malindi", lat: -3.2175, lng: 40.1191, zoom: 13 },
              { name: "Watamu", lat: -3.3567, lng: 40.0269, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Kajiado",
        districts: [
          {
            name: "Kajiado North",
            villages: [
              { name: "Ngong", lat: -1.3528, lng: 36.6586, zoom: 14 },
              { name: "Rongai", lat: -1.3964, lng: 36.7544, zoom: 14 },
              { name: "Kitengela", lat: -1.475, lng: 36.9594, zoom: 13 },
            ],
          },
          {
            name: "Kajiado South",
            villages: [
              { name: "Amboseli", lat: -2.6527, lng: 37.2606, zoom: 12 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "TZ",
    name: "Tanzania",
    regions: [
      {
        name: "Dar es Salaam",
        districts: [
          {
            name: "Kinondoni",
            villages: [
              { name: "Masaki", lat: -6.7424, lng: 39.2787, zoom: 15 },
              { name: "Oyster Bay", lat: -6.7667, lng: 39.2833, zoom: 15 },
              { name: "Mikocheni", lat: -6.7667, lng: 39.25, zoom: 14 },
              { name: "Mbezi Beach", lat: -6.7, lng: 39.22, zoom: 14 },
            ],
          },
          {
            name: "Ilala",
            villages: [
              { name: "Dar CBD", lat: -6.8161, lng: 39.2803, zoom: 14 },
              { name: "Upanga", lat: -6.8083, lng: 39.2861, zoom: 15 },
              { name: "Kariakoo", lat: -6.8194, lng: 39.2722, zoom: 15 },
            ],
          },
          {
            name: "Temeke",
            villages: [
              { name: "Kigamboni", lat: -6.8389, lng: 39.3167, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Zanzibar Urban/West",
        districts: [
          {
            name: "Stone Town",
            villages: [
              { name: "Stone Town", lat: -6.1659, lng: 39.1979, zoom: 15 },
              { name: "Shangani", lat: -6.1622, lng: 39.1864, zoom: 15 },
            ],
          },
          {
            name: "North Zanzibar",
            villages: [
              { name: "Nungwi", lat: -5.7264, lng: 39.2967, zoom: 14 },
              { name: "Kendwa", lat: -5.7383, lng: 39.295, zoom: 14 },
              { name: "Matemwe", lat: -5.865, lng: 39.355, zoom: 14 },
            ],
          },
          {
            name: "East Zanzibar",
            villages: [
              { name: "Paje", lat: -6.2667, lng: 39.5333, zoom: 14 },
              { name: "Jambiani", lat: -6.3, lng: 39.5333, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Arusha",
        districts: [
          {
            name: "Arusha City",
            villages: [
              { name: "Arusha CBD", lat: -3.3869, lng: 36.683, zoom: 14 },
              { name: "Njiro", lat: -3.4, lng: 36.7, zoom: 14 },
              { name: "Usa River", lat: -3.3667, lng: 36.85, zoom: 13 },
            ],
          },
        ],
      },
      {
        name: "Kilimanjaro",
        districts: [
          {
            name: "Moshi",
            villages: [
              { name: "Moshi Town", lat: -3.3349, lng: 37.3404, zoom: 14 },
              { name: "Marangu", lat: -3.2667, lng: 37.5167, zoom: 13 },
            ],
          },
        ],
      },
      {
        name: "Mwanza",
        districts: [
          {
            name: "Nyamagana",
            villages: [
              { name: "Mwanza CBD", lat: -2.5164, lng: 32.9175, zoom: 14 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "RW",
    name: "Rwanda",
    regions: [
      {
        name: "Kigali",
        districts: [
          {
            name: "Nyarugenge",
            villages: [
              { name: "Kigali CBD", lat: -1.9441, lng: 30.0619, zoom: 15 },
              { name: "Nyamirambo", lat: -1.9783, lng: 30.0461, zoom: 15 },
            ],
          },
          {
            name: "Gasabo",
            villages: [
              { name: "Kimironko", lat: -1.9333, lng: 30.1167, zoom: 15 },
              { name: "Kacyiru", lat: -1.9436, lng: 30.0894, zoom: 15 },
              { name: "Gisozi", lat: -1.9211, lng: 30.0814, zoom: 15 },
              { name: "Remera", lat: -1.9578, lng: 30.1108, zoom: 15 },
            ],
          },
          {
            name: "Kicukiro",
            villages: [
              { name: "Kicukiro", lat: -1.9883, lng: 30.0972, zoom: 15 },
              { name: "Kanombe", lat: -1.9686, lng: 30.1394, zoom: 14 },
              { name: "Nyarutarama", lat: -1.9447, lng: 30.1086, zoom: 15 },
            ],
          },
        ],
      },
      {
        name: "Western Province",
        districts: [
          {
            name: "Rubavu",
            villages: [
              { name: "Gisenyi", lat: -1.7028, lng: 29.2564, zoom: 14 },
            ],
          },
          {
            name: "Karongi",
            villages: [
              { name: "Kibuye", lat: -2.06, lng: 29.3486, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Northern Province",
        districts: [
          {
            name: "Musanze",
            villages: [
              { name: "Musanze (Ruhengeri)", lat: -1.4997, lng: 29.6347, zoom: 14 },
              { name: "Kinigi", lat: -1.4333, lng: 29.6, zoom: 13 },
            ],
          },
        ],
      },
      {
        name: "Southern Province",
        districts: [
          {
            name: "Huye",
            villages: [
              { name: "Butare (Huye)", lat: -2.5967, lng: 29.7394, zoom: 14 },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "UG",
    name: "Uganda",
    regions: [
      {
        name: "Central (Kampala)",
        districts: [
          {
            name: "Kampala Central",
            villages: [
              { name: "Kampala CBD", lat: 0.3136, lng: 32.5811, zoom: 15 },
              { name: "Nakasero", lat: 0.3267, lng: 32.5783, zoom: 15 },
              { name: "Kololo", lat: 0.3333, lng: 32.5933, zoom: 15 },
            ],
          },
          {
            name: "Nakawa",
            villages: [
              { name: "Bugolobi", lat: 0.3186, lng: 32.6172, zoom: 15 },
              { name: "Ntinda", lat: 0.3536, lng: 32.6125, zoom: 15 },
              { name: "Naguru", lat: 0.3361, lng: 32.6053, zoom: 15 },
            ],
          },
          {
            name: "Makindye",
            villages: [
              { name: "Muyenga", lat: 0.2858, lng: 32.6058, zoom: 15 },
              { name: "Kabalagala", lat: 0.2972, lng: 32.5961, zoom: 15 },
            ],
          },
        ],
      },
      {
        name: "Wakiso",
        districts: [
          {
            name: "Entebbe",
            villages: [
              { name: "Entebbe", lat: 0.0512, lng: 32.4637, zoom: 14 },
            ],
          },
          {
            name: "Kira",
            villages: [
              { name: "Najjera", lat: 0.3833, lng: 32.6333, zoom: 14 },
              { name: "Kira Town", lat: 0.4, lng: 32.6444, zoom: 14 },
            ],
          },
        ],
      },
      {
        name: "Western Uganda",
        districts: [
          {
            name: "Mbarara",
            villages: [
              { name: "Mbarara", lat: -0.6072, lng: 30.6545, zoom: 14 },
            ],
          },
          {
            name: "Kasese",
            villages: [
              { name: "Kasese", lat: 0.1833, lng: 30.0833, zoom: 13 },
            ],
          },
        ],
      },
      {
        name: "Eastern Uganda",
        districts: [
          {
            name: "Jinja",
            villages: [
              { name: "Jinja", lat: 0.4244, lng: 33.2042, zoom: 14 },
              { name: "Bujagali", lat: 0.4889, lng: 33.1361, zoom: 13 },
            ],
          },
        ],
      },
    ],
  },
];

// --- Reactive cascade selectors -------------------------------------------

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function getRegions(countryCode: string): Region[] {
  return getCountry(countryCode)?.regions ?? [];
}

export function getDistricts(countryCode: string, regionName: string): District[] {
  return getRegions(countryCode).find((r) => r.name === regionName)?.districts ?? [];
}

export function getVillages(
  countryCode: string,
  regionName: string,
  districtName: string
): Village[] {
  return (
    getDistricts(countryCode, regionName).find((d) => d.name === districtName)
      ?.villages ?? []
  );
}

export function findVillage(
  countryCode: string,
  regionName: string,
  districtName: string,
  villageName: string
): Village | undefined {
  return getVillages(countryCode, regionName, districtName).find(
    (v) => v.name === villageName
  );
}

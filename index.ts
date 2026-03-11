import csvParser from "csv-parser";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const API_KEY: string | undefined = process.env.API_KEY;
const endpoint: string = "https://places.googleapis.com/v1/places:searchText";

const fp: string = "queries.csv";
const queries = {} as Record<number, { category: string; textQuery: string }>;
const loc_rest: {
  rectangle: {
    low: { latitude: number; longitude: number };
    high: { latitude: number; longitude: number };
  };
} = {
  rectangle: {
    low: {
      latitude: 45.523888,
      longitude: -122.791388,
    },
    high: {
      latitude: 45.653333,
      longitude: -122.578333,
    },
  },
};

type rowData = {
  Category: string;
  Query: string;
};

async function fetchPlaces() {
  const allFeatures = new Map<string, any>();

  for (const index in queries) {
    const queryData: any = queries[index];

    console.log(`Fetching ${queryData?.textQuery}...`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.websiteUri,places.nationalPhoneNumber,places.businessStatus,places.accessibilityOptions,places.types",
      },
      body: JSON.stringify({
        textQuery: queryData?.textQuery,
        locationRestriction: loc_rest,
      }),
    });

    const data = (await response.json()) as any;

    if (data.places) {
      for (const place of data.places) {
        if (!place.location || !place.id) continue;

        if (allFeatures.has(place.id)) {
          const exFeat = allFeatures.get(place.id);

          if (!exFeat.properties.categories.includes(queryData.category)) {
            exFeat.properties.categories.push(queryData.category);
          }
          if (!exFeat.properties.search_queries.includes(queryData.textQuery)) {
            exFeat.properties.search_queries.push(queryData.textQuery);
          }
        } else {
          const newFeature: any = {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [
                place.location?.longitude || 0,
                place.location?.latitude || 0,
              ],
            },
            properties: {
              name: place.displayName?.text || "Unknown",
              address: place.formattedAddress || "No address",
              categories: [queryData.category],
              search_queries: [queryData.textQuery],
              // rich data
              primary_type: place.primaryType || "Unknown",
              all_types: place.types || [],
              status: place.businessStatus || "Unknown",
              website: place.websiteUri || "None",
              phone: place.nationalPhoneNumber || "None",

              wheelchair_accessible_entrance:
                place.accessibilityOptions?.wheelchairAccessibleEntrance ||
                false,
            },
          };

          allFeatures.set(place.id, newFeature);
        }
      }
    }
  }

  const masterGeoJson = {
    type: "FeatureCollection",
    features: Array.from(allFeatures.values()),
  };

  await Bun.write(
    "places_api-district2_all_assets.geojson",
    JSON.stringify(masterGeoJson, null, 2),
  );
  console.log(`Success! Saved ${allFeatures.size} total assets.`);
}

let index = 0;

const csv_parse = fs
  .createReadStream(fp)
  .pipe(csvParser())
  .on("data", (row: rowData) => {
    queries[index] = { category: row.Category, textQuery: row.Query };
    index++;
  })
  .on("end", () => {
    console.log(queries);
    fetchPlaces();
  });

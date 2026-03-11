import * as dotenv from "dotenv";

dotenv.config();

const API_KEY: string | undefined = process.env.API_KEY;
const endpoint: string = "https://places.googleapis.com/v1/places:searchText";

const query: { textQuery: string } = {
  textQuery: "community centers in North Portland, OR",
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": API_KEY,
    "X-Goog-FieldMask":
      "places.displayName,places.formattedAddress,places.location,places.primaryType,places.addressDescriptor",
  },
  body: JSON.stringify(query),
});

const data = (await response.json()) as any;
console.log(data);

if (data.places) {
  // console.log(data);
  for (const place of data.places) {
    if (place.addressDescriptor && place.addressDescriptor.areas) {
      for (const area of place.addressDescriptor.areas) {
        console.log(
          JSON.stringify(
            {
              place: place.displayName?.text,
              areaName: area?.name,
              areaPlaceId: area?.placeId,
              areaDisplayName: area.displayName?.text,
            },
            null,
            2,
          ),
        );
      }
    } else {
      console.log(`Not found for ${place}.`);
    }
  }
}

export {};

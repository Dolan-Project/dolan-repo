"use strict";

/**
 * Upsert demo places with permanent photo cache.
 * With GOOGLE_MAPS_SERVER_KEY: Text Search + Photo Media → download to dolan/public/seed-places.
 * Without key: use Unsplash fallback URLs (no Places quota at runtime).
 */

const fs = require("node:fs");
const path = require("node:path");
const {
  destinations,
  deterministicUuid,
  seedPhotoName,
  localPhotoPath,
} = require("../data/demo-destinations.cjs");

const PLACES_BASE = "https://places.googleapis.com/v1";
const SEARCH_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.photos",
  "places.formattedAddress",
].join(",");

function repoRoot() {
  return path.resolve(__dirname, "../..");
}

function seedPlacesDir() {
  return path.join(repoRoot(), "dolan", "public", "seed-places");
}

async function searchPlace(apiKey, query) {
  const response = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": SEARCH_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: `${query}, Indonesia`,
      languageCode: "id",
      regionCode: "ID",
      pageSize: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`Places search failed (${response.status}) for ${query}`);
  }
  const payload = await response.json();
  return payload.places?.[0] ?? null;
}

async function downloadPhoto(apiKey, photoName, destFile) {
  const encoded = photoName.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  const mediaUrl = `${PLACES_BASE}/${encoded}/media?maxHeightPx=800&skipHttpRedirect=true`;
  const mediaRes = await fetch(mediaUrl, {
    headers: { "X-Goog-Api-Key": apiKey, Accept: "application/json" },
  });
  if (!mediaRes.ok) {
    throw new Error(`Photo media failed (${mediaRes.status}) for ${photoName}`);
  }
  const media = await mediaRes.json();
  if (!media.photoUri) {
    throw new Error(`No photoUri for ${photoName}`);
  }
  const imageRes = await fetch(media.photoUri);
  if (!imageRes.ok) {
    throw new Error(`Photo download failed (${imageRes.status})`);
  }
  const buffer = Buffer.from(await imageRes.arrayBuffer());
  fs.mkdirSync(path.dirname(destFile), { recursive: true });
  fs.writeFileSync(destFile, buffer);
  return media.photoUri;
}

/** @type {import('sequelize-cli').Seeder} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY?.trim() || "";
    const outDir = seedPlacesDir();
    fs.mkdirSync(outDir, { recursive: true });

    let fetched = 0;
    let fallback = 0;

    for (const dest of destinations) {
      let googlePlaceId = dest.googlePlaceId;
      let latitude = dest.latitude;
      let longitude = dest.longitude;
      let photoName = null;
      let photoUrl = dest.fallbackPhotoUrl;
      let attribution = "Demo fallback image";

      const localFile = path.join(outDir, `${dest.slug}.jpg`);
      const localExists = fs.existsSync(localFile);

      if (apiKey) {
        try {
          const place = await searchPlace(apiKey, dest.query);
          if (place?.id) {
            googlePlaceId = place.id.startsWith("places/") ? place.id.slice("places/".length) : place.id;
            if (place.location?.latitude != null) latitude = place.location.latitude;
            if (place.location?.longitude != null) longitude = place.location.longitude;
            const firstPhoto = place.photos?.[0]?.name;
            if (firstPhoto) {
              await downloadPhoto(apiKey, firstPhoto, localFile);
              photoName = firstPhoto;
              photoUrl = localPhotoPath(dest.slug);
              attribution = "Google Places (seeded)";
              fetched += 1;
            }
          }
        } catch (error) {
          console.warn(`[seed-places-photos] skip Google for ${dest.slug}:`, error.message || error);
        }
      }

      if (!googlePlaceId) {
        googlePlaceId = `seed_${dest.slug}`;
      }

      if (!photoName) {
        photoName = seedPhotoName(googlePlaceId);
        if (localExists) {
          photoUrl = localPhotoPath(dest.slug);
          attribution = "Local seed photo";
        } else {
          fallback += 1;
        }
      }

      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM places WHERE google_place_id = :gid LIMIT 1`,
        { replacements: { gid: googlePlaceId } },
      );
      const existingId = existing?.[0]?.id;
      const placeId = existingId || deterministicUuid(dest.slug);

      if (existingId) {
        await queryInterface.sequelize.query(
          `UPDATE places SET
            cached_name = :name,
            cached_city = :city,
            cached_latitude = :lat,
            cached_longitude = :lng,
            cached_photo_name = :photoName,
            cached_photo_url = :photoUrl,
            cached_photo_attribution = :attribution,
            cache_checked_at = :now,
            status = 'ACTIVE',
            updated_at = :now
          WHERE id = :id`,
          {
            replacements: {
              id: existingId,
              name: dest.name,
              city: dest.city,
              lat: latitude,
              lng: longitude,
              photoName,
              photoUrl,
              attribution,
              now,
            },
          },
        );
      } else {
        await queryInterface.bulkInsert("places", [
          {
            id: placeId,
            google_place_id: googlePlaceId,
            cached_name: dest.name,
            cached_city: dest.city,
            cached_latitude: latitude,
            cached_longitude: longitude,
            cached_photo_name: photoName,
            cached_photo_url: photoUrl,
            cached_photo_attribution: attribution,
            cache_checked_at: now,
            status: "ACTIVE",
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }

    console.log(
      `[seed-places-photos] done: Google downloads=${fetched}, fallback URLs=${fallback}, total=${destinations.length}`,
    );
  },

  async down(queryInterface) {
    const ids = destinations.map((dest) => deterministicUuid(dest.slug));
    await queryInterface.bulkDelete("places", { id: ids });
    // Leave Yogya demo places; only clear photo cache columns on known seed google ids where possible.
    await queryInterface.sequelize.query(
      `UPDATE places SET
        cached_photo_name = NULL,
        cached_photo_url = NULL,
        cached_photo_attribution = NULL,
        updated_at = NOW()
      WHERE google_place_id LIKE 'seed_%'
         OR cached_photo_attribution IN ('Google Places (seeded)', 'Demo fallback image', 'Local seed photo')`,
    );
  },
};

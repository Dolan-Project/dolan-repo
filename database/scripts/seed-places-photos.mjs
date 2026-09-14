/**
 * Optional one-shot Places photo download (same logic as the places-photos seeder).
 * Usage: GOOGLE_MAPS_SERVER_KEY=... node database/scripts/seed-places-photos.mjs
 *
 * Prefer `npm run db:seed` which runs the seeder after migrate.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["sequelize-cli", "db:seed", "--seed", "20260914000200-demo-places-photos.js"],
  { cwd: path.join(root, "database"), stdio: "inherit", env: process.env, shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);

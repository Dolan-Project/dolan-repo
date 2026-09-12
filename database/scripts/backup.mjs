import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(root, ".env") });

const databaseUrl = process.env.DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL ?? "";
if (!databaseUrl) {
  console.error("Set DATABASE_URL or MIGRATION_DATABASE_URL before backup.");
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
const outDir = path.join(root, "backups");
const file = path.join(outDir, `dolan-${stamp}.dump`);
await mkdir(outDir, { recursive: true });

const child = spawn("pg_dump", [databaseUrl, "--format=custom", `--file=${file}`], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  if (code === 0) {
    console.log(`Backup written to ${file}`);
    console.log("Skip restoring location_latest as a long-term archive.");
  }
  process.exit(code ?? 1);
});

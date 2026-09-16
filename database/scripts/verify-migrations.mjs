import EmbeddedPostgres from "embedded-postgres";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const databaseDir = path.join(root, "database", ".tmp-pg");
const port = 55432;
const sequelizeCli = path.join(
  root,
  "node_modules",
  "sequelize-cli",
  "lib",
  "sequelize",
);

// macOS does not provide the Linux-specific C.UTF-8 locale. The embedded
// Postgres package inherits LC_ALL, which overrides its own LC_MESSAGES
// fallback and makes initdb fail before migrations can run.
if (process.platform === "darwin") {
  for (const name of ["LANG", "LC_ALL", "LC_CTYPE"]) {
    if (process.env[name]?.toUpperCase() === "C.UTF-8") {
      process.env[name] = "C";
    }
  }
}

async function run(args, env) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [sequelizeCli, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);
}

async function main() {
  await fs.rm(databaseDir, { recursive: true, force: true });

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "postgres",
    password: "postgres",
    port,
    persistent: false,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("dolan");

  const env = {
    DATABASE_URL: `postgres://postgres:postgres@127.0.0.1:${port}/dolan`,
    NODE_ENV: "development",
  };

  try {
    console.log("→ migrate up");
    await run(["db:migrate"], env);
    console.log("→ seed");
    await run(["db:seed:all"], env);
    console.log("→ seed undo");
    await run(["db:seed:undo:all"], env);
    console.log("→ migrate undo all");
    await run(["db:migrate:undo:all"], env);
    console.log("→ migrate up again");
    await run(["db:migrate"], env);
    console.log("OK: migrations and seed verified");
  } finally {
    await pg.stop();
    await fs.rm(databaseDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

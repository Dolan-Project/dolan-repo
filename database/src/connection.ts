import { Sequelize, type Options } from "sequelize";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
dotenv.config({ path: path.join(rootDir, ".env") });

function buildOptions(): Options {
  const logging = process.env.DB_LOGGING === "true" ? console.log : false;
  const ssl =
    process.env.DB_SSL === "true"
      ? {
          require: true,
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
        }
      : undefined;

  if (process.env.DATABASE_URL) {
    return {
      dialect: "postgres",
      logging,
      dialectOptions: { ssl },
      define: { underscored: true, timestamps: true },
    };
  }

  return {
    dialect: "postgres",
    logging,
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "dolan",
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    dialectOptions: { ssl },
    define: { underscored: true, timestamps: true },
  };
}

let sequelizeSingleton: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (sequelizeSingleton) return sequelizeSingleton;

  const options = buildOptions();
  sequelizeSingleton = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, options)
    : new Sequelize(options);

  return sequelizeSingleton;
}

export function replaceSequelizeForTests(instance: Sequelize | null) {
  sequelizeSingleton = instance;
}

export async function assertDatabaseConnection(): Promise<void> {
  await getSequelize().authenticate();
}

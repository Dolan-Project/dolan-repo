require("dotenv").config({ path: require("path").resolve(__dirname, "..", "..", ".env") });

const common = {
  dialect: "postgres",
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
  dialectOptions: {
    ssl:
      process.env.DB_SSL === "true"
        ? {
            require: true,
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
          }
        : undefined,
  },
  define: {
    underscored: true,
    timestamps: true,
  },
};

function fromUrlOrParts() {
  if (process.env.DATABASE_URL) {
    return {
      ...common,
      use_env_variable: "DATABASE_URL",
    };
  }

  return {
    ...common,
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "dolan",
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
  };
}

const config = fromUrlOrParts();

module.exports = {
  development: config,
  test: {
    ...config,
    database: process.env.DB_NAME_TEST || (process.env.DB_NAME ? `${process.env.DB_NAME}_test` : "dolan_test"),
  },
  production: config,
};

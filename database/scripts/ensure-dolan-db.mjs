import pg from "pg";

const client = new pg.Client({
  host: "127.0.0.1",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: "postgres",
});

await client.connect();
const result = await client.query(
  "SELECT datname FROM pg_database WHERE datname = 'dolan'",
);
console.log("connected");
if (result.rowCount === 0) {
  await client.query("CREATE DATABASE dolan");
  console.log("created_dolan");
} else {
  console.log("dolan_exists");
}
await client.end();

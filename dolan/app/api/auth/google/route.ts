/** BFF entry: browser → Next → Express Google OAuth start. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next");
  const expressOrigin = (process.env.EXPRESS_ORIGIN ?? process.env.API_URL ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );
  const dest = new URL(`${expressOrigin}/api/v1/auth/google`);
  if (next) dest.searchParams.set("next", next);
  return Response.redirect(dest.toString(), 302);
}

export function shouldUseMockApi(): boolean {
  const mock = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
  if (
    mock &&
    process.env.NODE_ENV === "production" &&
    typeof console !== "undefined"
  ) {
    console.warn(
      "[dolan] NEXT_PUBLIC_USE_MOCK_API is not false — production is running in mock mode.",
    );
  }
  return mock;
}

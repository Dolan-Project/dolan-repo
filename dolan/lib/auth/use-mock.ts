export function shouldUseMockApi(): boolean {
  const mock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
  if (
    mock &&
    process.env.NODE_ENV === "production" &&
    typeof console !== "undefined"
  ) {
    console.warn(
      "[dolan] NEXT_PUBLIC_USE_MOCK_API=true — production is running in mock mode.",
    );
  }
  return mock;
}

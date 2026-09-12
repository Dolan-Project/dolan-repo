export function useMockApi(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
}

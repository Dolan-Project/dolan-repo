import { profileRouteHandlers } from "@/lib/auth/adapter";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { proxyProfileUpload } from "@/lib/auth/profile-upload-live";

export async function POST(request: Request) {
  return shouldUseMockApi() ? profileRouteHandlers.cover(request) : proxyProfileUpload(request, "cover");
}

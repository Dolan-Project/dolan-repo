import {
  AUTH_ERROR_CODES,
  isProfileComplete,
  profileUpdateSchema,
  type AuthSession,
  type PublicUser,
} from "@/lib/contracts";
import { mockGetMe, mockGetPublicProfile, mockPatchMe } from "@/mocks/profile";
import { mockUploadAvatar, mockUploadCover } from "@/mocks/upload";
import { sampleOtherUser, samplePublicUser } from "@/mocks/fixtures";
import { createApiError } from "@/mocks/scenarios";
import { jsonResult, statusForCode, validationError } from "./api-response";
import { readSessionId } from "./session-cookie";

function incompleteUser(): PublicUser {
  return {
    ...samplePublicUser,
    username: "",
    displayName: "",
    domicile: null,
    bio: null,
  };
}

function sessionFromId(sessionId: string | null): AuthSession | null {
  if (!sessionId) return null;
  if (sessionId === "pending") {
    const user = incompleteUser();
    return {
      user,
      emailVerified: true,
      profileComplete: isProfileComplete(user),
    };
  }
  return {
    user: samplePublicUser,
    emailVerified: true,
    profileComplete: isProfileComplete(samplePublicUser),
  };
}

export async function handleGetMeRequest(request: Request): Promise<Response> {
  const sessionId = readSessionId(request.headers.get("cookie"));
  if (!sessionId) {
    const mock = mockGetMe("unauthorized");
    if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  }
  const session = sessionFromId(sessionId);
  if (!session) {
    return jsonResult(
      createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tidak sah"),
      401,
    );
  }
  return jsonResult({ success: true, data: session }, 200);
}

export async function handlePatchMeRequest(request: Request): Promise<Response> {
  const sessionId = readSessionId(request.headers.get("cookie"));
  if (!sessionId) {
    const mock = mockPatchMe("unauthorized");
    if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  if (parsed.data.username === "taken" || parsed.data.username === "arief_sailor") {
    const mock = mockPatchMe("validationError");
    if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  }

  const user: PublicUser = {
    ...samplePublicUser,
    username: parsed.data.username,
    displayName: parsed.data.displayName,
    domicile: parsed.data.domicile,
    bio: parsed.data.bio ?? null,
  };
  const session: AuthSession = {
    user,
    emailVerified: true,
    profileComplete: isProfileComplete(user),
  };
  return jsonResult({ success: true, data: session }, 200);
}

export async function handleGetPublicProfileRequest(
  username: string,
): Promise<Response> {
  if (username === samplePublicUser.username) {
    return jsonResult({ success: true, data: samplePublicUser }, 200);
  }
  if (username === sampleOtherUser.username) {
    return jsonResult({ success: true, data: sampleOtherUser }, 200);
  }
  const mock = mockGetPublicProfile("empty");
  if (!mock.success) return jsonResult(mock, statusForCode(mock.error.code));
  return jsonResult(mock, 200);
}

export async function handleUploadRequest(
  request: Request,
  kind: "avatar" | "cover",
): Promise<Response> {
  const sessionId = readSessionId(request.headers.get("cookie"));
  if (!sessionId) {
    return jsonResult(
      createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tidak sah"),
      401,
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonResult(
      createApiError("UPLOAD_INVALID_TYPE", "File unggahan wajib ada"),
      400,
    );
  }

  const result =
    kind === "avatar"
      ? mockUploadAvatar({ type: file.type, size: file.size })
      : mockUploadCover({ type: file.type, size: file.size });
  if (!result.success) return jsonResult(result, statusForCode(result.error.code));
  return jsonResult(result, 200);
}

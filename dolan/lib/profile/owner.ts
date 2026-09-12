export function isOwnProfile(
  viewerUsername: string | undefined,
  profileUsername: string,
): boolean {
  return Boolean(viewerUsername && viewerUsername === profileUsername);
}

export function profilePrimaryAction(
  viewerUsername: string | undefined,
  profileUsername: string,
): "edit" | "follow" {
  return isOwnProfile(viewerUsername, profileUsername) ? "edit" : "follow";
}

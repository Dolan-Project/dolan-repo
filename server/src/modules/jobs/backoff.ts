export function retryWaitMs(attemptCount: number, backoffMs: number): number {
  if (attemptCount <= 0) return 0;
  return backoffMs * 2 ** (attemptCount - 1);
}

export function isJobReadyForClaim(
  job: { attemptCount: number; updatedAt: string },
  now: Date,
  backoffMs: number,
): boolean {
  const wait = retryWaitMs(job.attemptCount, backoffMs);
  if (wait <= 0) return true;
  return now.getTime() - Date.parse(job.updatedAt) >= wait;
}

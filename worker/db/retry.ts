const TRANSIENT = /Connection terminated|ECONNRESET|connection timeout/i;

const isTransient = (error: unknown) =>
  [error, (error as Error | undefined)?.cause].some((e) =>
    TRANSIENT.test((e as Error | undefined)?.message ?? ""),
  );

// Limit: single retry, a real backoff policy if drops become common.
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isTransient(error)) throw error;
    return fn();
  }
}

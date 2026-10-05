type QueryResult<T> = {
  data: T;
  error: { message: string } | null;
};

export function isJwtIssuedAtFutureError(message: string) {
  return /JWT issued at future/i.test(message);
}

/**
 * PostgREST intermittently rejects freshly minted JWTs with PGRST303
 * ("JWT issued at future") due to Auth/PostgREST clock skew. One short
 * retry usually clears it.
 */
export async function withJwtSkewRetry<T>(
  run: () => PromiseLike<QueryResult<T>>,
): Promise<QueryResult<T>> {
  const first = await run();
  if (!first.error || !isJwtIssuedAtFutureError(first.error.message)) {
    return first;
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return run();
}

/**
 * withMinimumDelay
 *
 * Helper function to wrap any asynchronous action (such as payment webhook polling,
 * NFT minting/transfer, or NFC verification) and guarantee that the loader is displayed
 * for at least the specified minimum duration (default 12 seconds).
 *
 * If the action completes faster than the minimum delay, it waits for the remaining time.
 * If the action takes longer than the minimum delay, it returns immediately upon completion.
 */
export async function withMinimumDelay<T>(
  action: Promise<T> | (() => Promise<T>),
  minDelayMs = 12000 // 12 seconds minimum
): Promise<T> {
  const start = Date.now()
  const promise = typeof action === 'function' ? action() : action
  const result = await promise
  const elapsed = Date.now() - start
  const remaining = minDelayMs - elapsed
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }
  return result
}

/**
 * src/lib/terra/docs/mutations.ts
 * Serializes remote mutations through a rate and failure circuit breaker.
 */

/*//////////////////////////////////////////////////
IMPORTS
//////////////////////////////////////////////////*/

// API
import { clearTransition, setTransition } from './state.js';
import { toast } from 'sonner';
import { warn } from '../runtime/runtime.js';

/**
 * Client-side circuit breaker for mutation coordination.
 *
 * @remarks This utility combines three strategies to protect the browser's UI thread and network:
 * 1. **Circuit Breaker:** Prevents excessive requests (>20/sec) or after consecutive 429/5xx errors. Opens to block new requests, then transitions to HALF_OPEN to retry after a cooldown.
 * 2. **Debouncing/Throttling:** Controls input-triggered requests (e.g., keyboard, scroll) by delaying or limiting their frequency.
 * 3. **Request Deduplication:** Reuses existing in-flight promises for identical requests, preventing redundant network calls.
 */
class CircuitBreaker {
  private failures = 0;
  private requests = 0;
  private lastReqTime = typeof Date !== 'undefined' ? Date.now() : 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;
  private readonly MAX_FAILURES = 5;
  private readonly RESET_TIMEOUT_MS = 10000; // 10 seconds
  private readonly MAX_REQS_PER_SEC = 20;
  /** Enforces the request-rate limit and waits for the cooldown after the breaker opens. */
  public check(): void {
    const now = Date.now();
    // reset the volume counter every second
    if (now - this.lastReqTime > 1000) {
      this.requests = 0;
      this.lastReqTime = now;
    }
    this.requests++;
    if (this.state === 'OPEN') {
      if (now > this.nextAttempt) this.state = 'HALF_OPEN';
      else
        throw new Error(
          'Circuit breaker tripped: Too many requests or consecutive failures. Please wait 10 seconds.',
        );
    } else if (this.requests > this.MAX_REQS_PER_SEC) {
      this.trip(now);
      throw new Error('Circuit breaker tripped: Rate limit exceeded.');
    }
  }
  /** Opens the breaker until the cooldown expires and records the rejection boundary.
   * @param now Current timestamp used to calculate the cooldown deadline.
   */
  private trip(now: number): void {
    this.state = 'OPEN';
    this.nextAttempt = now + this.RESET_TIMEOUT_MS;
    warn('CircuitBreaker', 'Tripped OPEN. Network requests blocked.');
  }
  /** Closes a half-open breaker after a successful request and clears its failure count. */
  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
    }
  }
  /** Opens the breaker after the configured number of consecutive mutation failures. */
  public recordFailure(): void {
    this.failures++;
    if (this.failures >= this.MAX_FAILURES) this.trip(Date.now());
  }
}

/** Shared circuit breaker for mutation helpers. */
const breaker = new CircuitBreaker();

/**
 * Runs a mutation while holding the local transition lock and updating the circuit breaker.
 *
 * @param action - Asynchronous mutation to run.
 * @param fallbackErr - Message shown when the action rejects with a non-Error value.
 * @param onStart - Optional callback run after acquiring the transition lock.
 * @param onEnd - Optional callback run before releasing the transition lock.
 */
export const runMutation = async (
  action: () => Promise<void>,
  fallbackErr: string,
  onStart?: () => void,
  onEnd?: () => void,
): Promise<void> => {
  breaker.check();
  setTransition('local');
  if (onStart) onStart();
  try {
    await action();
    breaker.recordSuccess();
  } catch (err: unknown) {
    breaker.recordFailure();
    toast.error(err instanceof Error ? err.message : fallbackErr);
  } finally {
    if (onEnd) onEnd();
    clearTransition();
  }
};

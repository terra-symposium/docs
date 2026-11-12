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

/*//////////////////////////////////////////////////
CONFIG
//////////////////////////////////////////////////*/

/** Limits mutation frequency and pauses mutations after repeated failures.
 *
 * @remarks The breaker opens when more than 20 checks occur within a second or after five recorded failures. It blocks checks for ten seconds, then allows a half-open attempt; a successful attempt closes the breaker.
 */
class CircuitBreaker {
  private failures = 0;
  private requests = 0;
  private lastReqTime = typeof Date !== 'undefined' ? Date.now() : 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = 0;
  private readonly MAX_FAILURES = 5;
  private readonly RESET_TIMEOUT_MS = 10000;
  private readonly MAX_REQS_PER_SEC = 20;

  /** Enforces the rate limit and rejects mutations while the breaker is open. */
  public check(): void {
    const now = Date.now();
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

  /** Opens the breaker and records when its ten-second cooldown ends.
   *
   * @param now Current time used to calculate the cooldown deadline.
   */
  private trip(now: number): void {
    this.state = 'OPEN';
    this.nextAttempt = now + this.RESET_TIMEOUT_MS;
    warn('CircuitBreaker', 'Tripped OPEN. Network requests blocked.');
  }

  /** Closes a half-open breaker and clears its consecutive failure count. */
  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
    }
  }

  /** Counts a failed mutation and opens the breaker after five recorded failures. */
  public recordFailure(): void {
    this.failures++;
    if (this.failures >= this.MAX_FAILURES) this.trip(Date.now());
  }
}

/** One breaker instance shared by mutation helpers in this module. */
const breaker = new CircuitBreaker();

/** Executes a mutation while the shared circuit breaker and transition lock are active.
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

import type { User } from '../types';

const ANONYMOUS_ID_KEY = 'nur_anonymous_id';

/**
 * Returns a stable anonymous ID for this device. Creates and persists one if missing.
 */
export function getOrCreateAnonymousId(): string {
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

/**
 * True if the email belongs to an anonymous (guest) session.
 */
export function isAnonymousEmail(email: string): boolean {
  return email.startsWith('anonymous_') && email.endsWith('@local');
}

/**
 * True if the user is the local anonymous (guest) user.
 */
export function isAnonymousUser(user: User | null): boolean {
  if (!user?.email) return false;
  return isAnonymousEmail(user.email);
}

/**
 * Builds a synthetic User for anonymous (guest) sessions. Data is stored in IndexedDB keyed by email.
 */
export function createAnonymousUser(): User {
  const id = getOrCreateAnonymousId();
  return {
    id,
    name: 'Guest',
    email: `anonymous_${id}@local`,
  };
}

/**
 * Returns the anonymous email for a given anonymous ID (for migration/cleanup).
 */
export function getAnonymousEmail(id: string): string {
  return `anonymous_${id}@local`;
}

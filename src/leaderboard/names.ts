// Name rules shared by client pre-validation and server enforcement
// (plan §6). Pure and Node-safe: no DOM, no storage, no Phaser.

import { isNameAllowedByModeration } from './bannedWords.js';

export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 16;

// ASCII-only on purpose (plan §6): dodges homoglyph bypasses entirely and
// matches the arcade-initials spirit. Postgres CHECKs back-stop length drift.
const NAME_CHARSET = /^[A-Za-z0-9 _-]+$/;

export type NameErrorCode = 'name_length' | 'name_charset' | 'name_not_allowed';

export type NameValidation =
  { ok: true; name: string; nameKey: string } | { ok: false; code: NameErrorCode };

// Canonical display form: trim, collapse whitespace runs to single spaces.
export function canonicalizeName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

// Case-insensitive uniqueness key: one row per (game, nameKey) server-side.
// Lowercase only — separators stay, so the key length always equals the
// display name's and the DB's 2–16 CHECK can never disagree with us.
export function nameKey(name: string): string {
  return name.toLowerCase();
}

// Validation order is pinned by plan §4: length → charset → moderation.
// First failure wins; the server re-runs this exact function on every POST.
export function validateName(raw: unknown): NameValidation {
  if (typeof raw !== 'string') {
    return { ok: false, code: 'name_length' };
  }
  const name = canonicalizeName(raw);
  if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
    return { ok: false, code: 'name_length' };
  }
  if (!NAME_CHARSET.test(name)) {
    return { ok: false, code: 'name_charset' };
  }
  if (!isNameAllowedByModeration(name)) {
    return { ok: false, code: 'name_not_allowed' };
  }
  return { ok: true, name, nameKey: nameKey(name) };
}

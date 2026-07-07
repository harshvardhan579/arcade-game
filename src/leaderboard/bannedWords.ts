// Curated moderation list shared by client pre-validation and server
// enforcement so the two can never disagree (plan §6). Names are ASCII-only
// by the charset rule, so normalization needs no Unicode handling.

// Leetspeak characters folded to letters before matching (plan §6 map).
const LEET_MAP: Readonly<Record<string, string>> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '8': 'b',
  '@': 'a',
  $: 's'
};

// Severe tier: rejected wherever the entry appears inside a normalized name.
// Every entry is chosen so essentially no innocent name contains it; known
// rare collisions (e.g. the English town containing "cunt") are a deliberate
// trade-off for a 16-char arcade name field. "therapist"-style collisions
// belong in the exact tier below instead.
export const bannedSubstrings: readonly string[] = [
  'nigger',
  'nigga',
  'faggot',
  'kike',
  'wetback',
  'tranny',
  'hitler',
  'cunt',
  'fuck'
];

// Mild/short tier: rejected only when the whole normalized name matches,
// avoiding Scunthorpe-style false positives ("bass", "assassin", "Dickens",
// "raccoon", "Hancock", "therapist" all stay valid).
export const bannedExact: readonly string[] = [
  'ass',
  'shit',
  'dick',
  'bitch',
  'whore',
  'slut',
  'fag',
  'coon',
  'spic',
  'homo',
  'nazi',
  'rape',
  'rapist',
  'cock',
  'piss',
  'twat'
];

// Reserved identities (plan §6): never claimable as player names.
export const reservedNames: readonly string[] = [
  'admin',
  'administrator',
  'moderator',
  'pocketarcade'
];

// Lowercase, fold leetspeak, strip the separator characters the charset
// allows (space, underscore, hyphen) so "F u_C-k" collapses to its target.
export function normalizeForModeration(name: string): string {
  let out = '';
  for (const ch of name.toLowerCase()) {
    const mapped = LEET_MAP[ch] ?? ch;
    if (mapped === ' ' || mapped === '_' || mapped === '-') {
      continue;
    }
    out += mapped;
  }
  return out;
}

export function isNameAllowedByModeration(name: string): boolean {
  const normalized = normalizeForModeration(name);
  if (bannedExact.includes(normalized) || reservedNames.includes(normalized)) {
    return false;
  }
  return !bannedSubstrings.some((entry) => normalized.includes(entry));
}

import { describe, expect, it } from 'vitest';
import { isNameAllowedByModeration, normalizeForModeration } from './bannedWords';
import { canonicalizeName, NAME_MAX_LENGTH, nameKey, validateName } from './names';

function expectRejected(raw: unknown, code: 'name_length' | 'name_charset' | 'name_not_allowed') {
  expect(validateName(raw)).toEqual({ ok: false, code });
}

describe('canonicalizeName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(canonicalizeName('  AAA  ')).toBe('AAA');
  });

  it('collapses inner whitespace runs to single spaces', () => {
    expect(canonicalizeName('A   B')).toBe('A B');
    expect(canonicalizeName('a\t b\n c')).toBe('a b c');
  });

  it('preserves case and already-canonical spacing', () => {
    expect(canonicalizeName('Neo Runner')).toBe('Neo Runner');
  });
});

describe('validateName acceptance', () => {
  it('accepts simple arcade names and returns canonical name plus key', () => {
    expect(validateName('AAA')).toEqual({ ok: true, name: 'AAA', nameKey: 'aaa' });
    expect(validateName('Neo  Runner')).toEqual({
      ok: true,
      name: 'Neo Runner',
      nameKey: 'neo runner'
    });
  });

  it('accepts the full charset: letters, digits, space, underscore, hyphen', () => {
    expect(validateName('x_1-2 Z')).toMatchObject({ ok: true });
    expect(validateName('42')).toMatchObject({ ok: true });
  });

  it('accepts the exact length boundaries', () => {
    expect(validateName('ab')).toMatchObject({ ok: true });
    expect(validateName('A'.repeat(NAME_MAX_LENGTH))).toMatchObject({ ok: true });
  });

  it('accepts a raw string that only fits after whitespace collapse', () => {
    // 17 raw characters, 15 after collapsing the inner run.
    expect(validateName('AAAAAAA   AAAAAAA')).toEqual({
      ok: true,
      name: 'AAAAAAA AAAAAAA',
      nameKey: 'aaaaaaa aaaaaaa'
    });
  });

  it('lowercases for the uniqueness key but keeps separators', () => {
    expect(nameKey('A B_c-D')).toBe('a b_c-d');
  });
});

describe('validateName length rules', () => {
  it('rejects empty, whitespace-only, and one-character names', () => {
    expectRejected('', 'name_length');
    expectRejected('   ', 'name_length');
    expectRejected('A', 'name_length');
    expectRejected(' A ', 'name_length');
  });

  it('rejects names longer than the maximum', () => {
    expectRejected('A'.repeat(NAME_MAX_LENGTH + 1), 'name_length');
  });

  it('rejects non-string input as a length failure', () => {
    expectRejected(42, 'name_length');
    expectRejected(null, 'name_length');
    expectRejected(undefined, 'name_length');
  });

  it('checks length before charset', () => {
    expectRejected('A'.repeat(NAME_MAX_LENGTH + 1) + '!', 'name_length');
  });
});

describe('validateName charset rules', () => {
  it('rejects punctuation and symbols', () => {
    expectRejected('AAA!', 'name_charset');
    expectRejected('a.b', 'name_charset');
    expectRejected('a,b', 'name_charset');
    expectRejected('a+b', 'name_charset');
  });

  it('rejects non-ASCII letters and emoji (deliberate v1 restriction)', () => {
    expectRejected('héllo', 'name_charset');
    expectRejected('日本語です', 'name_charset');
    expectRejected('🐍🐍', 'name_charset');
  });

  it('checks charset before moderation', () => {
    // Both would also fail moderation after leet folding; charset wins first.
    expectRejected('fück', 'name_charset');
    expectRejected('@dmin', 'name_charset');
  });
});

describe('validateName moderation rules', () => {
  it('rejects severe entries directly and case-insensitively', () => {
    expectRejected('fuck', 'name_not_allowed');
    expectRejected('FUCK', 'name_not_allowed');
  });

  it('rejects severe entries embedded in longer names', () => {
    expectRejected('fuckface', 'name_not_allowed');
    expectRejected('Mr Fuck', 'name_not_allowed');
  });

  it('rejects separator evasion', () => {
    expectRejected('F u_C-k', 'name_not_allowed');
  });

  it('rejects leetspeak evasion of severe entries', () => {
    expectRejected('n1gga', 'name_not_allowed');
    expectRejected('NIGG4', 'name_not_allowed');
    expectRejected('h1tl3r', 'name_not_allowed');
  });

  it('rejects exact-tier words including leet forms', () => {
    expectRejected('sh1t', 'name_not_allowed');
    expectRejected('5h17', 'name_not_allowed');
    expectRejected('b1tch', 'name_not_allowed');
    expectRejected('a55', 'name_not_allowed');
  });

  it('rejects reserved names in any disguise', () => {
    expectRejected('admin', 'name_not_allowed');
    expectRejected('ADMIN', 'name_not_allowed');
    expectRejected('Ad Min', 'name_not_allowed');
    expectRejected('ad-min', 'name_not_allowed');
    expectRejected('4dmin', 'name_not_allowed');
    expectRejected('moderator', 'name_not_allowed');
    expectRejected('Pocket Arcade', 'name_not_allowed');
    expectRejected('pocket-arcade', 'name_not_allowed');
  });

  it('accepts safe near-misses of exact-tier words', () => {
    expect(validateName('Therapist')).toMatchObject({ ok: true });
    expect(validateName('Assassin')).toMatchObject({ ok: true });
    expect(validateName('Class Act')).toMatchObject({ ok: true });
    expect(validateName('bass')).toMatchObject({ ok: true });
    expect(validateName('B4SS')).toMatchObject({ ok: true });
    expect(validateName('Dickens')).toMatchObject({ ok: true });
    expect(validateName('Hancock')).toMatchObject({ ok: true });
    expect(validateName('raccoon')).toMatchObject({ ok: true });
    expect(validateName('Grape')).toMatchObject({ ok: true });
  });

  it('accepts names that merely share letters with severe entries', () => {
    expect(validateName('Nigel')).toMatchObject({ ok: true });
  });
});

describe('normalizeForModeration', () => {
  it('lowercases, folds the full leet map, and strips separators', () => {
    expect(normalizeForModeration('F@G')).toBe('fag');
    expect(normalizeForModeration('A B_c-D')).toBe('abcd');
    expect(normalizeForModeration('01345 78@$')).toBe('oieastbas');
  });

  it('is used by the allow check for the symbol leet characters too', () => {
    // '@' and '$' cannot pass the charset, but the moderation layer alone
    // must still fold them so the server can never be tricked upstream.
    expect(isNameAllowedByModeration('f@g')).toBe(false);
    expect(isNameAllowedByModeration('a$$')).toBe(false);
  });
});

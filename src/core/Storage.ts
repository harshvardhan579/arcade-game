export class SafeStorage {
  getNumber(key: string, fallback = 0): number {
    try {
      const value = window.localStorage.getItem(key);
      if (value === null) return fallback;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  setNumber(key: string, value: number): void {
    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Storage is best-effort; private browsing and quota errors should not break play.
    }
  }

  getString(key: string, fallback = ''): string {
    try {
      return window.localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  setString(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Best-effort, same as numbers: losing persistence must never break play.
    }
  }
}

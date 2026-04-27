/**
 * In-memory magic-link rows for local Node proxy (token_hash hex → row).
 * Production uses D1 via Pages Functions.
 */
const rows = new Map();

export function magicInsert(tokenHash, email, expiresAt) {
  rows.set(tokenHash, { email, expires_at: expiresAt, used_at: null });
}

export function magicGet(tokenHash) {
  return rows.get(tokenHash) || null;
}

export function magicMarkUsed(tokenHash, now) {
  const r = rows.get(tokenHash);
  if (r) r.used_at = now;
}

export function magicDelete(tokenHash) {
  rows.delete(tokenHash);
}

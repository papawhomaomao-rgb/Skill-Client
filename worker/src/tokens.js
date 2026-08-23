/* Opaque credentials. Deliberately NOT JWTs.
   Windows Credential Manager truncates long blobs and the session dies silently
   on the next launcher restart, so every launcher-held string here is
   prefix + 32 hex = 35 chars, 128 bits of entropy. */

const HEX = "0123456789abcdef";

function randomHex(bytes) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += HEX[x >> 4] + HEX[x & 15];
  return s;
}

export const newDeviceCode = () => "dc_" + randomHex(16);   // 35 chars
export const newLauncherToken = () => "lt_" + randomHex(16); // 35 chars
export const newRefreshToken = () => "lr_" + randomHex(16);  // 35 chars
export const newSessionId = () => "sess_" + randomHex(8);

/* Match code: human-comparable, never typed. Ambiguous glyphs excluded
   (no O/0, I/1/l, S/5, B/8). 5 chars from a 27-glyph alphabet, shown XX-XXX. */
const MATCH_ALPHABET = "ACDEFGHJKMNPQRTUVWXY2346789";

export function newMatchCode() {
  const b = new Uint8Array(5);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += MATCH_ALPHABET[x % MATCH_ALPHABET.length];
  return s.slice(0, 2) + "-" + s.slice(2);
}

/* Tokens are stored hashed. A KV dump is then not a pile of live credentials. */
export async function hash(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x => HEX[x >> 4] + HEX[x & 15]).join("");
}

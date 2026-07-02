// Host/Admin PIN step-up auth. A signed-in guest account and a signed-in host
// account use the same Supabase login — so entering /host or /admin also asks
// for a short numeric PIN (same mental model as an M-Pesa PIN), independent of
// that Supabase session. Runs in the proxy (edge-safe) and in Route Handlers
// (Node), so everything here is Web Crypto only — no node:crypto.

export const HOST_PIN_COOKIE = "beddn_hp";
export const HOST_PIN_COOKIE_MAX_AGE = 60 * 60 * 12; // 12 hours
export const HOST_PIN_LENGTH = 4;
export const HOST_PIN_MAX_ATTEMPTS = 5;
export const HOST_PIN_LOCK_MINUTES = 15;

const PBKDF2_ITERATIONS = 100_000;

function toHex(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return arr;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function pbkdf2(pin: string, salt: Uint8Array) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return toHex(bits);
}

export function isValidPinFormat(pin: string) {
  return new RegExp(`^\\d{${HOST_PIN_LENGTH}}$`).test(pin);
}

// Stored as "iterations:saltHex:hashHex" so the work factor can change later
// without invalidating old hashes.
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(pin, salt);
  return `${PBKDF2_ITERATIONS}:${toHex(salt)}:${hash}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [, saltHex, hashHex] = parts;
  const computed = await pbkdf2(pin, fromHex(saltHex));
  return timingSafeEqual(computed, hashHex);
}

async function hmacSecretKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

// Cookie value: "<expiryEpochSeconds>.<hmacHex>" signed over "<userId>.<expiry>".
// No PIN or hash material touches the cookie — only proof that this userId
// unlocked within the last HOST_PIN_COOKIE_MAX_AGE seconds.
export async function signHostUnlock(userId: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + HOST_PIN_COOKIE_MAX_AGE;
  const key = await hmacSecretKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}.${expiry}`));
  return `${expiry}.${toHex(sig)}`;
}

export async function verifyHostUnlock(cookieValue: string | undefined, userId: string): Promise<boolean> {
  if (!cookieValue) return false;
  const [expiryStr, sig] = cookieValue.split(".");
  const expiry = Number(expiryStr);
  if (!expiry || !sig || expiry < Math.floor(Date.now() / 1000)) return false;
  const key = await hmacSecretKey();
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${userId}.${expiry}`));
  return timingSafeEqual(sig, toHex(expectedSig));
}

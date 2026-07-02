import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  HOST_PIN_COOKIE,
  HOST_PIN_COOKIE_MAX_AGE,
  HOST_PIN_LOCK_MINUTES,
  HOST_PIN_MAX_ATTEMPTS,
  hashPin,
  isValidPinFormat,
  signHostUnlock,
  verifyPin,
} from "@/lib/host-pin";

// Host/Admin Extranet PIN — a second, independent factor on top of the normal
// Supabase login (see src/lib/host-pin.ts for why).
//   GET    -> { hasPin, lockedUntil }
//   POST   { pin } -> creates the PIN if none exists yet, otherwise verifies it.
//                     Either way, success sets the unlock cookie.
//   DELETE { pin } -> clears the PIN (requires the *current* correct PIN), so
//                     the host can immediately set a new one. A truly forgotten
//                     PIN needs an admin reset (see /api/admin/actions).

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("host_pin_hash, host_pin_locked_until")
    .eq("id", user.id)
    .maybeSingle();

  const lockedUntil = profile?.host_pin_locked_until as string | null | undefined;
  const stillLocked = lockedUntil ? new Date(lockedUntil).getTime() > Date.now() : false;

  return NextResponse.json({
    hasPin: Boolean(profile?.host_pin_hash),
    lockedUntil: stillLocked ? lockedUntil : null,
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { pin?: string };
  const pin = (body.pin ?? "").trim();
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("host_pin_hash, host_pin_fail_count, host_pin_locked_until")
    .eq("id", user.id)
    .maybeSingle();

  const lockedUntil = profile?.host_pin_locked_until as string | null | undefined;
  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    const minutesLeft = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Too many wrong PINs. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  const existingHash = profile?.host_pin_hash as string | null | undefined;

  if (!existingHash) {
    // First time — this PIN becomes the host's PIN.
    const hash = await hashPin(pin);
    await admin
      .from("profiles")
      .update({ host_pin_hash: hash, host_pin_updated_at: new Date().toISOString(), host_pin_fail_count: 0, host_pin_locked_until: null })
      .eq("id", user.id);
  } else {
    const ok = await verifyPin(pin, existingHash);
    if (!ok) {
      const failCount = ((profile?.host_pin_fail_count as number | null) ?? 0) + 1;
      const locked = failCount >= HOST_PIN_MAX_ATTEMPTS;
      await admin
        .from("profiles")
        .update({
          host_pin_fail_count: locked ? 0 : failCount,
          host_pin_locked_until: locked
            ? new Date(Date.now() + HOST_PIN_LOCK_MINUTES * 60_000).toISOString()
            : null,
        })
        .eq("id", user.id);
      return NextResponse.json(
        locked
          ? { error: `Too many wrong PINs. Try again in ${HOST_PIN_LOCK_MINUTES} minutes.` }
          : { error: "Wrong PIN. Please try again." },
        { status: locked ? 429 : 401 }
      );
    }
    await admin
      .from("profiles")
      .update({ host_pin_fail_count: 0, host_pin_locked_until: null })
      .eq("id", user.id);
  }

  const token = await signHostUnlock(user.id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(HOST_PIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: HOST_PIN_COOKIE_MAX_AGE,
  });
  return response;
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { pin?: string };
  const pin = (body.pin ?? "").trim();

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("host_pin_hash")
    .eq("id", user.id)
    .maybeSingle();

  const existingHash = profile?.host_pin_hash as string | null | undefined;
  if (existingHash) {
    const ok = isValidPinFormat(pin) && (await verifyPin(pin, existingHash));
    if (!ok) {
      return NextResponse.json({ error: "That PIN doesn't match your current one." }, { status: 401 });
    }
  }

  await admin
    .from("profiles")
    .update({ host_pin_hash: null, host_pin_updated_at: null, host_pin_fail_count: 0, host_pin_locked_until: null })
    .eq("id", user.id);

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(HOST_PIN_COOKIE);
  return response;
}

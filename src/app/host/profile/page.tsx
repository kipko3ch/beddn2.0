"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/icon";
import { uploadListingImage } from "@/lib/upload-image";
import { ROUTES } from "@/lib/routes";

interface HostProfile {
  id: string;
  name: string;
  phone: string;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean;
}

const BIO_MAX = 600;

export default function HostProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pinResetOpen, setPinResetOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState("");

  async function resetPin(e: React.FormEvent) {
    e.preventDefault();
    setPinBusy(true);
    setPinError("");
    const res = await fetch("/api/host/pin", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: currentPin }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setPinBusy(false);
    if (!res.ok) {
      setPinError(json.error || "Could not reset your PIN.");
      return;
    }
    router.push(ROUTES.hostUnlock);
  }

  useEffect(() => {
    fetch("/api/host")
      .then((r) => (r.ok ? r.json() : { host: null }))
      .then((j: { host: HostProfile | null }) => {
        if (j.host) {
          setName(j.host.name ?? "");
          setPhone(j.host.phone ?? "");
          setBio(j.host.bio ?? "");
          setAvatarUrl(j.host.avatar_url ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus(null);
    setUploading(true);
    try {
      const url = await uploadListingImage(file);
      setAvatarUrl(url);
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/host", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, bio, avatarUrl }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    setStatus(
      res.ok
        ? { type: "success", message: "Profile saved." }
        : { type: "error", message: json.error || "Could not save your profile." }
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-8 w-48 animate-pulse rounded-full bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-brand text-3xl text-[#2b000a] sm:text-4xl">Your host profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a profile picture and a short intro so guests know who they&apos;re staying with.
        </p>
      </div>

      <form onSubmit={save} className="space-y-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-[#f5eef1]">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <Icon icon="line-md:account" className="h-9 w-9 text-[#800020]" />
              </span>
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="rounded-full"
            >
              {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
            </Button>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl(null)}
                className="ml-3 text-sm text-muted-foreground underline hover:text-[#800020]"
              >
                Remove
              </button>
            )}
            <p className="mt-1.5 text-xs text-muted-foreground">JPG or PNG, square works best.</p>
          </div>
        </div>

        <div>
          <Label htmlFor="host-name">Display name</Label>
          <Input
            id="host-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="mt-1 h-12 rounded-xl"
            required
          />
        </div>

        <div>
          <Label htmlFor="host-phone">WhatsApp / phone number</Label>
          <Input
            id="host-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+254…"
            className="mt-1 h-12 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="host-bio">About you</Label>
          <div className="relative mt-1">
            <Textarea
              id="host-bio"
              value={bio}
              maxLength={BIO_MAX}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="Tell guests a little about yourself, your place, and what makes a great stay."
              className="rounded-xl"
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">
              {bio.length}/{BIO_MAX}
            </span>
          </div>
        </div>

        {status && (
          <p
            className={`rounded-xl px-3 py-2 text-sm ${
              status.type === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {status.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={saving || uploading}
          className="h-12 w-full rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
        >
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>

      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f8eef2] text-[#800020]">
            <Icon icon="line-md:lock" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold text-[#2b000a]">Host PIN</h2>
            <p className="text-sm text-muted-foreground">
              The 4-digit PIN that unlocks your dashboard, separate from your login. Once entered,
              it stays unlocked for 12 hours, then asks again (or sooner on a new browser or device).
            </p>
          </div>
        </div>

        {!pinResetOpen ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setPinResetOpen(true)}
            className="mt-4 rounded-full"
          >
            Reset my PIN
          </Button>
        ) : (
          <form onSubmit={resetPin} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="current-pin">Enter your current PIN to reset it</Label>
              <Input
                id="current-pin"
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                className="mt-1 h-12 w-32 rounded-xl text-center text-lg tracking-[0.5em]"
                autoFocus
              />
            </div>
            {pinError && <p className="text-sm text-red-700">{pinError}</p>}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={pinBusy || currentPin.length !== 4}
                className="rounded-full bg-[#800020] font-bold hover:bg-[#600018]"
              >
                {pinBusy ? "Checking…" : "Reset PIN"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPinResetOpen(false);
                  setCurrentPin("");
                  setPinError("");
                }}
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

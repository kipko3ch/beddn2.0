"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { BeddnLoader } from "@/components/beddn-loader";
import { uploadListingImage } from "@/lib/upload-image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

interface Destination {
  id: string;
  name: string;
  search_query: string;
  image_url: string;
  position: number;
  is_active: boolean;
}

export default function AdminDestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/destinations");
    const json: { destinations?: Destination[] } = res.ok ? await res.json() : {};
    setDestinations(json.destinations ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      setImageUrl(await uploadListingImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !imageUrl) {
      setError("Add a destination name and an image.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/destinations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        search_query: searchQuery || name,
        image_url: imageUrl,
        position: destinations.length,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({ error: "" }));
      setError(json.error || "Could not save destination.");
      return;
    }
    setName("");
    setSearchQuery("");
    setImageUrl("");
    if (fileInput.current) fileInput.current.value = "";
    await load();
  }

  async function update(id: string, updates: Partial<Destination>) {
    await fetch("/api/admin/destinations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this destination?")) return;
    await fetch(`/api/admin/destinations?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Popular destinations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          These tiles show on the home page. Add a city image and the search it should open.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-8 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[160px_1fr_1fr_auto] sm:items-end"
      >
        <div>
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Image</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40 text-muted-foreground hover:border-[#800020]"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : imageUrl ? (
              <Image src={imageUrl} alt="" fill className="object-cover" sizes="160px" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </button>
        </div>
        <div>
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Name shown</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nairobi" />
        </div>
        <div>
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">
            Search query (optional)
          </span>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Defaults to the name"
          />
        </div>
        <Button
          type="submit"
          disabled={saving || uploading}
          className="h-10 rounded-full bg-[#800020] px-6 font-semibold hover:bg-[#600018]"
        >
          {saving ? "Saving…" : "Add"}
        </Button>
        {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      </form>

      {loading ? (
        <BeddnLoader label="Loading destinations…" />
      ) : destinations.length === 0 ? (
        <EmptyState
          image="https://res.cloudinary.com/dzjhuss7i/image/upload/v1781029363/empty-admin_ypowli.png"
          title="No destinations yet"
          subtitle="Add cities above and they will appear on the home page."
          size="sm"
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {destinations.map((destination) => (
            <div key={destination.id} className="overflow-hidden rounded-2xl border bg-white">
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={destination.image_url}
                  alt={destination.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 280px"
                />
                {!destination.is_active && (
                  <Badge className="absolute left-2 top-2 rounded-full bg-black/70 text-white">
                    Hidden
                  </Badge>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold">{destination.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Searches “{destination.search_query}”
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update(destination.id, { is_active: !destination.is_active })}
                  >
                    {destination.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update(destination.id, { position: destination.position - 1 })}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => update(destination.id, { position: destination.position + 1 })}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-red-600 hover:text-red-700"
                    onClick={() => remove(destination.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

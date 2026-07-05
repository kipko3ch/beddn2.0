"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DashboardListSkeleton } from "@/components/dashboard-skeletons";
import { Megaphone, Trash2, Calendar, AlertCircle, AlertTriangle, Info, Plus, X } from "lucide-react";
import { format } from "date-fns";

type Announcement = {
  id: string;
  title: string;
  message: string;
  priority: "normal" | "important" | "urgent";
  is_mandatory: boolean;
  expires_at: string | null;
  created_at: string;
};

const PRIORITY_THEME = {
  normal: "bg-blue-50 text-blue-700 border-blue-200",
  important: "bg-amber-50 text-amber-700 border-amber-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminAnnouncementsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"normal" | "important" | "urgent">("normal");
  const [isMandatory, setIsMandatory] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("host_announcements")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setSaving(true);
    const insertPayload = {
      title: title.trim(),
      message: message.trim(),
      priority,
      is_mandatory: isMandatory,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    const { error } = await supabase.from("host_announcements").insert(insertPayload);
    setSaving(false);

    if (error) {
      alert("Failed to create announcement: " + error.message);
    } else {
      setShowModal(false);
      // Reset form
      setTitle("");
      setMessage("");
      setPriority("normal");
      setIsMandatory(false);
      setExpiresAt("");
      await load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this announcement? This action is permanent.")) return;
    const { error } = await supabase.from("host_announcements").delete().eq("id", id);
    if (error) {
      alert("Failed to delete announcement: " + error.message);
    } else {
      await load();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-brand text-3xl text-[#2b000a]">Host Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage announcements targeted to all registered hosts.
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="gap-2 rounded-full bg-[#800020] text-white hover:bg-merlot font-bold"
        >
          <Plus className="h-4 w-4" /> Create Announcement
        </Button>
      </div>

      {loading ? (
        <DashboardListSkeleton rows={3} />
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="mt-4 text-lg font-bold text-[#2b000a]">No announcements</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by creating your first announcement to hosts.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => {
            const isExpired = ann.expires_at ? new Date(ann.expires_at) < new Date() : false;
            return (
              <div
                key={ann.id}
                className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${
                  isExpired ? "opacity-65" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {ann.priority === "urgent" && <AlertCircle className="h-4 w-4 text-red-500" />}
                      {ann.priority === "important" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {ann.priority === "normal" && <Info className="h-4 w-4 text-blue-500" />}
                      <h2 className="text-lg font-bold text-[#2b000a]">{ann.title}</h2>
                      <Badge variant="outline" className={`text-xs capitalize ${PRIORITY_THEME[ann.priority]}`}>
                        {ann.priority}
                      </Badge>
                      {ann.is_mandatory && (
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                          Mandatory
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="outline" className="bg-zinc-100 text-zinc-600">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#181113]/85 whitespace-pre-wrap">{ann.message}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Created: {format(new Date(ann.created_at), "PPP")}</span>
                      {ann.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Expires: {format(new Date(ann.expires_at), "PPP p")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ann.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-brand text-xl font-bold text-[#2b000a]">New Announcement</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. System Maintenance Scheduled"
                  required
                  className="mt-1 rounded-xl h-11"
                />
              </div>

              <div>
                <Label htmlFor="ann-message">Message</Label>
                <Textarea
                  id="ann-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message to hosts here..."
                  required
                  rows={4}
                  className="mt-1 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ann-priority">Priority</Label>
                  <select
                    id="ann-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="mt-1 block h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2"
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="ann-expiry">Expiry Date (Optional)</Label>
                  <Input
                    id="ann-expiry"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  id="ann-mandatory"
                  type="checkbox"
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#800020] focus:ring-[#800020]"
                />
                <Label htmlFor="ann-mandatory" className="cursor-pointer select-none">
                  Mark as Mandatory (Hosts cannot dismiss this announcement)
                </Label>
              </div>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-[#800020] text-white hover:bg-merlot font-bold"
                >
                  {saving ? "Creating..." : "Publish"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withdrawClaim } from "@/lib/claims";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing claim ID." }, { status: 400 });
  }

  try {
    await withdrawClaim(id, auth.user.id);
    return NextResponse.json({ ok: true, message: "Claim withdrawn successfully." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to withdraw claim.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

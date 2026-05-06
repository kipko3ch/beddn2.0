import { NextResponse } from "next/server";
import { confirmBooking, userCanManageBooking } from "@/lib/bookings/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, context: RouteContext<"/api/bookings/[id]/accept">) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user || !(await userCanManageBooking(data.user.id, id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const result = await confirmBooking(id, data.user.id);
  return NextResponse.json(result);
}

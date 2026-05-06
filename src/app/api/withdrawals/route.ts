import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminSms } from "@/lib/notifications/server";

interface WithdrawalBody {
  amount: number;
  currency: string;
  payoutMethod: string;
  payoutDetails: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as WithdrawalBody;
  const amount = Number(body.amount);
  if (!amount || amount <= 0 || !body.payoutMethod || !body.payoutDetails) {
    return NextResponse.json({ error: "Missing withdrawal details" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: host } = await admin
    .from("hosts")
    .select("id, name")
    .eq("user_id", data.user.id)
    .single();

  if (!host) {
    return NextResponse.json({ error: "Host profile not found" }, { status: 404 });
  }

  const { data: balances } = await admin
    .from("host_balances")
    .select("amount")
    .eq("host_id", host.id)
    .eq("currency", body.currency)
    .eq("status", "withdrawable");

  const withdrawable = (balances || []).reduce(
    (sum, item: { amount: number }) => sum + Number(item.amount),
    0
  );

  if (amount > withdrawable) {
    return NextResponse.json({ error: "Amount exceeds withdrawable balance" }, { status: 400 });
  }

  const { data: withdrawal, error } = await admin
    .from("withdrawals")
    .insert({
      host_id: host.id,
      amount,
      currency: body.currency,
      payout_method: body.payoutMethod,
      payout_details: body.payoutDetails,
      status: "requested",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await sendAdminSms(
    `Beddn withdrawal requested: ${body.currency} ${amount.toLocaleString()} by ${host.name}.`
  );

  return NextResponse.json({ id: withdrawal.id });
}

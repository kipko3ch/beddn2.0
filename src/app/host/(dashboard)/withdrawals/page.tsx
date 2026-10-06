"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/react";
import { EmptyState } from "@/components/empty-state";
import type { HostBalance, Withdrawal } from "@/lib/types";

export default function WithdrawalsPage() {
  const supabase = createClient();
  const [balances, setBalances] = useState<HostBalance[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KES");
  const [payoutMethod, setPayoutMethod] = useState("M-Pesa");
  const [payoutDetails, setPayoutDetails] = useState("");

  async function load() {
    const [balancesRes, withdrawalsRes] = await Promise.all([
      supabase.from("host_balances").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
    ]);
    setBalances((balancesRes.data as HostBalance[]) ?? []);
    setWithdrawals((withdrawalsRes.data as Withdrawal[]) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    return balances.reduce(
      (acc, balance) => {
        const key = `${balance.currency}:${balance.status}`;
        acc[key] = (acc[key] || 0) + Number(balance.amount);
        return acc;
      },
      {} as Record<string, number>
    );
  }, [balances]);

  async function requestWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    const response = await fetch("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        currency,
        payoutMethod,
        payoutDetails,
      }),
    });

    if (!response.ok) {
      alert("Could not request withdrawal.");
      return;
    }

    setAmount("");
    setPayoutDetails("");
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Withdrawals</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {["KES", "TZS", "USD"].map((code) => (
          <div key={code} className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">{code}</p>
            <p className="text-xl font-bold">
              {(totals[`${code}:withdrawable`] || 0).toLocaleString()} withdrawable
            </p>
            <p className="text-sm text-muted-foreground">
              {(totals[`${code}:held`] || 0).toLocaleString()} held
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={requestWithdrawal} className="border rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <Label>Amount</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="1" required />
        </div>
        <div>
          <Label>Currency</Label>
          <select className="w-full border rounded-md h-10 px-3" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option>KES</option>
            <option>TZS</option>
            <option>USD</option>
          </select>
        </div>
        <div>
          <Label>Payout method</Label>
          <Input value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)} required />
        </div>
        <div>
          <Label>Payout details</Label>
          <Input value={payoutDetails} onChange={(e) => setPayoutDetails(e.target.value)} placeholder="Phone or bank details" required />
        </div>
        <Button type="submit" className="bg-[#800020] hover:bg-[#600018]">
          Request
        </Button>
      </form>

      <div className="space-y-3">
        {withdrawals.length === 0 ? (
          <EmptyState
            image="/images/empty-withdrawals.png"
            title="No withdrawal requests yet"
            subtitle="Request a payout once you have a withdrawable balance."
            size="sm"
          />
        ) : (
          withdrawals.map((withdrawal) => {
            const isCompleted = withdrawal.status === "paid";
            const isPending = withdrawal.status === "requested" || withdrawal.status === "approved";
            return (
              <div
                key={withdrawal.id}
                className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs hover:border-[#f3cfd9] hover:shadow-sm transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#fbf0f3] text-[#800020] border border-[#f3cfd9]">
                      <Icon icon="solar:card-send-bold-duotone" className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-base text-[#2b000a]">
                          {withdrawal.currency} {Number(withdrawal.amount).toLocaleString()}
                        </span>
                        <Badge
                          className={`text-xs capitalize font-bold ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-800"
                              : isPending
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {withdrawal.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-2">
                        <span>via {withdrawal.payout_method}</span>
                        {withdrawal.payout_details && <span>· {withdrawal.payout_details}</span>}
                        {withdrawal.created_at && (
                          <span>· {new Date(withdrawal.created_at).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

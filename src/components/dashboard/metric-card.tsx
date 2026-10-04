"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  href?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  tone?: "burgundy" | "rose" | "emerald" | "amber" | "neutral";
  subtitle?: string;
}

const TONE_STYLES = {
  burgundy: {
    iconBg: "bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]/60",
    sparkColor: "#800020",
  },
  rose: {
    iconBg: "bg-rose-50 text-rose-600 border border-rose-200/60",
    sparkColor: "#e11d48",
  },
  emerald: {
    iconBg: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    sparkColor: "#059669",
  },
  amber: {
    iconBg: "bg-amber-50 text-amber-700 border border-amber-200/60",
    sparkColor: "#d97706",
  },
  neutral: {
    iconBg: "bg-stone-100 text-stone-700 border border-stone-200/60",
    sparkColor: "#78716c",
  },
};

export function MetricCard({
  label,
  value,
  icon,
  href,
  trend,
  tone = "burgundy",
  subtitle,
}: MetricCardProps) {
  const styles = TONE_STYLES[tone] || TONE_STYLES.burgundy;

  const content = (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-5 shadow-xs transition hover:border-[#800020]/30 hover:shadow-md">
      {/* Top row: Icon & Label */}
      <div className="flex items-center gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${styles.iconBg} shadow-2xs transition group-hover:scale-105`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold uppercase tracking-wider text-stone-500">{label}</p>
          {subtitle && <p className="truncate text-[11px] text-stone-400 mt-0.5">{subtitle}</p>}
        </div>
        {href && (
          <div className="text-stone-300 transition group-hover:text-[#800020] group-hover:translate-x-0.5">
            <ArrowUpRight className="size-4" />
          </div>
        )}
      </div>

      {/* Middle row: Big Metric Value */}
      <div className="mt-4 flex items-baseline justify-between gap-2">
        <p className="font-brand text-3xl sm:text-4xl font-black text-[#181113] tracking-tight">
          {value}
        </p>

        {/* Decorative mini spark wave */}
        <svg className="h-6 w-16 opacity-30 group-hover:opacity-60 transition" viewBox="0 0 60 20" fill="none">
          <path
            d="M0 16 Q 15 4, 30 12 T 60 4"
            stroke={styles.sparkColor}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Bottom row: Trend or contextual pill */}
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-bold ${
              trend.isNeutral
                ? "bg-stone-100 text-stone-600"
                : trend.isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {trend.isNeutral ? (
              <Minus className="size-3" />
            ) : trend.isPositive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {trend.value}
          </span>
          {trend.label && <span className="text-[11px] text-stone-500">{trend.label}</span>}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

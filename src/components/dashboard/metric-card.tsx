"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface MetricCardProps {
  label: string;
  value: string | number;
  prefix?: string;
  icon: ReactNode;
  href?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  tone?: "burgundy" | "rose" | "emerald" | "amber" | "teal" | "neutral";
  subtitle?: string;
}

const TONE_CONFIG = {
  burgundy: {
    iconBg: "bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]/70",
    stroke: "#800020",
    gradientId: "grad-burgundy",
    fillColor: "#800020",
    trendColor: "text-emerald-600",
  },
  rose: {
    iconBg: "bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]/70",
    stroke: "#9f1239",
    gradientId: "grad-rose",
    fillColor: "#9f1239",
    trendColor: "text-emerald-600",
  },
  emerald: {
    iconBg: "bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]/70",
    stroke: "#800020",
    gradientId: "grad-emerald",
    fillColor: "#800020",
    trendColor: "text-emerald-600",
  },
  amber: {
    iconBg: "bg-[#fbf7f8] text-[#2b000a] border border-stone-200/80",
    stroke: "#800020",
    gradientId: "grad-amber",
    fillColor: "#800020",
    trendColor: "text-emerald-600",
  },
  teal: {
    iconBg: "bg-[#fdf2f4] text-[#800020] border border-[#f9c8d4]/70",
    stroke: "#800020",
    gradientId: "grad-teal",
    fillColor: "#800020",
    trendColor: "text-emerald-600",
  },
  neutral: {
    iconBg: "bg-stone-50 text-stone-700 border border-stone-200/80",
    stroke: "#78716c",
    gradientId: "grad-neutral",
    fillColor: "#78716c",
    trendColor: "text-stone-600",
  },
};

export function MetricCard({
  label,
  value,
  prefix,
  icon,
  href,
  trend,
  tone = "burgundy",
  subtitle,
}: MetricCardProps) {
  const config = TONE_CONFIG[tone] || TONE_CONFIG.burgundy;

  const content = (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:border-[#800020]/30 hover:shadow-md">
      {/* Top Row: Icon container + Label */}
      <div className="flex items-center gap-2.5">
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${config.iconBg} shadow-2xs transition group-hover:scale-105`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-stone-600">{label}</p>
        </div>
        {href && (
          <div className="text-stone-300 transition group-hover:text-[#800020] group-hover:translate-x-0.5">
            <ArrowUpRight className="size-4" />
          </div>
        )}
      </div>

      {/* Middle Row: Big Bold Metric Value */}
      <div className="mt-4 flex items-baseline gap-1.5">
        {prefix && (
          <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
            {prefix}
          </span>
        )}
        <p className="font-brand text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          {value}
        </p>
      </div>

      {/* Bottom Row: Trend Percentage on Left + Smooth Area Wave Sparkline on Right */}
      <div className="mt-3 flex items-end justify-between gap-2">
        {trend ? (
          <div className="flex items-center gap-1 text-xs font-bold">
            <span
              className={
                trend.isNeutral
                  ? "text-stone-500"
                  : trend.isPositive
                  ? "text-emerald-600"
                  : "text-rose-600"
              }
            >
              {trend.value}
            </span>
            {trend.label && (
              <span className="text-[10px] font-normal text-stone-400 truncate max-w-[120px]">
                {trend.label}
              </span>
            )}
          </div>
        ) : subtitle ? (
          <p className="text-[11px] text-stone-400 truncate">{subtitle}</p>
        ) : <div />}

        {/* Smooth Area Wave Sparkline (matching Image 3) */}
        <div className="relative -mb-1 -mr-2 h-9 w-24 shrink-0 overflow-hidden">
          <svg className="h-full w-full" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.fillColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={config.fillColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path
              d="M0 38 Q 25 35, 45 22 T 85 10 T 100 6 L 100 40 L 0 40 Z"
              fill={`url(#${config.gradientId})`}
            />
            {/* Line stroke */}
            <path
              d="M0 38 Q 25 35, 45 22 T 85 10 T 100 6"
              fill="none"
              stroke={config.stroke}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

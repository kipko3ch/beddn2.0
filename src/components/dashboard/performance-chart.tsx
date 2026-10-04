"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  dateKey?: string;
}

export interface PerformanceChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  metricLabel?: string;
  summaryPills?: { label: string; value: string }[];
}

export function PerformanceChart({
  title,
  subtitle,
  data,
  metricLabel = "views",
  summaryPills = [],
}: PerformanceChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => d.value), 10);
  const roundedMax = Math.ceil(maxValue / 10) * 10;
  const gridSteps = [roundedMax, Math.round(roundedMax * 0.75), Math.round(roundedMax * 0.5), Math.round(roundedMax * 0.25), 0];

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div>
          <h3 className="font-brand text-xl font-bold text-[#181113]">{title}</h3>
          {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-stone-200/80 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
          <Calendar className="size-3.5 text-[#800020]" />
          <span>Timeline</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-6 h-64 sm:h-72 w-full pt-6">
        {/* Background Gridlines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pr-2">
          {gridSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-9 text-right text-[11px] font-mono text-stone-400">
                {step.toLocaleString()}
              </span>
              <div className="flex-1 border-b border-dashed border-stone-150" />
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div className="relative h-full pl-12 pr-4 pb-8 flex items-end justify-between gap-2 sm:gap-4">
          {data.map((item, idx) => {
            const heightPercent = Math.max((item.value / roundedMax) * 100, item.value > 0 ? 6 : 2);
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
              >
                {/* Tooltip */}
                {isHovered && (
                  <div className="absolute -top-12 z-20 whitespace-nowrap rounded-xl bg-[#2b000a] px-3 py-1.5 text-xs text-white shadow-xl animate-in fade-in zoom-in-95 pointer-events-none">
                    <p className="font-bold text-[#f9c8d4]">{item.label}</p>
                    <p className="font-mono text-white text-[13px] font-black">
                      {item.value.toLocaleString()} {metricLabel}
                    </p>
                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#2b000a]" />
                  </div>
                )}

                {/* Vertical Bar */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[48px] rounded-t-xl transition-all duration-300 ${
                    isHovered
                      ? "bg-gradient-to-t from-[#800020] via-[#a3193d] to-[#e8547b] shadow-md shadow-rose-950/20 scale-x-105"
                      : "bg-gradient-to-t from-[#800020]/90 to-[#b83858] hover:opacity-95"
                  }`}
                />

                {/* X-axis Label */}
                <span className="absolute -bottom-6 truncate max-w-full text-center text-[11px] font-bold text-stone-500 group-hover:text-[#800020] transition">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Summary Pills */}
      {summaryPills.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 border-t border-stone-100 pt-4">
          {summaryPills.map((pill, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 rounded-full bg-stone-50 border border-stone-200/80 px-3.5 py-1 text-xs text-stone-600"
            >
              <span className="font-medium text-stone-500">{pill.label}:</span>
              <strong className="font-bold text-[#800020]">{pill.value}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";

export interface ChartDataPoint {
  label: string;
  value: number;
  prefix?: string;
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
  metricLabel = "searches",
  summaryPills = [],
}: PerformanceChartProps) {
  // Default to selecting the highest or middle bar as active
  const maxIdx = data.reduce((maxI, el, i, arr) => (el.value > arr[maxI]?.value ? i : maxI), 0);
  const [activeIdx, setActiveIdx] = useState<number>(data.length > 2 ? 2 : maxIdx);

  const maxValue = Math.max(...data.map((d) => d.value), 10);
  const roundedMax = Math.ceil(maxValue / 10) * 10;
  const gridSteps = [
    roundedMax,
    Math.round(roundedMax * 0.75),
    Math.round(roundedMax * 0.5),
    Math.round(roundedMax * 0.25),
    0,
  ];

  const activeItem = data[activeIdx] || data[0];

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      {/* Header matching Image 3 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="font-brand text-lg font-bold text-stone-900">{title}</h3>
          {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-xl border border-stone-200/80 text-stone-500 hover:bg-stone-50 transition shadow-2xs"
          title="Filter date"
        >
          <Calendar className="size-4 text-stone-600" />
        </button>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-8 h-64 sm:h-72 w-full pt-10">
        {/* Background Gridlines & Y-axis labels */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pr-2">
          {gridSteps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="w-10 text-right text-[11px] font-mono text-stone-400">
                {step.toLocaleString()}
              </span>
              <div className="flex-1 border-b border-stone-100" />
            </div>
          ))}
        </div>

        {/* Bars Container */}
        <div className="relative h-full pl-14 pr-4 pb-8 flex items-end justify-between gap-3 sm:gap-6">
          {data.map((item, idx) => {
            const heightPercent = Math.max((item.value / roundedMax) * 100, item.value > 0 ? 8 : 3);
            const isActive = activeIdx === idx;

            return (
              <div
                key={idx}
                onClick={() => setActiveIdx(idx)}
                onMouseEnter={() => setActiveIdx(idx)}
                className="relative flex-1 flex flex-col items-center justify-end h-full cursor-pointer group"
              >
                {/* Floating Tooltip Card over active bar (matching Image 3) */}
                {isActive && (
                  <div className="absolute -top-12 z-20 flex flex-col items-center pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 shadow-md">
                      <span className="size-1.5 rounded-full bg-[#800020]" />
                      <span className="text-[11px] font-bold text-stone-700">{item.label}</span>
                      <span className="font-mono text-xs font-black text-stone-900">
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                    {/* Vertical indicator line pointing to the top of the bar */}
                    <div className="h-2 w-px bg-stone-300" />
                  </div>
                )}

                {/* Vertical Bar with Burgundy gradient */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full max-w-[56px] rounded-t-lg transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-b from-[#7a0020] via-[#941b3a] to-[#b32b4e] shadow-md shadow-[#800020]/20"
                      : "bg-gradient-to-b from-[#800020]/80 to-[#a32244]/80 opacity-85 hover:opacity-100"
                  }`}
                />

                {/* X-axis Label */}
                <span className="absolute -bottom-6 text-center text-xs font-medium text-stone-500 group-hover:text-stone-900 transition">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Summary Bar matching Image 3's grey pill bar */}
      {summaryPills.length > 0 && (
        <div className="mt-8 rounded-full bg-stone-100/90 px-4 py-2 flex flex-wrap items-center justify-around gap-2 text-xs font-semibold text-stone-600">
          {summaryPills.map((pill, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-stone-500">{pill.label}:</span>
              <span className="font-bold text-stone-900">{pill.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

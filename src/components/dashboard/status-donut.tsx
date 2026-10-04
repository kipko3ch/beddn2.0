"use client";

export interface StatusDonutSegment {
  label: string;
  count: number;
  color: string;
  bgColor?: string;
}

export interface StatusDonutProps {
  title: string;
  subtitle?: string;
  segments: StatusDonutSegment[];
  totalLabel?: string;
}

export function StatusDonut({
  title,
  subtitle,
  segments,
  totalLabel = "Total",
}: StatusDonutProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);

  // Calculate SVG arc strokes
  let accumulatedAngle = 0;
  const radius = 54;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs">
      {/* Header */}
      <div className="border-b border-stone-100 pb-4">
        <h3 className="font-brand text-xl font-bold text-[#181113]">{title}</h3>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Donut & Legend Container */}
      <div className="my-6 flex flex-col items-center justify-center gap-6">
        {/* SVG Ring */}
        <div className="relative flex size-44 items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 140 140">
            {/* Background circle track */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="transparent"
              stroke="#f5f1f2"
              strokeWidth={strokeWidth}
            />

            {/* Segments */}
            {total > 0 &&
              segments.map((seg, idx) => {
                const fraction = seg.count / total;
                const dashLength = fraction * circumference;
                const dashOffset = -accumulatedAngle * circumference;
                accumulatedAngle += fraction;

                return (
                  <circle
                    key={idx}
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dashLength} ${circumference}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                );
              })}
          </svg>

          {/* Center text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              {totalLabel}
            </span>
            <span className="font-brand text-3xl font-black text-[#2b000a] leading-none mt-1">
              {total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Legend Breakdown */}
        <div className="w-full space-y-2.5">
          {segments.map((seg, idx) => {
            const percent = total > 0 ? Math.round((seg.count / total) * 100) : 0;
            return (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="font-semibold text-stone-700">{seg.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-0.5">
                    {Array.from({ length: 12 }).map((_, barIdx) => (
                      <span
                        key={barIdx}
                        className="h-2 w-0.5 rounded-full"
                        style={{
                          backgroundColor:
                            barIdx < Math.round((percent / 100) * 12)
                              ? seg.color
                              : "#e7e2e4",
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-mono font-bold text-stone-900 w-12 text-right">
                    {seg.count} <span className="text-[10px] text-stone-400">({percent}%)</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

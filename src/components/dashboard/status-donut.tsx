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
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-brand text-lg font-bold text-stone-900">{title}</h3>
          {subtitle && <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* Donut & Legend Container */}
      <div className="my-6 flex flex-col items-center justify-center gap-6">
        {/* SVG Ring matching Image 3 */}
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
              {totalLabel}
            </span>
            <span className="font-brand text-2xl font-black text-stone-900 leading-none mt-1">
              {total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Legend Breakdown with Segmented Progress Ticks matching Image 3 */}
        <div className="w-full space-y-3 pt-2">
          {segments.map((seg, idx) => {
            const percent = total > 0 ? Math.round((seg.count / total) * 100) : 0;
            const activeTicks = Math.round((percent / 100) * 18);

            return (
              <div key={idx} className="flex items-center justify-between text-xs gap-3">
                <span className="font-semibold text-stone-700 w-24 truncate">{seg.label}</span>

                {/* Segmented Progress Ticks (||||||||||||||||||) */}
                <div className="flex-1 flex items-center justify-center gap-0.5">
                  {Array.from({ length: 18 }).map((_, barIdx) => (
                    <span
                      key={barIdx}
                      className="h-2.5 w-1 rounded-xs transition-colors"
                      style={{
                        backgroundColor: barIdx < activeTicks ? seg.color : "#f1ede0",
                      }}
                    />
                  ))}
                </div>

                {/* Count */}
                <span className="font-mono font-bold text-stone-900 w-12 text-right">
                  {seg.count.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

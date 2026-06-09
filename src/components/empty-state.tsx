import Image from "next/image";

/**
 * Standard empty-state block: a brand illustration, a title, an optional
 * subtitle, and optional action(s). Illustrations live in /public/images.
 */
export function EmptyState({
  image,
  title,
  subtitle,
  children,
  size = "md",
  className = "",
}: {
  image: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? 140 : 200;
  return (
    <div className={`flex flex-col items-center px-4 py-10 text-center ${className}`}>
      <Image
        src={image}
        alt=""
        width={dim}
        height={dim}
        className="mb-5 h-auto w-full max-w-full"
        style={{ width: dim }}
        aria-hidden
      />
      <p className="text-lg font-semibold text-[#2b000a]">{title}</p>
      {subtitle && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

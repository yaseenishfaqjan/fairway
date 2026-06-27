import { cn } from "@/lib/utils";
import logoUrl from "@/assets/fairway360-logo.png";

type Size = "sm" | "md" | "lg";
type Tone = "light" | "dark";

const HEIGHTS: Record<Size, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-20",
};

export function BrandLogo({
  size = "sm", tone = "dark", className,
}: { size?: Size; tone?: Tone; className?: string }) {
  const img = (
    <img
      src={logoUrl}
      alt="Fairway360 — AI Club Operation System"
      className={cn(HEIGHTS[size], "w-auto max-w-full")}
    />
  );

  // The logo artwork has a white/green wordmark meant for dark backgrounds.
  // On light surfaces (navbar, footer) sit it on a deep-forest badge so it stays legible.
  if (tone === "light") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-lg bg-[#04130c] px-3 py-2 shadow-sm",
          className,
        )}
      >
        {img}
      </span>
    );
  }

  return <span className={cn("inline-flex items-center", className)}>{img}</span>;
}

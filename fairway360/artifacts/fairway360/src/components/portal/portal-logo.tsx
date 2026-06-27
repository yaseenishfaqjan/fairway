import { BrandLogo } from "@/components/brand-logo";

interface PortalLogoProps {
  size?: "sm" | "lg";
  className?: string;
}

export function PortalLogo({ size = "sm", className }: PortalLogoProps) {
  return <BrandLogo size={size} tone="dark" className={className} />;
}

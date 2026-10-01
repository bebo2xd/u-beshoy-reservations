import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function BrandLogo({
  size = 48,
  className,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/brand/logo.png"
      alt="شعار كنيسة القديسة العذراء مريم والقديس مارمرقس الرسول"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  );
}

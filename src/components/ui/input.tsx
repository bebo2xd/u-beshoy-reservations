import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base text-foreground shadow-sm",
          "transition-[border-color,box-shadow,background-color] duration-200",
          "file:border-0 file:bg-transparent file:text-base file:font-medium",
          "placeholder:text-muted-foreground",
          "hover:border-primary/35",
          "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:shadow-[0_0_0_4px_rgba(2,132,199,0.16)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

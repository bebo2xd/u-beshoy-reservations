import * as React from "react";
import { cn } from "@/lib/utils";

/** Consistent label → control spacing across forms */
export function Field({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      {children}
    </div>
  );
}

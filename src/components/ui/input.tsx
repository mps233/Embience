import * as React from "react"

import { cn } from "@/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-base text-foreground backdrop-blur-md transition-all placeholder:text-white/50 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground hover:bg-white/15 hover:border-white/30 focus:border-glass-blue/60 focus:shadow-[0_0_0_3px_rgba(202,215,255,0.2),0_0_20px_rgba(202,215,255,0.3)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/8 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

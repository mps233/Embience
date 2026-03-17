import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-rainbow-pink/50 focus:ring-offset-2 backdrop-blur-lg",
  {
    variants: {
      variant: {
        default:
          "border-white/20 bg-gradient-to-r from-rainbow-pink/20 to-rainbow-yellow/20 hover:from-rainbow-pink/30 hover:to-rainbow-yellow/30",
        secondary:
          "border-white/15 bg-white/10 hover:bg-white/15",
        destructive:
          "border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30",
        outline: "text-foreground border-white/20 bg-white/5 hover:bg-white/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

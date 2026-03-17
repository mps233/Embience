import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "relative overflow-hidden border border-white/25 bg-white/15 text-white backdrop-blur-md hover:border-white/40 hover:shadow-glow-rainbow hover:-translate-y-0.5 focus-visible:shadow-[0_0_0_3px_rgba(202,215,255,0.4),0_0_20px_rgba(202,215,255,0.3)] dark:bg-white/10 dark:border-white/20 before:absolute before:inset-0 before:bg-rainbow-gradient before:opacity-20 before:transition-opacity hover:before:opacity-40",
        destructive:
          "relative overflow-hidden border border-red-400/30 bg-red-500/20 text-white backdrop-blur-md hover:bg-red-500/30 hover:border-red-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]",
        outline:
          "border border-white/20 bg-transparent text-foreground backdrop-blur-sm hover:bg-white/10 hover:border-white/30 dark:hover:bg-white/5",
        secondary:
          "border border-white/15 bg-white/5 text-foreground backdrop-blur-sm hover:bg-white/10 hover:border-white/25 dark:bg-white/3",
        ghost: "text-foreground hover:bg-white/10 hover:text-foreground dark:hover:bg-white/5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

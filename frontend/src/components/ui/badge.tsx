import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-slate-900 text-white dark:bg-indigo-600 shadow-xs",
        secondary:
          "border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
        destructive:
          "border-rose-200 dark:border-rose-800 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
        success:
          "border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
        warning:
          "border-amber-200 dark:border-amber-800 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
        info:
          "border-blue-200 dark:border-blue-800 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
        outline: "text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
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

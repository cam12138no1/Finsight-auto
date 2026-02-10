import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'profit' | 'loss'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantStyles = {
    default: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-muted text-muted-foreground border border-border/50',
    outline: 'border border-border bg-background text-foreground',
    destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
    profit: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
    loss: 'bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/40',
  }

  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
})
Badge.displayName = "Badge"

export { Badge }

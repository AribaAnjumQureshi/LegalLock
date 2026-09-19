import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  accent?: 'gold' | 'destructive' | 'success' | 'primary'
}) {
  const accentClass = {
    gold: 'text-gold-foreground bg-gold/15',
    destructive: 'text-destructive bg-destructive/10',
    success: 'text-success bg-success/10',
    primary: 'text-primary bg-primary/10',
  }[accent ?? 'primary']

  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <span className={cn('flex size-8 items-center justify-center rounded-sm', accentClass)}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-3 font-mono text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

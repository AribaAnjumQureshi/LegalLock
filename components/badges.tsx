import { cn } from '@/lib/utils'
import type {
  Role,
  Classification,
  DocStatus,
  ActivityEntry,
} from '@/lib/mock-data'

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  const styles: Record<Role, string> = {
    Admin: 'bg-primary/10 text-primary border-primary/25',
    Officer: 'bg-chart-2/10 text-chart-2 border-chart-2/25',
    Lawyer: 'bg-gold/15 text-gold-foreground border-gold/40',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold tracking-wide',
        styles[role],
        className,
      )}
    >
      <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden />
      {role}
    </span>
  )
}

export function ClassificationBadge({
  level,
  className,
}: {
  level: Classification
  className?: string
}) {
  const styles: Record<Classification, string> = {
    Unclassified: 'bg-muted text-muted-foreground border-border',
    Restricted: 'bg-gold/15 text-gold-foreground border-gold/40',
    Confidential: 'bg-destructive/10 text-destructive border-destructive/30',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider',
        styles[level],
        className,
      )}
    >
      {level}
    </span>
  )
}

export function StatusBadge({ status }: { status: DocStatus }) {
  const styles: Record<DocStatus, string> = {
    Sealed: 'bg-destructive/10 text-destructive',
    'In Review': 'bg-gold/15 text-gold-foreground',
    Released: 'bg-success/10 text-success',
    Archived: 'bg-muted text-muted-foreground',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium',
        styles[status],
      )}
    >
      <span className="inline-block size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  )
}

export function ResultBadge({ result }: { result: ActivityEntry['result'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold',
        result === 'Success'
          ? 'bg-success/10 text-success'
          : 'bg-destructive/10 text-destructive',
      )}
    >
      {result}
    </span>
  )
}

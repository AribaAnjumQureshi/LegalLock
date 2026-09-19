import { cn } from '@/lib/utils'

export function Seal({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Agency seal"
      fill="none"
    >
      <path
        d="M24 3 6 9v13c0 11.2 7.5 19.6 18 23 10.5-3.4 18-11.8 18-23V9L24 3Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M24 9 12 13v8.5c0 7.6 5 13.3 12 15.8 7-2.5 12-8.2 12-15.8V13L24 9Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeOpacity="0.5"
      />
      <path
        d="m24 15 2.02 4.1 4.52.66-3.27 3.19.77 4.5L24 29.32l-4.04 2.13.77-4.5-3.27-3.19 4.52-.66L24 15Z"
        fill="currentColor"
      />
    </svg>
  )
}

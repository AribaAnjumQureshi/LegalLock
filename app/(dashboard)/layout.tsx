import { Sidebar } from '@/components/sidebar'
import { AuthGuard } from '@/components/auth-guard'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard><div className="flex min-h-screen bg-background"><Sidebar/><div className="flex min-w-0 flex-1 flex-col">{children}</div></div></AuthGuard>
}

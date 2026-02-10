import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Sidebar from '@/components/dashboard/sidebar'
import Header from '@/components/dashboard/header'

/* MASTER.md Dashboard Page: max-width 1200px, full-width sections, centered content */

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/signin')

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:flex"><Sidebar /></div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header user={session.user!} />
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

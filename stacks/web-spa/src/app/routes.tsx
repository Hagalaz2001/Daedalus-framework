import { AppShell, EmptyState, Button, Skeleton } from '@app/ui'
import { Compass, Home, NotebookPen, Settings, User } from 'lucide-react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { ForgotPasswordScreen, SignInScreen, SignUpScreen, useAuthActions, useSession } from '@/features/auth'
import { DashboardScreen } from '@/features/dashboard'
import { NoteDetailScreen, NoteFormScreen, NotesListScreen } from '@/features/notes'
import { isOnboarded, OnboardingScreen } from '@/features/onboarding'
import { ProfileScreen } from '@/features/profile'
import { SettingsScreen } from '@/features/settings'
import { appName } from '@/shared/lib/config'
import { RouterLink } from '@/shared/ui'

const nav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/profile', label: 'Profile', icon: User },
]

function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-6">
      <EmptyState
        icon={<Compass />}
        title="Page not found"
        description="The link may be old, or the page moved."
        action={
          <Button asChild>
            <Link to="/">Back home</Link>
          </Button>
        }
      />
    </main>
  )
}

/** Signed-in area: redirects to sign-in, and sends brand-new users through onboarding once. */
function SignedIn() {
  const { user, isPending } = useSession()
  const { signOut } = useAuthActions()
  const { pathname } = useLocation()
  if (isPending)
    return (
      <div className="p-8" role="status">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-8 w-48" />
      </div>
    )
  if (!user) return <Navigate to="/sign-in" replace />
  if (!isOnboarded() && pathname !== '/welcome') return <Navigate to="/welcome" replace />
  if (pathname === '/welcome') return <Outlet />
  return (
    <AppShell brand={appName} nav={nav} currentPath={pathname} linkAs={RouterLink} user={{ name: user.name, email: user.email, profileHref: '/profile' }} onSignOut={() => void signOut()}>
      <Outlet />
    </AppShell>
  )
}

/** Public auth screens bounce signed-in users home. */
function SignedOut() {
  const { user, isPending } = useSession()
  if (!isPending && user) return <Navigate to="/" replace />
  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SignedOut />}>
        <Route path="/sign-in" element={<SignInScreen />} />
        <Route path="/sign-up" element={<SignUpScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      </Route>
      <Route element={<SignedIn />}>
        <Route path="/welcome" element={<OnboardingScreen />} />
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/notes" element={<NotesListScreen />} />
        <Route path="/notes/new" element={<NoteFormScreen />} />
        <Route path="/notes/:id" element={<NoteDetailScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

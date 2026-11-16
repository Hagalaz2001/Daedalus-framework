import { AppShell, Button, EmptyState, ErrorState, Skeleton } from '@app/ui'
import { Compass, Home, NotebookPen, Settings, User } from 'lucide-react'
import { Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { SignInScreen, useAuthActions, useSession } from '@/features/auth'
import { DashboardScreen } from '@/features/dashboard'
import { NoteDetailScreen, NoteFormScreen, NotesListScreen } from '@/features/notes'
import { ProfileScreen } from '@/features/profile'
import { SettingsScreen } from '@/features/settings'
import { appName } from '@/shared/lib/config'
import { RouterLink } from '@/shared/ui'
import { useNativeTheme } from './useNativeTheme'
import { useShortcuts } from './useShortcuts'

// Keep these in step with useShortcuts (Ctrl/Cmd + 1..4).
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
        description="That screen does not exist."
        action={
          <Button asChild>
            <Link to="/">Back home</Link>
          </Button>
        }
      />
    </main>
  )
}

/** Signed-in area: redirects to sign-in when there is no valid token. */
function SignedIn() {
  const { user, isPending, error, refetch } = useSession()
  const { signOut } = useAuthActions()
  const { pathname } = useLocation()
  useShortcuts()
  if (isPending)
    return (
      <div className="p-8" role="status">
        <span className="sr-only">Loading</span>
        <Skeleton className="h-8 w-48" />
      </div>
    )
  if (error)
    return (
      <main className="mx-auto grid min-h-dvh max-w-lg place-items-center px-6">
        <ErrorState message={error.message} onRetry={() => void refetch()} />
      </main>
    )
  if (!user) return <Navigate to="/sign-in" replace />
  return (
    <AppShell brand={appName} nav={nav} currentPath={pathname} linkAs={RouterLink} user={{ name: user.name, email: user.email, profileHref: '/profile' }} onSignOut={() => void signOut()}>
      <Outlet />
    </AppShell>
  )
}

/** The sign-in screen bounces signed-in users home. */
function SignedOut() {
  const { user, isPending } = useSession()
  if (!isPending && user) return <Navigate to="/" replace />
  return <Outlet />
}

export function AppRoutes() {
  useNativeTheme()
  return (
    <Routes>
      <Route element={<SignedOut />}>
        <Route path="/sign-in" element={<SignInScreen />} />
      </Route>
      <Route element={<SignedIn />}>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/notes" element={<NotesListScreen />} />
        <Route path="/notes/new" element={<NoteFormScreen />} />
        <Route path="/notes/:id" element={<NoteDetailScreen />} />
        <Route path="/notes/:id/edit" element={<NoteFormScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

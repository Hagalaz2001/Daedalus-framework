import { Avatar, Button, Card, CardContent, PageHeader, Skeleton, SkeletonGroup, TextField, toast } from '@app/ui'
import { LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useAuthActions, useSession } from '@/features/auth'

export function ProfileScreen() {
  const { user, isPending } = useSession()
  const { updateName, signOut } = useAuthActions()
  const [name, setName] = useState<string>()
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (isPending || !user)
    return (
      <SkeletonGroup label="Loading profile" className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-48" />
      </SkeletonGroup>
    )

  const current = name ?? user.name
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!current.trim()) return setNameError('Name cannot be empty.')
    setSaving(true)
    const error = await updateName(current)
    setSaving(false)
    setNameError(error)
    if (!error) toast.success('Profile updated')
  }

  return (
    <>
      <PageHeader
        title="Profile"
        actions={
          <Button variant="secondary" onClick={() => void signOut()}>
            <LogOut aria-hidden />
            Sign out
          </Button>
        }
      />
      <div className="max-w-xl">
        <Card>
          <CardContent>
            <div className="mb-6 flex items-center gap-4">
              <Avatar name={user.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-semibold">{user.name}</p>
                <p className="truncate text-text-muted">{user.email}</p>
              </div>
            </div>
            <form onSubmit={save} className="space-y-4" noValidate>
              <TextField label="Display name" value={current} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="name" />
              <Button type="submit" loading={saving} disabled={current.trim() === user.name}>
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

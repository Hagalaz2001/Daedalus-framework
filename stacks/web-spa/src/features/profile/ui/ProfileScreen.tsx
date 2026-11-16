import { Avatar, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger, PageHeader, Skeleton, SkeletonGroup, TextField, toast } from '@app/ui'
import { LogOut, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useAuthActions, useSession } from '@/features/auth'
import { canDelete, DELETE_PHRASE } from '../model/delete'

export function ProfileScreen() {
  const { user, isPending } = useSession()
  const { updateName, signOut, deleteAccount } = useAuthActions()
  const navigate = useNavigate()
  const [name, setName] = useState<string>()
  const [nameError, setNameError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [typed, setTyped] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const remove = async () => {
    setDeleting(true)
    const error = await deleteAccount()
    setDeleting(false)
    if (error) return setDeleteError(error)
    void navigate('/sign-in')
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
      <div className="max-w-xl space-y-8">
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

        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>Permanently removes your account and every note in it. This cannot be undone.</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog
              onOpenChange={() => {
                setTyped('')
                setDeleteError(null)
              }}
            >
              <DialogTrigger asChild>
                <Button variant="danger">
                  <Trash2 aria-hidden />
                  Delete my account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  Type <strong className="font-mono text-text">{DELETE_PHRASE}</strong> to confirm.
                </DialogDescription>
                <div className="mt-4">
                  <TextField label="Confirmation" value={typed} onChange={(e) => setTyped(e.target.value)} error={deleteError} autoComplete="off" />
                </div>
                <DialogFooter>
                  <Button variant="danger" disabled={!canDelete(typed)} loading={deleting} onClick={remove}>
                    Delete forever
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

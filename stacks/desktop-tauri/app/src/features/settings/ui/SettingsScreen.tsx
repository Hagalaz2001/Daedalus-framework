import { Card, CardContent, PageHeader, SegmentedControl, useTheme, type ThemeChoice } from '@app/ui'
import { Monitor, Moon, Sun } from 'lucide-react'
import { apiBaseUrl } from '@/shared/api'

const themes = [
  { value: 'light', label: <><Sun className="size-4" aria-hidden />Light</> },
  { value: 'dark', label: <><Moon className="size-4" aria-hidden />Dark</> },
  { value: 'system', label: <><Monitor className="size-4" aria-hidden />System</> },
]

export function SettingsScreen() {
  const { choice, setTheme } = useTheme()

  return (
    <>
      <PageHeader title="Settings" description="How the app looks and where it connects." />
      <div className="max-w-xl space-y-6">
        <Card>
          <CardContent className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Theme</h2>
            <p className="text-sm text-text-muted">System follows Windows, macOS or your desktop and changes with it.</p>
            <SegmentedControl label="Theme" value={choice} onValueChange={(v) => setTheme(v as ThemeChoice)} options={themes} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1">
            <h2 className="font-display text-lg font-semibold">Server</h2>
            <p className="text-sm text-text-muted">The backend this build talks to. Set it with VITE_API_BASE_URL when you build.</p>
            <p className="pt-2 font-mono text-sm">{apiBaseUrl}</p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

import { Card, CardContent, PageHeader, SegmentedControl, Switch, Tabs, TabsContent, TabsList, TabsTrigger, useTheme, type ThemeChoice } from '@app/ui'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useStoredState } from '@/shared/lib/storage'

const themes = [
  { value: 'light', label: <><Sun className="size-4" aria-hidden />Light</> },
  { value: 'dark', label: <><Moon className="size-4" aria-hidden />Dark</> },
  { value: 'system', label: <><Monitor className="size-4" aria-hidden />System</> },
]

export function SettingsScreen() {
  const { choice, setTheme } = useTheme()
  // Local preferences. Persist them per user through the API once the contract has a settings resource.
  const [prefs, setPrefs] = useStoredState('prefs', { weekly: true, product: false })

  return (
    <>
      <PageHeader title="Settings" description="How the app looks and what it tells you about." />
      <Tabs defaultValue="appearance">
        <TabsList aria-label="Settings sections">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="appearance">
          <Card>
            <CardContent className="space-y-3">
              <h2 className="font-display text-lg font-semibold">Theme</h2>
              <p className="text-sm text-text-muted">System follows your device and changes with it.</p>
              <SegmentedControl label="Theme" value={choice} onValueChange={(v) => setTheme(v as ThemeChoice)} options={themes} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardContent className="divide-y divide-border">
              <Switch
                label="Weekly summary"
                description="One email on Monday with what you wrote last week."
                checked={prefs.weekly}
                onCheckedChange={(weekly) => setPrefs({ ...prefs, weekly })}
              />
              <Switch
                label="Product news"
                description="New features, rarely."
                checked={prefs.product}
                onCheckedChange={(product) => setPrefs({ ...prefs, product })}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}

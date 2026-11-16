'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeChoice } from '../lib/theme'
import { IconButton } from './button'

const order: ThemeChoice[] = ['system', 'light', 'dark']
const icons = { system: <Monitor />, light: <Sun />, dark: <Moon /> }

/** Cycles system -> light -> dark. The label always says what the next press does. */
export function ThemeToggle({ className }: { className?: string }) {
  const { choice, setTheme } = useTheme()
  const next = order[(order.indexOf(choice) + 1) % order.length]!
  return <IconButton className={className} icon={icons[choice]} label={`Theme: ${choice}. Switch to ${next}`} onClick={() => setTheme(next)} />
}

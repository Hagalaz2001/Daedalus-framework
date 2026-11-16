import { Button } from '@app/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { QuickNote } from '@/features/notes'
import { steps } from '../model/steps'
import { useOnboarded } from '../state/useOnboarded'

export function OnboardingScreen() {
  const [index, setIndex] = useState(0)
  const [, setOnboarded] = useOnboarded()
  const navigate = useNavigate()
  const step = steps[index]!
  const last = index === steps.length - 1

  const finish = () => {
    setOnboarded(true)
    void navigate('/')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <ol className="mb-10 flex gap-2" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s.id} aria-current={i === index ? 'step' : undefined} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-primary' : 'bg-border'}`}>
            <span className="sr-only">{`Step ${i + 1} of ${steps.length}: ${s.title}`}</span>
          </li>
        ))}
      </ol>
      <h1 className="font-display text-4xl font-semibold tracking-tight">{step.title}</h1>
      <p className="mt-3 text-lg text-text-muted">{step.body}</p>
      {step.id === 'first' && (
        <div className="mt-8">
          <QuickNote placeholder="Try: Buy oat milk" onCreated={() => setIndex(index + 1)} />
        </div>
      )}
      <div className="mt-10 flex items-center gap-3">
        {step.id !== 'first' && (
          <Button size="lg" onClick={last ? finish : () => setIndex(index + 1)}>
            {last ? 'Go to my notes' : 'Continue'}
          </Button>
        )}
        {step.id === 'first' && (
          <Button variant="ghost" onClick={() => setIndex(index + 1)}>
            Skip for now
          </Button>
        )}
        {!last && step.id !== 'first' && (
          <Button variant="ghost" onClick={finish}>
            Skip intro
          </Button>
        )}
      </div>
    </main>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { Session } from '../types'
import type { UserProfile } from '../types'

const HIGHLIGHT_TYPES = ['Keynote', 'Fireside Chat', 'Panel', 'Talk', 'Tutorial', 'Training Lab']

function TypePill({ type, count }: { type: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/50 rounded-full px-3 py-1 text-xs text-zinc-300">
      {type}
      <span className="text-zinc-500">{count}</span>
    </span>
  )
}

function FeaturedCard({ session }: { session: Session }) {
  const isKeynote = session.type === 'Keynote'
  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isKeynote
          ? 'border-nv/40 bg-nv-muted shadow-lg shadow-nv/5'
          : 'border-zinc-700/50 bg-zinc-900/60 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isKeynote
              ? 'bg-nv/20 text-nv'
              : 'bg-zinc-700/60 text-zinc-400'
          }`}
        >
          {session.type}
        </span>
        {session.featured && !isKeynote && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
            Featured
          </span>
        )}
      </div>
      <h3 className={`font-semibold leading-snug ${isKeynote ? 'text-base text-nv' : 'text-sm text-zinc-200'}`}>
        {session.title}
      </h3>
      {session.speakers.length > 0 && (
        <p className="text-xs text-zinc-400 mt-1.5">
          {session.speakers.map((sp) => sp.name).join(', ')}
          {session.speakers[0]?.company && (
            <span className="text-zinc-500"> · {session.speakers[0].company}</span>
          )}
        </p>
      )}
      {session.schedule[0] && (
        <p className="text-xs text-zinc-500 mt-1">
          {session.schedule[0].day} · {session.schedule[0].startTime}
          {session.schedule[0].room && ` · ${session.schedule[0].room}`}
        </p>
      )}
    </div>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300 ${
            i === current ? 'w-6 bg-nv' : i < current ? 'w-2 bg-nv/40' : 'w-2 bg-zinc-700'
          }`}
        />
      ))}
    </div>
  )
}

export function Onboarding({ onComplete }: { onComplete: (p: UserProfile) => void }) {
  const [step, setStep] = useState(0)
  const [sessions, setSessions] = useState<Session[]>([])
  const [form, setForm] = useState<UserProfile>({
    name: '',
    role: '',
    company: '',
    industry: '',
    interests: '',
    experience: 'intermediate',
  })

  useEffect(() => {
    fetch('/sessions.json')
      .then((r) => r.json())
      .then(setSessions)
  }, [])

  const stats = useMemo(() => {
    const types: Record<string, number> = {}
    sessions.forEach((s) => (types[s.type] = (types[s.type] || 0) + 1))
    return { total: sessions.length, featured: sessions.filter((s) => s.featured).length, types }
  }, [sessions])

  const featured = useMemo(
    () =>
      sessions
        .filter((s) => s.featured)
        .sort((a, b) => {
          if (a.type === 'Keynote') return -1
          if (b.type === 'Keynote') return 1
          const order = ['Fireside Chat', 'Panel', 'Talk']
          return order.indexOf(a.type) - order.indexOf(b.type)
        })
        .slice(0, 6),
    [sessions]
  )

  const set = (key: keyof UserProfile, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete({ ...form, name: form.name || 'Attendee' })
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-nv/10 border border-nv/20 rounded-full px-4 py-1.5 mb-4">
            <div className="h-1.5 w-1.5 rounded-full bg-nv animate-pulse" />
            <span className="text-xs font-medium text-nv">March 16–21, 2026 · San Jose</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-nv">GTC</span> 2026
          </h1>
          <p className="text-zinc-500 mt-1 text-sm">Your AI-powered session advisor</p>
        </div>

        {/* Step 0: Session teaser */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Stats row */}
            <div className="flex items-center justify-center gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-zinc-100">{stats.total}</div>
                <div className="text-xs text-zinc-500">Sessions</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <div className="text-2xl font-bold text-yellow-400">{stats.featured}</div>
                <div className="text-xs text-zinc-500">Featured</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <div className="text-2xl font-bold text-zinc-100">6</div>
                <div className="text-xs text-zinc-500">Days</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div>
                <div className="text-2xl font-bold text-zinc-100">{Object.keys(stats.types).length}</div>
                <div className="text-xs text-zinc-500">Session Types</div>
              </div>
            </div>

            {/* Type pills */}
            <div className="flex flex-wrap justify-center gap-1.5">
              {HIGHLIGHT_TYPES.map((t) =>
                stats.types[t] ? <TypePill key={t} type={t} count={stats.types[t]} /> : null
              )}
              <span className="inline-flex items-center text-xs text-zinc-500 px-2">
                +{Object.keys(stats.types).length - HIGHLIGHT_TYPES.filter((t) => stats.types[t]).length} more
              </span>
            </div>

            {/* Featured sessions */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Don't miss
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {featured.map((s) => (
                  <FeaturedCard key={s.id} session={s} />
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full bg-nv hover:bg-nv-dim text-zinc-950 font-medium py-2.5 rounded-lg transition cursor-pointer"
            >
              Personalize my experience
            </button>
            <p className="text-center text-xs text-zinc-600">
              Tell us a bit about yourself and our AI advisor will curate sessions just for you.
            </p>
          </div>
        )}

        {/* Step 1: Profile form */}
        {step === 1 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
            <div className="mb-2">
              <h2 className="text-lg font-semibold text-zinc-200">A little about you</h2>
              <p className="text-sm text-zinc-500 mt-0.5">
                This helps the AI advisor tailor recommendations to your background.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Your name"
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Job title</span>
                <input
                  type="text"
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  placeholder="e.g. ML Engineer"
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Company</span>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => set('company', e.target.value)}
                  placeholder="Where you work"
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-zinc-400">Industry</span>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => set('industry', e.target.value)}
                  placeholder="e.g. healthcare, robotics"
                  className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">Topics you're interested in</span>
              <input
                type="text"
                value={form.interests}
                onChange={(e) => set('interests', e.target.value)}
                placeholder="e.g. agentic AI, CUDA, LLMs, computer vision"
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-zinc-400">Experience level</span>
              <select
                value={form.experience}
                onChange={(e) => set('experience', e.target.value)}
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 rounded-lg transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-[2] bg-nv hover:bg-nv-dim text-zinc-950 font-medium py-2.5 rounded-lg transition cursor-pointer"
              >
                Launch advisor
              </button>
            </div>
          </form>
        )}

        {/* Step indicator */}
        <div className="flex justify-center mt-6">
          <StepIndicator current={step} total={2} />
        </div>
      </div>
    </div>
  )
}

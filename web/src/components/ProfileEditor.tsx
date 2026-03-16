import { useState } from 'react'
import type { UserProfile } from '../types'

export function ProfileEditor({
  profile,
  onSave,
  onClose,
  onReset,
}: {
  profile: UserProfile
  onSave: (p: UserProfile) => void
  onClose: () => void
  onReset: () => void
}) {
  const [form, setForm] = useState<UserProfile>({ ...profile })
  const set = (key: keyof UserProfile, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ ...form, name: form.name || 'Attendee' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-200">Edit Profile</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Your name"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">Job title</span>
              <input
                type="text"
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="e.g. ML Engineer"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">Company</span>
              <input
                type="text"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Where you work"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">Industry</span>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                placeholder="e.g. healthcare, robotics"
                className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
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
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-zinc-400">Experience level</span>
            <select
              value={form.experience}
              onChange={(e) => set('experience', e.target.value)}
              className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-nv hover:bg-nv-dim text-zinc-950 font-medium py-2 rounded-lg transition text-sm cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-lg transition text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="w-full text-[11px] text-zinc-600 hover:text-red-400 transition pt-1 cursor-pointer"
          >
            Reset profile &amp; start over
          </button>
        </form>
      </div>
    </div>
  )
}

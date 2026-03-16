import { useEffect, useMemo, useState } from 'react'
import type { Session, Party } from '../types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const SESSION_TYPES = [
  'Keynote', 'Talk', 'Panel', 'Tutorial', 'Training Lab', 'Full-Day Workshop',
  'Fireside Chat', 'Lightning Talk', 'Theater Talk', 'Posters',
  'Connect With the Experts', 'Watch Party', 'Certification', 'Hackathon',
]

type Tab = 'sessions' | 'parties'

export function EventsPanel({
  selectedSessionId,
  onSelectSession,
  selectedPartyId,
  onSelectParty,
}: {
  selectedSessionId: string | null
  onSelectSession: (session: Session) => void
  selectedPartyId: string | null
  onSelectParty: (party: Party) => void
}) {
  const [tab, setTab] = useState<Tab>('sessions')

  const [sessions, setSessions] = useState<Session[]>([])
  const [parties, setParties] = useState<Party[]>([])

  const [search, setSearch] = useState('')
  const [day, setDay] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    fetch('/sessions.json').then((r) => r.json()).then(setSessions)
    fetch('/parties.json').then((r) => r.json()).then(setParties)
  }, [])

  // Reset type filter when switching tabs
  useEffect(() => { setType('') }, [tab])

  const filteredSessions = useMemo(() => {
    let result = sessions
    if (day) result = result.filter((s) => s.schedule.some((t) => t.day === day))
    if (type) result = result.filter((s) => s.type === type)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.abstract.toLowerCase().includes(q) ||
          s.speakers.some(
            (sp) => sp.name.toLowerCase().includes(q) || sp.company.toLowerCase().includes(q)
          )
      )
    }
    return result
  }, [sessions, search, day, type])

  const filteredParties = useMemo(() => {
    let result = parties
    if (day) result = result.filter((p) => p.day === day)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sponsors.some((s) => s.toLowerCase().includes(q)) ||
          p.location.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      )
    }
    return result
  }, [parties, day, search])

  const groupedParties = useMemo(() => {
    const groups: Record<string, Party[]> = {}
    for (const p of filteredParties) {
      const key = `${p.day} — ${p.date}`
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    }
    return groups
  }, [filteredParties])


  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-zinc-800 shrink-0">
        <button
          onClick={() => setTab('sessions')}
          className={`flex-1 text-xs font-medium py-2 transition cursor-pointer ${
            tab === 'sessions'
              ? 'text-nv border-b-2 border-nv'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Sessions
          <span className="ml-1 text-[10px] text-zinc-600">({sessions.length})</span>
        </button>
        <button
          onClick={() => setTab('parties')}
          className={`flex-1 text-xs font-medium py-2 transition cursor-pointer ${
            tab === 'parties'
              ? 'text-nv border-b-2 border-nv'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          After Parties
          <span className="ml-1 text-[10px] text-zinc-600">({parties.length})</span>
        </button>
      </div>

      {/* Filters */}
      <div className="p-3 space-y-2 border-b border-zinc-800">
        <input
          type="text"
          placeholder={tab === 'sessions' ? 'Search sessions...' : 'Search parties, sponsors...'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700/50 rounded-lg px-3 py-1.5 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-nv/50 focus:border-nv/50"
        />
        <div className="flex gap-1.5">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700/50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-nv/50"
          >
            <option value="">All days</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {tab === 'sessions' && (
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="flex-1 bg-zinc-900 border border-zinc-700/50 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-nv/50"
            >
              <option value="">All types</option>
              {SESSION_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
        <div className="text-[11px] text-zinc-500">
          {tab === 'sessions' ? `${filteredSessions.length} sessions` : `${filteredParties.length} events`}
        </div>
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'sessions' ? (
          filteredSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSession(s)}
              className={`w-full text-left px-3 py-3 border-b border-zinc-800/50 transition cursor-pointer active:bg-zinc-800/60 ${
                selectedSessionId === s.id
                  ? 'bg-zinc-800/80 border-l-2 border-l-nv'
                  : 'hover:bg-zinc-900/80 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`text-sm leading-snug line-clamp-2 ${
                      selectedSessionId === s.id ? 'text-zinc-100 font-medium' : 'text-zinc-300'
                    }`}
                  >
                    {s.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                      {s.type}
                    </span>
                    {s.featured && (
                      <span className="text-[10px] bg-yellow-900/60 text-yellow-400 px-1.5 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                  </div>
                  {s.speakers.length > 0 && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      {s.speakers.map((sp) => sp.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right text-[11px] text-zinc-600 shrink-0 pt-0.5">
                  {s.schedule[0] && (
                    <>
                      <div>{s.schedule[0].day.slice(0, 3)}</div>
                      <div>{s.schedule[0].startTime}</div>
                    </>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          Object.entries(groupedParties).map(([label, items]) => (
            <div key={label}>
              <div className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm px-3 py-1.5 border-b border-zinc-800">
                <span className="text-[11px] font-medium text-zinc-400">{label}</span>
              </div>
              {items.map((p) => (
                <div
                  key={p.id}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-900/80 active:bg-zinc-800/60 transition cursor-pointer ${selectedPartyId === p.id ? 'bg-zinc-800/80 border-l-2 border-l-nv' : ''}`}
                  onClick={() => onSelectParty(p)}
                >
                  <div className="px-3 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm text-zinc-200 leading-snug line-clamp-2">{p.title}</h3>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {p.sponsors.map((s) => (
                            <span key={s} className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                              {s}
                            </span>
                          ))}
                          {p.inviteOnly && (
                            <span className="text-[10px] bg-purple-900/50 text-purple-400 px-1.5 py-0.5 rounded">
                              Invite Only
                            </span>
                          )}
                        </div>
                        {p.location !== 'Register to See Address' && p.location.indexOf('upon') === -1 && (
                          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{p.location}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 pt-0.5">
                        <div className="text-[11px] text-zinc-500">{p.time}</div>
                        <a
                          href={p.rsvpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-nv hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          RSVP →
                        </a>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Attribution for parties */}
      {tab === 'parties' && (
        <div className="px-3 py-1.5 border-t border-zinc-800 shrink-0">
          <span className="text-[10px] text-zinc-600">
            via{' '}
            <a href="https://conferenceparties.com/nvidia26/" target="_blank" rel="noopener noreferrer" className="text-nv/70 hover:text-nv">
              conferenceparties.com
            </a>
          </span>
        </div>
      )}
    </div>
  )
}

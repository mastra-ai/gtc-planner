import type { Party } from '../types'

export function PartyDetail({ party }: { party: Party }) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-[11px] bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded-full">
            After Party
          </span>
          {party.inviteOnly && (
            <span className="text-[11px] bg-yellow-900/60 text-yellow-400 px-2 py-0.5 rounded-full">
              Invite Only
            </span>
          )}
        </div>
        <h2 className="text-base font-semibold text-zinc-100 leading-snug">{party.title}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Schedule & Location */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-nv shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-zinc-200">
              {party.day}, {party.date}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-nv shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-zinc-200">{party.time}</span>
          </div>
          {party.location && (
            <div className="flex items-start gap-2">
              <svg className="w-3.5 h-3.5 text-nv shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-zinc-200">{party.location}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {party.description && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              About
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{party.description}</p>
          </div>
        )}

        {/* Sponsors */}
        {party.sponsors.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              {party.sponsors.length === 1 ? 'Host' : 'Hosts'}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {party.sponsors.map((s) => (
                <span key={s} className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* RSVP */}
        <div className="pt-2">
          <a
            href={party.rsvpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-nv text-zinc-950 text-sm font-medium px-4 py-2 rounded-lg hover:bg-nv-dim transition"
          >
            RSVP
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}

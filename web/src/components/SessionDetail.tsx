import type { Session } from '../types'

export function SessionDetail({ session }: { session: Session }) {
  const sched = session.schedule[0]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs font-mono text-nv">{session.code}</span>
          <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            {session.type}
          </span>
          {session.featured && (
            <span className="text-[11px] bg-yellow-900/60 text-yellow-400 px-2 py-0.5 rounded-full">
              Featured
            </span>
          )}
          {session.lengthMinutes > 0 && (
            <span className="text-[11px] text-zinc-500">{session.lengthMinutes} min</span>
          )}
        </div>
        <h2 className="text-base font-semibold text-zinc-100 leading-snug">{session.title}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Schedule */}
        {sched && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-nv shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-zinc-200">
                {sched.day}, {sched.date?.replace(/^[^,]+,\s*/, '') || ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-nv shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-zinc-200">
                {sched.startTime} – {sched.endTime}
              </span>
            </div>
            {sched.room && (
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-nv shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-zinc-200">{sched.room}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-nv shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-zinc-300">{session.viewingExperience}</span>
            </div>
          </div>
        )}

        {/* Abstract */}
        {session.abstract && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              About
            </h3>
            <div
              className="text-sm text-zinc-300 leading-relaxed [&_p]:mb-2 [&_strong]:font-semibold [&_strong]:text-zinc-200 [&_a]:text-nv [&_a:hover]:underline [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4"
              dangerouslySetInnerHTML={{ __html: session.abstract }}
            />
          </div>
        )}

        {/* Speakers */}
        {session.speakers.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              {session.speakers.length === 1 ? 'Speaker' : 'Speakers'}
            </h3>
            <div className="space-y-2.5">
              {session.speakers.map((sp) => (
                <div key={sp.name} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-400 shrink-0">
                    {sp.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{sp.name}</div>
                    {(sp.jobTitle || sp.company) && (
                      <div className="text-xs text-zinc-500">
                        {sp.jobTitle}
                        {sp.jobTitle && sp.company && ', '}
                        {sp.company}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-2 pt-2">
          {session.language && (
            <span className="text-[11px] bg-zinc-800/60 text-zinc-500 px-2 py-0.5 rounded-full">
              {session.language}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function SessionDetailEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-2 p-6">
      <svg className="w-10 h-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p className="text-sm text-zinc-500">Select a session or party to view details</p>
    </div>
  )
}

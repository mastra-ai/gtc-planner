import { useState, useCallback } from 'react'
import type { UserProfile, Session, Party, ItineraryItem } from './types'
import { Onboarding } from './components/Onboarding'
import { EventsPanel } from './components/EventsPanel'
import { SessionDetail, SessionDetailEmpty } from './components/SessionDetail'
import { PartyDetail } from './components/PartyDetail'
import { Chat } from './components/Chat'
import { ProfileEditor } from './components/ProfileEditor'

const PROFILE_KEY = 'gtc-profile'
const ITINERARY_KEY = 'gtc-itinerary'

function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function loadItinerary(): ItineraryItem[] {
  try {
    const raw = localStorage.getItem(ITINERARY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

type MobileTab = 'events' | 'detail' | 'chat'

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(loadProfile)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [detailType, setDetailType] = useState<'session' | 'party'>('session')
  const [mobileTab, setMobileTab] = useState<MobileTab>('events')
  const [showProfile, setShowProfile] = useState(false)
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(loadItinerary)

  const handleProfile = (p: UserProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p))
    setProfile(p)
  }

  const handleItineraryChange = useCallback((items: ItineraryItem[]) => {
    setItinerary(items)
    localStorage.setItem(ITINERARY_KEY, JSON.stringify(items))
  }, [])

  const handleRemoveFromItinerary = useCallback((id: string) => {
    setItinerary((prev) => {
      const next = prev.filter((item) => item.id !== id)
      localStorage.setItem(ITINERARY_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const handleSelectSession = (s: Session) => {
    setSelectedSession(s)
    setDetailType('session')
    setMobileTab('detail')
  }

  const handleSelectParty = (p: Party) => {
    setSelectedParty(p)
    setDetailType('party')
    setMobileTab('detail')
  }

  if (!profile) {
    return <Onboarding onComplete={handleProfile} />
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-3 sm:px-4 py-2 sm:py-2.5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <h1 className="text-sm sm:text-base font-bold tracking-tight">
            <span className="text-nv">GTC</span>{' '}
            <span className="text-zinc-300">2026</span>
          </h1>
          <span className="text-[11px] text-zinc-600 hidden sm:inline">Session Advisor</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
          >
            <span className="truncate max-w-[120px] sm:max-w-[200px]">
              {profile.name}
              {profile.role && <span className="text-zinc-600 hidden sm:inline"> · {profile.role}</span>}
            </span>
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732Z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Events (Sessions + Parties) — desktop always, mobile conditional */}
        <div className={`lg:w-[340px] lg:shrink-0 lg:border-r border-zinc-800 overflow-hidden
          ${mobileTab === 'events' ? 'w-full' : 'hidden'} lg:block`}
        >
          <EventsPanel selectedSessionId={selectedSession?.id ?? null} onSelectSession={handleSelectSession} selectedPartyId={selectedParty?.id ?? null} onSelectParty={handleSelectParty} />
        </div>

        {/* Session detail — desktop always, mobile conditional */}
        <div className={`lg:w-[340px] lg:shrink-0 lg:border-r border-zinc-800 overflow-hidden bg-zinc-950
          ${mobileTab === 'detail' ? 'w-full' : 'hidden'} lg:block`}
        >
          {detailType === 'party' && selectedParty ? (
            <PartyDetail party={selectedParty} />
          ) : selectedSession ? (
            <SessionDetail session={selectedSession} />
          ) : (
            <SessionDetailEmpty />
          )}
        </div>

        {/* Chat (with itinerary tab) — single instance, desktop always, mobile conditional */}
        <div className={`lg:flex-1 lg:min-w-0 overflow-hidden
          ${mobileTab === 'chat' ? 'w-full' : 'hidden'} lg:block`}
        >
          <Chat profile={profile} itinerary={itinerary} onItineraryChange={handleItineraryChange} onRemoveItineraryItem={handleRemoveFromItinerary} />
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden flex border-t border-zinc-800 shrink-0 bg-zinc-950">
        <TabButton
          active={mobileTab === 'events'}
          onClick={() => setMobileTab('events')}
          label="Browse"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          }
        />
        <TabButton
          active={mobileTab === 'detail'}
          onClick={() => setMobileTab('detail')}
          label="Detail"
          badge={!!selectedSession}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          }
        />
        <TabButton
          active={mobileTab === 'chat'}
          onClick={() => setMobileTab('chat')}
          label="nemo"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          }
        />
      </nav>

      {/* Built with Mastra */}
      <div className="flex items-center justify-center py-1 border-t border-zinc-800/50">
        <a
          href="https://mastra.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-600 hover:text-zinc-400 transition flex items-center gap-1"
        >
          Built with <span className="font-semibold">Mastra</span>
        </a>
      </div>

      {/* Profile editor modal */}
      {showProfile && (
        <ProfileEditor
          profile={profile}
          onSave={(p) => {
            handleProfile(p)
            setShowProfile(false)
          }}
          onClose={() => setShowProfile(false)}
          onReset={() => {
            localStorage.removeItem(PROFILE_KEY)
            setProfile(null)
            setShowProfile(false)
          }}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
  badge?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition relative cursor-pointer ${
        active ? 'text-nv' : 'text-zinc-500'
      }`}
    >
      <div className="relative">
        {icon}
        {badge && (
          <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-nv" />
        )}
      </div>
      <span className="text-[10px]">{label}</span>
    </button>
  )
}

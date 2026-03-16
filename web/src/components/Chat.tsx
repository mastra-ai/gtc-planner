import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UserProfile, ItineraryItem } from '../types'

type ChatTab = 'chat' | 'plan'

const DAY_ORDER: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5,
}

const MODELS = [
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron Super 120B' },
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron Nano 30B' },
]

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4111'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anon'
}

/** Convert stored memory messages to UIMessage format for chat hydration */
function convertStoredMessages(raw: Array<Record<string, unknown>>): UIMessage[] {
  const KEEP_TYPES = new Set(['text', 'tool-invocation'])
  const merged: UIMessage[] = []

  for (const m of raw) {
    const role = m.role as 'user' | 'assistant'
    if (role !== 'user' && role !== 'assistant') continue

    const content = m.content as { parts?: Array<{ type: string; text?: string; [k: string]: unknown }> } | undefined
    const storedParts = content?.parts ?? []

    // Filter to renderable parts only
    const parts = storedParts
      .filter((p) => KEEP_TYPES.has(p.type))
      .map((p) => {
        if (p.type === 'text') return { type: 'text' as const, text: p.text ?? '' }
        // tool-invocation: pass through as-is
        return p as UIMessage['parts'][number]
      })
      .filter((p) => p.type !== 'text' || (p as { text: string }).text.trim() !== '')

    if (parts.length === 0) continue

    // Merge consecutive assistant messages
    const last = merged[merged.length - 1]
    if (role === 'assistant' && last?.role === 'assistant') {
      last.parts.push(...parts)
    } else {
      merged.push({
        id: m.id as string,
        role,
        parts,
      })
    }
  }

  return merged
}

function useMessageHistory(threadId: string) {
  const [history, setHistory] = useState<UIMessage[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/memory/threads/${encodeURIComponent(threadId)}/messages?perPage=200`)
        if (!res.ok) { setLoading(false); return }
        const data = await res.json()
        if (cancelled) return
        const msgs = convertStoredMessages(data.messages ?? [])
        setHistory(msgs.length > 0 ? msgs : null)
      } catch {
        // no history available
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [threadId])

  return { history, loading }
}

interface ObservationalMemoryRecord {
  activeObservations: string
  generationCount: number
  observationTokenCount: number
  pendingMessageTokens: number
  totalTokensObserved: number
  isObserving: boolean
  isReflecting: boolean
  updatedAt: string
  config: {
    observation: { messageTokens: number }
    reflection: { observationTokens: number }
  }
}

function useObservations(resourceId: string, threadId: string, chatStatus: string) {
  const [record, setRecord] = useState<ObservationalMemoryRecord | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchObservations = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        agentId: 'gtcAdvisor',
        resourceId,
        threadId,
      })
      const res = await fetch(`${API_BASE}/api/memory/observational-memory?${params}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.record) {
        setRecord(data.record)
      }
    } catch {
      // silently fail — observations are supplementary
    } finally {
      setLoading(false)
    }
  }, [resourceId, threadId])

  // Fetch after each completed response
  useEffect(() => {
    if (chatStatus === 'ready') {
      fetchObservations()
    }
  }, [chatStatus, fetchObservations])

  return { record, loading, refresh: fetchObservations }
}

const MarkdownBlock = memo(function MarkdownBlock({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1.5 text-zinc-100">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold mt-2.5 mb-1 text-zinc-100">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-zinc-200">{children}</h3>,
        p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
        em: ({ children }) => <em className="italic text-zinc-300">{children}</em>,
        code: ({ className, children }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return (
              <pre className="my-2 rounded-lg bg-zinc-900 border border-zinc-800 p-3 overflow-x-auto">
                <code className="text-xs font-mono text-nv/90">{children}</code>
              </pre>
            )
          }
          return <code className="text-nv bg-zinc-800 px-1 py-0.5 rounded text-[0.85em] font-mono">{children}</code>
        },
        pre: ({ children }) => <>{children}</>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-nv hover:underline">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-2 overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-zinc-900 text-zinc-400">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-1.5 text-left font-medium">{children}</th>,
        td: ({ children }) => <td className="px-3 py-1.5 border-t border-zinc-800 text-zinc-300">{children}</td>,
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-nv/40 pl-3 text-zinc-400 italic">{children}</blockquote>
        ),
        hr: () => <hr className="my-3 border-zinc-800" />,
      }}
    >
      {text}
    </ReactMarkdown>
  )
})

const MessageBubble = memo(function MessageBubble({ message }: { message: UIMessage }) {
  const textParts = message.parts?.filter(p => p.type === 'text') ?? []
  const toolParts = message.parts?.filter(p => p.type === 'tool-invocation') ?? []
  const hasContent = textParts.some(p => (p as any).text?.trim()) || toolParts.length > 0

  if (!hasContent && message.role === 'assistant') return null

  return (
    <div className="flex flex-col gap-1">
      {toolParts.map((part, i) => {
        const inv = (part as any).toolInvocation
        return (
          <div key={`t-${i}`} className="flex items-center gap-1.5 text-[11px] text-zinc-500 px-1">
            <svg className="w-3 h-3 text-nv/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-zinc-400">{inv?.toolName ?? 'tool'}</span>
            {inv?.state === 'result' && <span className="text-nv/60">done</span>}
            {inv?.state === 'call' && <span className="text-yellow-500/60 animate-pulse">running</span>}
          </div>
        )
      })}

      {textParts.map((part, i) => {
        if (!(part as any).text?.trim()) return null
        if (message.role === 'user') {
          return (
            <div
              key={`m-${i}`}
              className="ml-auto bg-nv/20 border border-nv/20 text-zinc-100 max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2 text-sm"
            >
              {(part as any).text}
            </div>
          )
        }
        return (
          <div
            key={`m-${i}`}
            className="text-zinc-200 max-w-full sm:max-w-[90%] rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm leading-relaxed"
          >
            <MarkdownBlock text={(part as any).text} />
          </div>
        )
      })}
    </div>
  )
})

function fmtTokens(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return String(n)
}

const ObservationsPanel = memo(function ObservationsPanel({
  record,
  expanded,
  onToggle,
}: {
  record: ObservationalMemoryRecord | null
  loading: boolean
  expanded: boolean
  onToggle: () => void
}) {
  if (!record) return null

  const msgCurrent = record.pendingMessageTokens
  const msgMax = record.config.observation.messageTokens
  const msgObserved = record.totalTokensObserved
  const memCurrent = record.observationTokenCount
  const memMax = record.config.reflection.observationTokens
  const isProcessing = record.isObserving || record.isReflecting

  return (
    <div className="border-b border-zinc-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 sm:px-4 py-1.5 text-left hover:bg-zinc-900/50 transition cursor-pointer"
      >
        <svg className="w-3.5 h-3.5 text-nv/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        {isProcessing ? (
          <span className="text-[11px] font-medium text-nv/80 animate-pulse">
            {record.isObserving ? 'Forming memories...' : 'Reflecting...'}
          </span>
        ) : (
          <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-2 flex-wrap">
            <span>
              <span className="text-zinc-400">messages</span>{' '}
              {fmtTokens(msgCurrent)}/{fmtTokens(msgMax)}
              {msgObserved > 0 && <span className="text-zinc-600"> ↓{fmtTokens(msgObserved)}</span>}
            </span>
            <span>
              <span className="text-zinc-400">memory</span>{' '}
              {fmtTokens(memCurrent)}/{fmtTokens(memMax)}
            </span>
          </span>
        )}
        {record.activeObservations && (
          <svg
            className={`w-3 h-3 text-zinc-600 ml-auto shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        )}
      </button>
      {expanded && record.activeObservations && (
        <div className="px-3 sm:px-4 pb-2 max-h-48 overflow-y-auto">
          <div className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono bg-zinc-900/50 rounded-lg p-2.5 border border-zinc-800/50">
            {record.activeObservations}
          </div>
        </div>
      )}
    </div>
  )
})

export function Chat({
  profile,
  itinerary,
  onItineraryChange,
  onRemoveItineraryItem,
}: {
  profile: UserProfile
  itinerary: ItineraryItem[]
  onItineraryChange: (items: ItineraryItem[]) => void
  onRemoveItineraryItem: (id: string) => void
}) {
  const [input, setInput] = useState('')
  const [model, setModel] = useState(MODELS[0].id)
  const [obsExpanded, setObsExpanded] = useState(false)
  const [tab, setTab] = useState<ChatTab>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  const resourceId = useMemo(() => `user-${slugify(profile.name)}`, [profile.name])
  const threadId = useMemo(() => `thread-${slugify(profile.name)}`, [profile.name])

  const { messages, sendMessage, setMessages, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_BASE}/chat/gtcAdvisor`,
      body: {
        instructions: buildInstructions(profile, itinerary),
        memory: {
          thread: threadId,
          resource: resourceId,
        },
      },
    }),
  })

  // Load conversation history from memory on mount
  const { history, loading: historyLoading } = useMessageHistory(threadId)
  const hydratedRef = useRef(false)

  useEffect(() => {
    if (history && !hydratedRef.current && messages.length === 0) {
      hydratedRef.current = true
      setMessages(history)
    }
  }, [history, messages.length, setMessages])

  const { record: obsRecord, loading: obsLoading } = useObservations(resourceId, threadId, status)

  // Sync itinerary from tool results
  useEffect(() => {
    for (const msg of messages) {
      if (msg.role !== 'assistant') continue
      for (const part of msg.parts ?? []) {
        if (part.type !== 'tool-invocation') continue
        const inv = (part as any).toolInvocation
        if (inv?.state === 'result' && inv?.result?.action === 'save-itinerary') {
          const updated = inv.result.updatedItinerary
          if (Array.isArray(updated)) {
            onItineraryChange(updated)
          }
        }
      }
    }
  }, [messages, onItineraryChange])

  useEffect(() => {
    if (tab === 'chat') bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, tab])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage({ text: input })
    setInput('')
  }

  // Grouped itinerary for plan tab
  const groupedItinerary = useMemo(() => {
    const sorted = [...itinerary].sort((a, b) => {
      const da = DAY_ORDER[a.day] ?? 9
      const db = DAY_ORDER[b.day] ?? 9
      if (da !== db) return da - db
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
    const groups: Record<string, ItineraryItem[]> = {}
    for (const item of sorted) {
      if (!groups[item.day]) groups[item.day] = []
      groups[item.day].push(item)
    }
    return groups
  }, [itinerary])

  return (
    <div className="flex flex-col h-full">
      {/* Header with tab switcher */}
      <div className="px-3 sm:px-4 py-2 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          {/* Tab switcher */}
          <div className="flex gap-0.5 bg-zinc-900 rounded-lg p-0.5">
            <button
              onClick={() => setTab('chat')}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition cursor-pointer ${
                tab === 'chat' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setTab('plan')}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                tab === 'plan' ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-400'
              }`}
            >
              Plan
              {itinerary.length > 0 && (
                <span className={`text-[9px] px-1 py-px rounded-full ${
                  tab === 'plan' ? 'bg-nv/20 text-nv' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {itinerary.length}
                </span>
              )}
            </button>
          </div>

          {tab === 'chat' && (
            <>
              <div className="h-2 w-2 rounded-full bg-nv animate-pulse" />
              <span className="text-xs font-medium text-zinc-400">nemo</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="ml-auto text-[11px] bg-zinc-900 border border-zinc-700/50 rounded px-1.5 py-0.5 text-zinc-500 focus:outline-none focus:ring-1 focus:ring-nv/50 cursor-pointer max-w-[160px] truncate"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </>
          )}
          {tab === 'plan' && itinerary.length > 0 && (
            <span className="text-[11px] text-zinc-500 ml-auto">
              {itinerary.length} item{itinerary.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Chat view */}
      {tab === 'chat' && (
        <>
          {/* Observations panel */}
          <ObservationsPanel
            record={obsRecord}
            loading={obsLoading}
            expanded={obsExpanded}
            onToggle={() => setObsExpanded(e => !e)}
          />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
            {error && (
              <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded">Error: {error.message}</div>
            )}
            {messages.length === 0 && historyLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:300ms]" />
                </div>
                <p className="text-xs text-zinc-600">Loading conversation...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4 sm:px-6">
                <h2 className="text-base font-semibold text-zinc-300">Hi {profile.name}!</h2>
                <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
                  Ask me for session recommendations, search for topics, or help building your schedule.
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                  {['What should I see today?', 'Sessions on LLMs', 'Build my schedule'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q) }}
                      className="text-xs bg-zinc-800/60 border border-zinc-700/40 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 px-2.5 py-1 rounded-full transition cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))
            )}
            {status !== 'ready' && messages.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-nv/60 animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-nv/60 animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-nv/60 animate-bounce [animation-delay:300ms]" />
                </div>
                <span className="text-[11px] text-zinc-600">making moves...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t border-zinc-800 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about GTC sessions..."
                disabled={status !== 'ready'}
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-nv"
              />
              <button
                type="submit"
                disabled={status !== 'ready' || !input.trim()}
                className="bg-nv hover:bg-nv-dim disabled:bg-zinc-700 text-zinc-950 text-sm font-medium px-3 sm:px-4 py-2 rounded-lg transition shrink-0"
              >
                Send
              </button>
            </div>
          </form>
        </>
      )}

      {/* Plan (itinerary) view */}
      {tab === 'plan' && (
        <div className="flex-1 overflow-y-auto">
          {itinerary.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <svg className="w-8 h-8 text-zinc-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              <p className="text-xs text-zinc-500 leading-relaxed">
                No items yet. Switch to <button onClick={() => setTab('chat')} className="text-nv hover:underline cursor-pointer">Chat</button> and ask <span className="text-nv">nemo</span> to build your schedule.
              </p>
            </div>
          ) : (
            Object.entries(groupedItinerary).map(([day, dayItems]) => (
              <div key={day}>
                <div className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm px-3 py-1.5 border-b border-zinc-800">
                  <span className="text-[11px] font-medium text-zinc-400">{day}</span>
                  <span className="text-[10px] text-zinc-600 ml-1.5">{dayItems.length} item{dayItems.length !== 1 ? 's' : ''}</span>
                </div>
                {dayItems.map((item) => (
                  <div
                    key={item.id}
                    className="px-3 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-900/50 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            item.type === 'session'
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-purple-900/50 text-purple-400'
                          }`}>
                            {item.type === 'session' ? (item.sessionType ?? 'Session') : 'Party'}
                          </span>
                          {item.code && (
                            <span className="text-[10px] font-mono text-nv/60">{item.code}</span>
                          )}
                        </div>
                        <h3 className="text-sm text-zinc-200 leading-snug line-clamp-2">{item.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                          <span>{item.time}</span>
                          {item.location && item.location !== 'TBD' && (
                            <>
                              <span className="text-zinc-700">·</span>
                              <span className="truncate">{item.location}</span>
                            </>
                          )}
                        </div>
                        {item.sponsors && item.sponsors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.sponsors.map((s) => (
                              <span key={s} className="text-[9px] bg-zinc-800/50 text-zinc-500 px-1 py-0.5 rounded">{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => onRemoveItineraryItem(item.id)}
                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 p-0.5 cursor-pointer"
                        title="Remove from itinerary"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function buildInstructions(profile: UserProfile, itinerary: ItineraryItem[]): string {
  const itinerarySection = itinerary.length > 0
    ? `\n\nCurrent itinerary (${itinerary.length} items):\n${JSON.stringify(itinerary)}\n\nWhen calling itinerary tools, pass this as the currentItinerary parameter.`
    : '\n\nThe user has no items in their itinerary yet. When calling itinerary tools, pass an empty array [] as the currentItinerary parameter.'

  return `Attendee profile:
- Name: ${profile.name}
- Role: ${profile.role}
- Company: ${profile.company}
- Industry: ${profile.industry}
- Interests: ${profile.interests}
- Experience level: ${profile.experience}

Use this profile to personalize all recommendations.${itinerarySection}`
}

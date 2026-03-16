import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import type { UIMessage } from '@ai-sdk/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UserProfile, ItineraryItem } from '../types'

type ChatTab = 'chat' | 'plan'



const MODELS = [
  { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron Nano 30B' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron Super 120B' },
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

function isToolPart(part: any): boolean {
  return part.type?.startsWith('tool-') || part.type === 'dynamic-tool'
}

function getToolName(part: any): string {
  if (part.type === 'dynamic-tool') return part.toolName ?? 'tool'
  if (part.type?.startsWith('tool-')) return part.type.slice(5)
  return 'tool'
}

function getToolState(part: any): string {
  if (part.state === 'output-available' || part.output !== undefined || part.result !== undefined) return 'result'
  if (part.state === 'input-available' || part.input !== undefined || part.args !== undefined) return 'call'
  return 'pending'
}

function getToolOutput(part: any): any {
  return part.output ?? part.result
}

function formatToolData(data: unknown): string {
  if (data === undefined || data === null) return ''
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    // Truncate very large outputs
    if (str.length > 2000) return str.slice(0, 2000) + '\n…truncated'
    return str
  } catch {
    return String(data)
  }
}

function ToolCallItem({ part }: { part: any }) {
  const [expanded, setExpanded] = useState(false)
  const name = getToolName(part)
  const state = getToolState(part)
  const input = part.input ?? part.args
  const result = getToolOutput(part)

  return (
    <div className="rounded-lg border border-zinc-800/60 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="flex items-center gap-1.5 text-[11px] text-zinc-500 px-2 py-1.5 w-full hover:bg-zinc-800/30 transition cursor-pointer"
      >
        <svg className="w-3 h-3 text-nv/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
        </svg>
        <span className="text-zinc-400 font-medium">{name}</span>
        {state === 'result' && <span className="text-nv/60">done</span>}
        {state !== 'result' && <span className="text-yellow-500/60 animate-pulse">running</span>}
        <svg className={`w-3 h-3 ml-auto text-zinc-600 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-zinc-800/60 text-[11px] font-mono max-h-60 overflow-y-auto">
          {input !== undefined && (
            <div className="px-2 py-1.5 border-b border-zinc-800/40">
              <span className="text-zinc-500 font-sans text-[10px] uppercase tracking-wide">Input</span>
              <pre className="mt-0.5 text-zinc-400 whitespace-pre-wrap break-all">{formatToolData(input)}</pre>
            </div>
          )}
          {state === 'result' && result !== undefined ? (
            <div className="px-2 py-1.5">
              <span className="text-zinc-500 font-sans text-[10px] uppercase tracking-wide">Output</span>
              <pre className="mt-0.5 text-nv/70 whitespace-pre-wrap break-all">{formatToolData(result)}</pre>
            </div>
          ) : state !== 'result' && (
            <div className="px-2 py-1.5 text-zinc-600 font-sans italic">Waiting for result...</div>
          )}
        </div>
      )}
    </div>
  )
}

const MessageBubble = memo(function MessageBubble({ message }: { message: UIMessage }) {
  const textParts = message.parts?.filter(p => p.type === 'text') ?? []
  const toolParts = message.parts?.filter(p => isToolPart(p)) ?? []
  const hasContent = textParts.some(p => (p as any).text?.trim()) || toolParts.length > 0

  if (!hasContent && message.role === 'assistant') return null

  return (
    <div className="flex flex-col gap-1">
      {toolParts.map((part, i) => (
        <ToolCallItem key={`t-${i}`} part={part} />
      ))}

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
  onSelectItineraryItem,
}: {
  profile: UserProfile
  itinerary: ItineraryItem[]
  onItineraryChange: (items: ItineraryItem[]) => void
  onRemoveItineraryItem: (id: string) => void
  onSelectItineraryItem?: (item: ItineraryItem) => void
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
        if (!isToolPart(part)) continue
        const output = getToolOutput(part)
        if (output?.action === 'save-itinerary') {
          const updated = output.updatedItinerary
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

  // Calendar data for plan tab
  const CONFERENCE_DAYS = [
    { day: 'Sunday', date: 'Mar 16', num: 16 },
    { day: 'Monday', date: 'Mar 17', num: 17 },
    { day: 'Tuesday', date: 'Mar 18', num: 18 },
    { day: 'Wednesday', date: 'Mar 19', num: 19 },
    { day: 'Thursday', date: 'Mar 20', num: 20 },
    { day: 'Friday', date: 'Mar 21', num: 21 },
  ]
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }

  const [planDay, setPlanDay] = useState(CONFERENCE_DAYS[0].day)

  const dayItemCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of itinerary) {
      counts[item.day] = (counts[item.day] || 0) + 1
    }
    return counts
  }, [itinerary])

  const dayItems = useMemo(() => {
    return itinerary
      .filter(i => i.day === planDay)
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
  }, [itinerary, planDay])

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
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([])
                    // Delete thread from memory backend
                    fetch(`${API_BASE}/api/memory/threads/${encodeURIComponent(threadId)}?agentId=gtcAdvisor&resourceId=${encodeURIComponent(resourceId)}`, {
                      method: 'DELETE',
                    }).catch(() => {})
                    // Delete observational memory records
                    fetch(`${API_BASE}/api/memory/observational-memory?threadId=${encodeURIComponent(threadId)}&resourceId=${encodeURIComponent(resourceId)}`, {
                      method: 'DELETE',
                    }).catch(() => {})
                  }}
                  className="text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
                  title="Clear conversation"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}
            </>
          )}
          {tab === 'plan' && itinerary.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[11px] text-zinc-500">
                {itinerary.length} item{itinerary.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onItineraryChange([])}
                className="text-zinc-600 hover:text-zinc-400 transition cursor-pointer"
                title="Clear itinerary"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
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
          <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about GTC sessions..."
                disabled={status !== 'ready'}
                className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-nv"
              />
              <button
                type="submit"
                disabled={status !== 'ready' || !input.trim()}
                className="bg-nv hover:bg-nv-dim disabled:bg-zinc-700 text-zinc-950 text-sm font-semibold px-4 py-3 rounded-xl transition shrink-0 min-w-[52px]"
              >
                Send
              </button>
            </div>
          </form>
        </>
      )}

      {/* Plan (calendar) view */}
      {tab === 'plan' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day selector — pill strip */}
          <div className="flex px-3 py-2.5 border-b border-zinc-800 overflow-x-auto shrink-0 gap-1">
            {CONFERENCE_DAYS.map(d => {
              const count = dayItemCounts[d.day] || 0
              const active = planDay === d.day
              return (
                <button
                  key={d.day}
                  onClick={() => setPlanDay(d.day)}
                  className={`relative flex flex-col items-center min-w-[46px] px-2 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
                    active
                      ? 'bg-nv/12 ring-1 ring-nv/30'
                      : 'hover:bg-zinc-800/60'
                  }`}
                >
                  <span className={`text-[10px] uppercase tracking-wide ${active ? 'text-nv font-semibold' : 'text-zinc-500 font-medium'}`}>
                    {d.day.slice(0, 3)}
                  </span>
                  <span className={`text-lg font-bold leading-none mt-0.5 ${active ? 'text-zinc-100' : 'text-zinc-400'}`}>
                    {d.num}
                  </span>
                  {count > 0 && (
                    <span className={`absolute -top-1 -right-1 text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full ${
                      active ? 'bg-nv text-zinc-950' : 'bg-zinc-700 text-zinc-300'
                    }`}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Timeline */}
          <div className="flex-1 overflow-y-auto">
            {dayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-400 font-medium mb-1">No events on {planDay}</p>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Ask <button onClick={() => setTab('chat')} className="text-nv hover:underline cursor-pointer font-medium">nemo</button> to add sessions and parties to your schedule.
                </p>
              </div>
            ) : (
              <div className="py-2 px-3 space-y-2">
                {dayItems.map((item, idx) => {
                  const isSession = item.type === 'session'
                  // Show gap indicator if there's dead time between events
                  const prev = idx > 0 ? dayItems[idx - 1] : null
                  const gapMin = prev?.endTime && item.startTime
                    ? toMin(item.startTime) - toMin(prev.endTime)
                    : 0
                  const showGap = gapMin > 15

                  return (
                    <div key={item.id}>
                      {showGap && (
                        <div className="flex items-center gap-2 py-1">
                          <div className="flex-1 border-t border-dashed border-zinc-800/60" />
                          <span className="text-[10px] text-zinc-600 tabular-nums">
                            {gapMin >= 60 ? `${Math.floor(gapMin / 60)}h ${gapMin % 60 > 0 ? `${gapMin % 60}m` : ''}` : `${gapMin}m`} gap
                          </span>
                          <div className="flex-1 border-t border-dashed border-zinc-800/60" />
                        </div>
                      )}
                      <div
                        onClick={() => onSelectItineraryItem?.(item)}
                        className={`rounded-xl border group transition-all duration-150 relative cursor-pointer ${
                          isSession
                            ? 'bg-nv/6 border-nv/15 hover:bg-nv/12 hover:border-nv/30'
                            : 'bg-purple-500/6 border-purple-500/15 hover:bg-purple-500/12 hover:border-purple-500/30'
                        }`}
                      >
                        {/* Colored left accent bar */}
                        <div className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${
                          isSession ? 'bg-nv/50' : 'bg-purple-400/50'
                        }`} />

                        <div className="pl-3 pr-2 py-2">
                          {/* Top row: type + code + remove */}
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                              isSession ? 'text-nv/60' : 'text-purple-400/60'
                            }`}>
                              {isSession ? (item.sessionType ?? 'Session') : 'Party'}
                            </span>
                            {item.code && (
                              <span className="text-[10px] font-mono text-zinc-600">{item.code}</span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); onRemoveItineraryItem(item.id) }}
                              className="ml-auto text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer p-0.5"
                              title="Remove from plan"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>

                          {/* Title */}
                          <h4 className={`text-[13px] leading-snug font-medium ${
                            isSession ? 'text-zinc-200' : 'text-purple-200'
                          }`}>
                            {item.title}
                          </h4>

                          {/* Details */}
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                              <svg className="w-3 h-3 shrink-0 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                              </svg>
                              <span>{item.time}</span>
                            </div>
                            {item.location && item.location !== 'TBD' && (
                              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                                <svg className="w-3 h-3 shrink-0 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                                </svg>
                                <span className="truncate">{item.location}</span>
                              </div>
                            )}
                            {item.sponsors && item.sponsors.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {item.sponsors.map((s: string) => (
                                  <span key={s} className="text-[10px] bg-purple-500/10 text-purple-300/70 px-1.5 py-0.5 rounded-md">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
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

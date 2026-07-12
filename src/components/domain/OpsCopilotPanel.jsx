import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, AlertCircle, User, Bot } from 'lucide-react'
import Drawer from '@/components/ui/Drawer'
import Button from '@/components/ui/Button'
import { Loader } from '@/components/ui/Loader'
import Badge from '@/components/ui/Badge'
import api from '@/api'
import { useAuth, ROLES } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

/**
 * Suggested starter questions per role — help users discover what to ask.
 */
const SUGGESTIONS = {
  fleet_manager: [
    'Which vehicles have the highest operational cost and should be considered for retirement?',
    'Which vehicles are bottlenecks given current utilization?',
    'Summarize the current fleet status and active trips.',
  ],
  safety_officer: [
    'Which drivers have expired or soon-expiring licenses?',
    'Which drivers have low safety scores?',
    'Are any drivers currently suspended?',
  ],
  financial_analyst: [
    'Explain the total fleet revenue vs operational cost.',
    'Which vehicle has the worst ROI and why?',
    'What are the biggest cost drivers across the fleet?',
  ],
  driver: [
    'Meri next trip ka route kya hai?',
    'Meri vehicle ki current status kya hai?',
    'License renewal kab tak karna hai?',
  ],
}

/**
 * OpsCopilotPanel — a chat drawer where each role can ask natural-language
 * questions about current fleet state. Calls api.llm.opsQuery, which routes
 * to the Sarvam-backed backend in real mode or an offline stub in mock mode.
 *
 * Strictly read-only: this panel cannot change any records.
 */
export default function OpsCopilotPanel({ open, onClose }) {
  const { role } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)

  // Auto-scroll to the latest message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const roleLabel = ROLES[role]?.label || role
  const suggestions = SUGGESTIONS[role] || SUGGESTIONS.fleet_manager

  const send = async (text) => {
    const question = (text ?? input).trim()
    if (!question || loading) return

    setInput('')
    setError(null)
    setMessages((m) => [...m, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await api.llm.opsQuery(question, role)
      if (res.success === false) {
        setError(res.message || 'The assistant could not respond. Please try again.')
        setMessages((m) => [...m, { role: 'assistant', content: null, error: res.message }])
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: res.data.answer, model: res.data.model }])
      }
    } catch (e) {
      const msg = e?.message || 'Network error contacting the assistant.'
      setError(msg)
      setMessages((m) => [...m, { role: 'assistant', content: null, error: msg }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Ops Copilot"
      subtitle={`${roleLabel} · Powered by Sarvam AI`}
      width="lg"
      footer={
        <div className="space-y-2">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-600/10">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={`Ask a question as ${roleLabel}…`}
              className="max-h-32 flex-1 resize-none rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <Button
              onClick={() => send()}
              loading={loading}
              disabled={!input.trim()}
              leftIcon={Send}
            >
              Send
            </Button>
          </div>
          <p className="text-[11px] text-ink-400">
            Advisory only — this assistant summarizes data and cannot change records or override rules.
          </p>
        </div>
      }
    >
      <div ref={scrollRef} className="space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">Ask the Ops Copilot</p>
              <p className="mt-1 max-w-sm text-xs text-ink-500">
                Get role-aware answers about your fleet — grounded in live data. Try one of these:
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-xs text-ink-600 transition-colors hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
            {api.isMock && (
              <Badge tone="amber" dot dotColor="amber">Mock mode — offline stub responses</Badge>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <MessageBubble message={m} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5"
          >
            <Avatar role="assistant" />
            <div className="rounded-2xl rounded-tl-sm bg-ink-50 px-4 py-3">
              <Loader label="Thinking…" />
            </div>
          </motion.div>
        )}
      </div>
    </Drawer>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={cn('flex items-start gap-2.5', isUser && 'flex-row-reverse')}>
      <Avatar role={message.role} />
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
          isUser
            ? 'rounded-tr-sm bg-brand-600 text-white'
            : message.error
              ? 'rounded-tl-sm bg-red-50 text-red-700 ring-1 ring-red-600/10'
              : 'rounded-tl-sm bg-ink-50 text-ink-800'
        )}
      >
        {message.error ? (
          <span className="flex items-start gap-1.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
            <span>{message.error}</span>
          </span>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        )}
        {!isUser && message.model && !message.error && (
          <p className="mt-1.5 text-[10px] font-medium text-ink-400">{message.model}</p>
        )}
      </div>
    </div>
  )
}

function Avatar({ role }) {
  const isUser = role === 'user'
  return (
    <div
      className={cn(
        'flex h-7 w-7 flex-none items-center justify-center rounded-full',
        isUser ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-500'
      )}
    >
      {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
    </div>
  )
}
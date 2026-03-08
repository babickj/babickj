import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, ArrowLeft, RotateCcw, ChevronDown, ChevronUp,
  FileText, BookOpen, AlertTriangle, Loader2, Copy, Check,
  Sparkles,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../../store/useAppStore'
import { getAgent, streamChat } from '../../utils/api'

export default function ChatPage() {
  const { agentId } = useParams()
  const navigate = useNavigate()
  const { agents } = useAppStore()

  const [agent, setAgent] = useState(agents.find(a => a.id === agentId) || null)
  const [messages, setMessages] = useState([]) // { role, content, citations, inCorpus, id }
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [pendingCitations, setPendingCitations] = useState([])
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const streamingIdRef = useRef(null)
  const abortRef = useRef(false)

  useEffect(() => {
    if (!agent) {
      getAgent(agentId).then(setAgent).catch(() => navigate('/'))
    }
  }, [agentId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(() => {
    const query = input.trim()
    if (!query || streaming || !agent) return

    const userMsg = { role: 'user', content: query, id: Date.now() + 'u' }
    const assistantId = Date.now() + 'a'
    const assistantMsg = {
      role: 'assistant',
      content: '',
      citations: [],
      inCorpus: null,
      id: assistantId,
      streaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setStreaming(true)
    abortRef.current = false
    streamingIdRef.current = assistantId

    // Build history for context (exclude current streaming message)
    const history = messages.map(m => ({ role: m.role, content: m.content }))

    streamChat(agentId, query, history, {
      onCitations: (citations) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, citations } : m
        ))
      },
      onToken: (token) => {
        if (abortRef.current) return
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: m.content + token } : m
        ))
      },
      onDone: (evt) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, streaming: false, inCorpus: evt.in_corpus } : m
        ))
        setStreaming(false)
        inputRef.current?.focus()
      },
      onError: (err) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? {
            ...m,
            content: `❌ Error: ${err}`,
            streaming: false,
          } : m
        ))
        setStreaming(false)
      },
    })
  }, [input, streaming, agent, messages, agentId])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    if (streaming) return
    setMessages([])
  }

  if (!agent) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-edge-400" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-mesh">
      {/* Chat header */}
      <div className="flex items-center justify-between px-6 py-3 glass border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
            style={{
              background: `${agent.color || '#6366f1'}20`,
              border: `1px solid ${agent.color || '#6366f1'}40`,
              color: agent.color || '#6366f1',
            }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-semibold text-slate-100 text-sm">{agent.name}</h2>
            <p className="text-xs text-slate-500">
              {agent.doc_count} docs · {agent.chunk_count} chunks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            disabled={streaming || messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <RotateCcw size={12} />
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <WelcomeScreen agent={agent} onSuggest={(q) => setInput(q)} />
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              {msg.role === 'user' ? (
                <UserMessage content={msg.content} />
              ) : (
                <AssistantMessage
                  msg={msg}
                  agentColor={agent.color}
                  agentName={agent.name}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-5">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-2xl border border-white/10 focus-within:border-edge-500/40 transition-colors">
            <textarea
              ref={inputRef}
              rows={1}
              className="w-full bg-transparent px-5 pt-4 pb-2 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none"
              placeholder={`Ask ${agent.name} anything...`}
              value={input}
              onChange={e => {
                setInput(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
              onKeyDown={handleKeyDown}
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <span className="text-xs text-slate-600">
                ↵ Send · Shift+↵ newline
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={sendMessage}
                disabled={!input.trim() || streaming}
                className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${agent.color || '#6366f1'}, #8b5cf6)`,
                  color: 'white',
                }}
              >
                {streaming
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Send size={13} />
                }
                {streaming ? 'Thinking...' : 'Send'}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen({ agent, onSuggest }) {
  const suggestions = [
    `What are the main topics covered in ${agent.name}'s knowledge base?`,
    'Summarize the key points from the documents.',
    'What are the most important concepts I should know?',
  ]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-5"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto"
          style={{
            background: `${agent.color || '#6366f1'}15`,
            border: `2px solid ${agent.color || '#6366f1'}30`,
            color: agent.color || '#6366f1',
          }}
        >
          {agent.name.charAt(0).toUpperCase()}
        </div>
      </motion.div>

      <h3 className="text-lg font-semibold text-slate-200 mb-1">{agent.name}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">
        {agent.description || 'Ready to answer questions from my knowledge base with precise citations.'}
      </p>

      <div className="space-y-2 w-full max-w-md">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => onSuggest(s)}
            className="w-full text-left glass rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors flex items-center gap-3"
          >
            <Sparkles size={13} className="text-edge-400 flex-shrink-0" />
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function UserMessage({ content }) {
  return (
    <div className="flex justify-end">
      <div
        className="max-w-2xl rounded-2xl rounded-tr-sm px-5 py-3 text-sm text-white"
        style={{
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        }}
      >
        {content}
      </div>
    </div>
  )
}

function AssistantMessage({ msg, agentColor, agentName }) {
  const [citationsOpen, setCitationsOpen] = useState(true)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex gap-3 max-w-4xl">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1"
        style={{
          background: `${agentColor || '#6366f1'}20`,
          border: `1px solid ${agentColor || '#6366f1'}40`,
          color: agentColor || '#6366f1',
        }}
      >
        {agentName.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {/* Citations */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setCitationsOpen(!citationsOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen size={11} />
                {msg.citations.length} source{msg.citations.length !== 1 ? 's' : ''} referenced
              </span>
              {citationsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            <AnimatePresence>
              {citationsOpen && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 space-y-2">
                    {msg.citations.map((c, i) => (
                      <CitationCard key={i} citation={c} index={i + 1} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Out-of-corpus warning */}
        {msg.inCorpus === false && !msg.streaming && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            <AlertTriangle size={11} />
            Response based on general knowledge — outside core knowledge base
          </div>
        )}

        {/* Message body */}
        <div className="glass rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-slate-200 relative group">
          {msg.content ? (
            <div className="chat-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 size={13} className="animate-spin" />
              <span>Thinking...</span>
            </div>
          )}

          {/* Streaming cursor */}
          {msg.streaming && msg.content && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-0.5 h-4 bg-edge-400 ml-0.5 align-middle"
            />
          )}

          {/* Copy button */}
          {!msg.streaming && msg.content && (
            <button
              onClick={copyToClipboard}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-all"
            >
              {copied ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CitationCard({ citation, index }) {
  return (
    <div className="citation-card">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-edge-400 font-mono font-semibold">[{index}]</span>
          <span className="text-slate-300 font-medium">{citation.filename}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span className="flex items-center gap-1">
            <FileText size={9} />
            Page {citation.page}
          </span>
          <span className="text-edge-500 text-[10px]">
            {Math.round(citation.score * 100)}% match
          </span>
        </div>
      </div>
      <p className="text-slate-500 text-[11px] leading-relaxed italic line-clamp-2">
        "{citation.excerpt}"
      </p>
    </div>
  )
}

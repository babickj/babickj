import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Cpu, ChevronRight, Check, Loader2,
  ArrowLeft, RefreshCw, FileText, Database, AlertCircle,
  Sparkles, Palette,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import {
  createAgent, updateAgent, getAgent,
  streamIndex, getAgentDocuments,
} from '../../utils/api'

const ACCENT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f97316', '#ec4899', '#f59e0b', '#3b82f6',
]

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  in:      { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  out:     { opacity: 0, x: -20, transition: { duration: 0.2 } },
}

export default function CreateAgentPage() {
  const navigate = useNavigate()
  const { agentId } = useParams()
  const { upsertAgent, setAgents } = useAppStore()
  const isEdit = Boolean(agentId)

  const [form, setForm] = useState({
    name: '',
    description: '',
    model_path: '',
    corpus_path: '',
    system_prompt: '',
    color: '#6366f1',
  })
  const [step, setStep] = useState(0) // 0: config, 1: indexing, 2: done
  const [indexProgress, setIndexProgress] = useState(null)
  const [indexResult, setIndexResult] = useState(null)
  const [indexError, setIndexError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savedAgent, setSavedAgent] = useState(null)
  const [docPreview, setDocPreview] = useState([])
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)

  useEffect(() => {
    if (isEdit && agentId) {
      getAgent(agentId).then((a) => {
        setForm({
          name: a.name,
          description: a.description,
          model_path: a.model_path,
          corpus_path: a.corpus_path,
          system_prompt: a.system_prompt,
          color: a.color || '#6366f1',
        })
        setSavedAgent(a)
        if (a.indexed) setStep(2)
      }).catch(() => navigate('/'))
    }
  }, [agentId])

  const handleBrowseModel = async () => {
    const path = await window.electronAPI?.openFile([
      { name: 'Model Files', extensions: ['gguf', 'bin', 'pt', 'ggml'] },
      { name: 'All Files', extensions: ['*'] },
    ])
    if (path) setForm(f => ({ ...f, model_path: path }))
  }

  const handleBrowseCorpus = async () => {
    const path = await window.electronAPI?.openDirectory()
    if (path) {
      setForm(f => ({ ...f, corpus_path: path }))
      // Preview docs
      if (savedAgent) {
        try {
          const docs = await getAgentDocuments(savedAgent.id)
          setDocPreview(docs.slice(0, 8))
        } catch {}
      }
    }
  }

  const handleSaveAndIndex = async () => {
    if (!form.name || !form.model_path || !form.corpus_path) return
    setLoading(true)

    try {
      let agent
      if (isEdit && savedAgent) {
        agent = await updateAgent(savedAgent.id, form)
      } else {
        agent = await createAgent(form)
      }
      setSavedAgent(agent)
      upsertAgent(agent)
      setStep(1)
      setIndexProgress({ stage: 'starting', file: '', doc_index: 0, total_docs: 0, chunks_so_far: 0 })

      streamIndex(agent.id, {
        onProgress: (evt) => setIndexProgress(evt),
        onComplete: (evt) => {
          setIndexResult(evt)
          setStep(2)
          upsertAgent({ ...agent, indexed: true, doc_count: evt.doc_count, chunk_count: evt.chunk_count })
        },
        onError: (err) => {
          setIndexError(err)
          setStep(2)
        },
      })
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const isValid = form.name.trim() && form.model_path.trim() && form.corpus_path.trim()

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      className="h-full overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-100">
            {isEdit ? 'Edit Agent' : 'Create New Agent'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure your expert AI agent and index your knowledge base.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="config" variants={pageVariants} initial="initial" animate="in" exit="out" className="space-y-5">
              {/* Name */}
              <Field label="Agent Name" required>
                <input
                  type="text"
                  placeholder="e.g. Legal Expert, Product Manual Bot"
                  className="input-field"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </Field>

              {/* Description */}
              <Field label="Description">
                <input
                  type="text"
                  placeholder="Brief description of this agent's expertise"
                  className="input-field"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </Field>

              {/* Model path */}
              <Field label="Model" required hint="Ollama model name (e.g. llama3) or path to .gguf file">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="llama3 or /path/to/model.gguf"
                    className="input-field"
                    value={form.model_path}
                    onChange={e => setForm(f => ({ ...f, model_path: e.target.value }))}
                  />
                  <button onClick={handleBrowseModel} className="btn-ghost flex-shrink-0 flex items-center gap-1.5">
                    <FolderOpen size={14} />
                    Browse
                  </button>
                </div>
              </Field>

              {/* Corpus path */}
              <Field label="Corpus Folder" required hint="Folder containing your documents (PDF, DOCX, TXT, MD)">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="/path/to/your/documents"
                    className="input-field"
                    value={form.corpus_path}
                    onChange={e => setForm(f => ({ ...f, corpus_path: e.target.value }))}
                  />
                  <button onClick={handleBrowseCorpus} className="btn-ghost flex-shrink-0 flex items-center gap-1.5">
                    <FolderOpen size={14} />
                    Browse
                  </button>
                </div>
              </Field>

              {/* Accent color */}
              <Field label="Accent Color">
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-lg transition-all"
                      style={{
                        backgroundColor: c,
                        boxShadow: form.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                        transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
              </Field>

              {/* System prompt (collapsed by default) */}
              <div className="glass rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Cpu size={14} />
                    System Prompt
                    <span className="text-xs text-slate-600">(auto-generated if blank)</span>
                  </span>
                  <ChevronRight
                    size={14}
                    className={`transition-transform ${showSystemPrompt ? 'rotate-90' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {showSystemPrompt && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <textarea
                          rows={8}
                          placeholder={`You are ${form.name || '[Agent Name]'}, a proprietary AI model by EdgeRunner...`}
                          className="input-field font-mono text-xs resize-none"
                          value={form.system_prompt}
                          onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveAndIndex}
                disabled={!isValid || loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isEdit ? 'Save & Re-index' : 'Create & Index Knowledge Base'}
              </motion.button>
            </motion.div>
          )}

          {step === 1 && indexProgress && (
            <motion.div key="indexing" variants={pageVariants} initial="initial" animate="in" className="space-y-6">
              <IndexingProgress progress={indexProgress} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="done" variants={pageVariants} initial="initial" animate="in" className="space-y-6">
              {indexError ? (
                <ErrorResult error={indexError} onRetry={() => { setStep(0); setIndexError(null) }} />
              ) : (
                <SuccessResult
                  result={indexResult}
                  agentName={form.name}
                  agentColor={form.color}
                  onChat={() => navigate(`/chat/${savedAgent?.id}`)}
                  onBack={() => navigate('/')}
                  onReindex={() => setStep(0)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-edge-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1.5">{hint}</p>}
    </div>
  )
}

function IndexingProgress({ progress }) {
  const pct = progress.total_docs > 0
    ? Math.round((progress.doc_index / progress.total_docs) * 100)
    : 0

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Loader2 size={24} className="animate-spin text-edge-400" />
          <div className="absolute inset-0 rounded-full blur-sm bg-edge-400/20" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-100">Indexing Knowledge Base</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {progress.stage === 'extracting' && `Extracting text from ${progress.file}`}
            {progress.stage === 'embedding' && `Embedding chunks from ${progress.file}, page ${progress.page}`}
            {progress.stage === 'starting' && 'Starting indexing pipeline...'}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Document {Math.min(progress.doc_index + 1, progress.total_docs)} of {progress.total_docs || '?'}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-dark-300 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)',
              backgroundSize: '200% 100%',
            }}
            animate={{
              width: `${Math.max(pct, 3)}%`,
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            }}
            transition={{ width: { duration: 0.3 }, backgroundPosition: { duration: 2, repeat: Infinity } }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat icon={FileText} label="Chunks indexed" value={progress.chunks_so_far} />
        <Stat icon={Database} label="Current file" value={progress.file ? progress.file.slice(0, 24) : '—'} />
      </div>
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="bg-dark-300/50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
        <Icon size={11} />
        {label}
      </div>
      <div className="text-sm font-mono font-medium text-slate-200">{value}</div>
    </div>
  )
}

function SuccessResult({ result, agentName, agentColor, onChat, onBack, onReindex }) {
  return (
    <div className="glass-card p-8 text-center space-y-5">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
        style={{ background: `${agentColor}20`, border: `2px solid ${agentColor}50` }}
      >
        <Check size={28} style={{ color: agentColor }} />
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-1">
          {agentName} is ready!
        </h2>
        <p className="text-slate-400 text-sm">Knowledge base indexed successfully</p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        <div className="glass rounded-xl p-3">
          <div className="text-2xl font-bold gradient-text">{result?.doc_count ?? '—'}</div>
          <div className="text-xs text-slate-500">Documents</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-2xl font-bold gradient-text">{result?.chunk_count ?? '—'}</div>
          <div className="text-xs text-slate-500">Chunks indexed</div>
        </div>
      </div>

      <div className="flex gap-3 justify-center pt-2">
        <button onClick={onBack} className="btn-ghost">Back to home</button>
        <button onClick={onReindex} className="btn-ghost flex items-center gap-1.5">
          <RefreshCw size={13} /> Re-index
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onChat}
          className="btn-primary flex items-center gap-2"
        >
          Start chatting
          <ChevronRight size={14} />
        </motion.button>
      </div>
    </div>
  )
}

function ErrorResult({ error, onRetry }) {
  return (
    <div className="glass-card p-8 text-center space-y-4">
      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Indexing Failed</h2>
        <p className="text-sm text-slate-500 font-mono">{error}</p>
      </div>
      <button onClick={onRetry} className="btn-primary flex items-center gap-2 mx-auto">
        <RefreshCw size={14} /> Try Again
      </button>
    </div>
  )
}

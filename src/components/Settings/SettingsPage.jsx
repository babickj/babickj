import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Save, RefreshCw, CheckCircle, XCircle, Loader2,
  Cpu, Database, Sliders, Wifi, Server,
} from 'lucide-react'
import { getSettings, updateSettings, getHealth } from '../../utils/api'
import { useAppStore } from '../../store/useAppStore'

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  in:      { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function SettingsPage() {
  const { setBackendHealth, backendHealth } = useAppStore()
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings).catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    try {
      const updated = await updateSettings(settings)
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCheckHealth = async () => {
    setChecking(true)
    try {
      const health = await getHealth()
      setBackendHealth(health)
    } finally {
      setChecking(false)
    }
  }

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }))

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-edge-400" />
      </div>
    )
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      className="h-full overflow-y-auto p-8"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
            <p className="text-slate-500 text-sm mt-1">Configure backends, embeddings, and RAG parameters</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Saved!' : 'Save'}
          </motion.button>
        </div>

        {/* Backend Status */}
        <Section icon={Wifi} title="Backend Status">
          <div className="grid grid-cols-2 gap-3">
            <BackendStatusCard
              label="Ollama"
              host={settings.ollama_host}
              health={backendHealth?.ollama}
            />
            <BackendStatusCard
              label="llama-server"
              host={settings.llama_server_host}
              health={backendHealth?.llama_server}
            />
          </div>
          <button
            onClick={handleCheckHealth}
            disabled={checking}
            className="btn-ghost flex items-center gap-2 text-xs mt-2"
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
            Check connectivity
          </button>

          {backendHealth?.available_models?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-2">Available Ollama models:</p>
              <div className="flex flex-wrap gap-2">
                {backendHealth.available_models.map(m => (
                  <span key={m} className="glass rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Active Backend */}
        <Section icon={Server} title="Active Backend">
          <div className="grid grid-cols-2 gap-2">
            {['ollama', 'llama_server'].map(b => (
              <button
                key={b}
                onClick={() => set('active_backend', b)}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border ${
                  settings.active_backend === b
                    ? 'bg-edge-600/20 border-edge-500/30 text-edge-300'
                    : 'border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {b === 'ollama' ? 'Ollama' : 'llama-server'}
              </button>
            ))}
          </div>
        </Section>

        {/* Hosts */}
        <Section icon={Cpu} title="Server Hosts">
          <SettingRow label="Ollama Host" hint="Default: http://localhost:11434">
            <input
              type="text"
              className="input-field"
              value={settings.ollama_host}
              onChange={e => set('ollama_host', e.target.value)}
            />
          </SettingRow>
          <SettingRow label="llama-server Host" hint="Default: http://localhost:8080">
            <input
              type="text"
              className="input-field"
              value={settings.llama_server_host}
              onChange={e => set('llama_server_host', e.target.value)}
            />
          </SettingRow>
        </Section>

        {/* Embeddings */}
        <Section icon={Database} title="Embeddings">
          <SettingRow label="Embedding Model" hint="Must be available in Ollama">
            <input
              type="text"
              className="input-field"
              value={settings.embedding_model}
              onChange={e => set('embedding_model', e.target.value)}
            />
          </SettingRow>
        </Section>

        {/* RAG params */}
        <Section icon={Sliders} title="RAG Parameters">
          <div className="grid grid-cols-2 gap-4">
            <SettingRow label="Chunk Size" hint="Words per chunk">
              <input
                type="number"
                className="input-field"
                value={settings.chunk_size}
                onChange={e => set('chunk_size', parseInt(e.target.value))}
                min={100} max={4000}
              />
            </SettingRow>
            <SettingRow label="Chunk Overlap" hint="Overlap in words">
              <input
                type="number"
                className="input-field"
                value={settings.chunk_overlap}
                onChange={e => set('chunk_overlap', parseInt(e.target.value))}
                min={0} max={500}
              />
            </SettingRow>
            <SettingRow label="Retrieval K" hint="Top-K chunks to retrieve">
              <input
                type="number"
                className="input-field"
                value={settings.retrieval_k}
                onChange={e => set('retrieval_k', parseInt(e.target.value))}
                min={1} max={20}
              />
            </SettingRow>
            <SettingRow label="Max Tokens" hint="Max response length">
              <input
                type="number"
                className="input-field"
                value={settings.max_tokens}
                onChange={e => set('max_tokens', parseInt(e.target.value))}
                min={256} max={8192}
              />
            </SettingRow>
          </div>

          <SettingRow label={`Temperature: ${settings.temperature}`} hint="Lower = more precise, Higher = more creative">
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={settings.temperature}
              onChange={e => set('temperature', parseFloat(e.target.value))}
              className="w-full accent-edge-500"
            />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>0 — Precise</span>
              <span>1 — Creative</span>
            </div>
          </SettingRow>
        </Section>
      </div>
    </motion.div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-white/5">
        <Icon size={15} className="text-edge-400" />
        <h2 className="font-semibold text-slate-200 text-sm">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}

function BackendStatusCard({ label, host, health }) {
  const ok = health?.healthy
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className={`status-dot ${ok ? 'status-dot-green' : 'status-dot-red'}`} />
      </div>
      <p className="text-xs text-slate-500 font-mono truncate">{host}</p>
      <p className={`text-xs mt-1 ${ok ? 'text-neon-green' : 'text-red-400'}`}>
        {ok ? 'Connected' : 'Unreachable'}
      </p>
    </div>
  )
}

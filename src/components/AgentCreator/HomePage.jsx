import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, MessageSquare, Trash2, Database, FileText,
  Zap, ChevronRight, Calendar, BookOpen,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { getAgents, deleteAgent } from '../../utils/api'
import EdgeRunnerLogo from '../../assets/EdgeRunnerLogo'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

export default function HomePage() {
  const navigate = useNavigate()
  const { agents, setAgents, removeAgent } = useAppStore()
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    getAgents().then(setAgents).catch(() => {})
  }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this agent and its knowledge base?')) return
    setDeleting(id)
    try {
      await deleteAgent(id)
      removeAgent(id)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <motion.div variants={item} className="mb-10">
          {agents.length === 0 ? (
            <div className="text-center py-16">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="flex justify-center mb-6"
              >
                <EdgeRunnerLogo size={80} animated />
              </motion.div>
              <h1 className="text-3xl font-bold gradient-text mb-3">
                EdgeRunner AI Agent Creator
              </h1>
              <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
                Build expert AI agents from your proprietary data — with SME-level responses and precise citations.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/create')}
                className="btn-primary px-8 py-3 text-base"
              >
                <span className="flex items-center gap-2">
                  <Plus size={18} />
                  Create Your First Agent
                </span>
              </motion.button>

              {/* Feature pills */}
              <div className="flex flex-wrap justify-center gap-3 mt-10">
                {[
                  { icon: Zap, label: 'RAG-powered' },
                  { icon: BookOpen, label: 'SME-level expertise' },
                  { icon: FileText, label: 'Precise citations' },
                  { icon: Database, label: 'ChromaDB vector store' },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-slate-400">
                    <Icon size={13} className="text-edge-400" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">Your Agents</h1>
                  <p className="text-slate-500 text-sm mt-1">{agents.length} expert agent{agents.length !== 1 ? 's' : ''} ready</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/create')}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus size={15} />
                  New Agent
                </motion.button>
              </div>

              {/* Agent grid */}
              <motion.div
                variants={container}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              >
                {agents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onChat={() => navigate(`/chat/${agent.id}`)}
                    onEdit={() => navigate(`/create/${agent.id}`)}
                    onDelete={(e) => handleDelete(e, agent.id)}
                    deleting={deleting === agent.id}
                  />
                ))}
              </motion.div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

function AgentCard({ agent, onChat, onEdit, onDelete, deleting }) {
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      className="glass-card p-5 cursor-pointer group relative overflow-hidden"
      onClick={onChat}
      style={{ '--agent-color': agent.color || '#6366f1' }}
    >
      {/* Color accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${agent.color || '#6366f1'}, transparent)` }}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{
              background: `${agent.color || '#6366f1'}20`,
              border: `1px solid ${agent.color || '#6366f1'}40`,
              color: agent.color || '#6366f1',
            }}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-sm">{agent.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: agent.indexed ? '#10b981' : '#64748b',
                  boxShadow: agent.indexed ? '0 0 4px rgba(16,185,129,0.7)' : 'none',
                }}
              />
              <span className="text-xs text-slate-500">
                {agent.indexed ? 'Indexed' : 'Not indexed'}
              </span>
            </div>
          </div>
        </div>

        {/* Actions (show on hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
            title="Edit agent"
          >
            <FileText size={13} />
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors"
            title="Delete agent"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {agent.description && (
        <p className="text-slate-500 text-xs mb-4 line-clamp-2">{agent.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-slate-600 mb-4">
        {agent.doc_count > 0 && (
          <span className="flex items-center gap-1">
            <FileText size={11} />
            {agent.doc_count} docs
          </span>
        )}
        {agent.chunk_count > 0 && (
          <span className="flex items-center gap-1">
            <Database size={11} />
            {agent.chunk_count} chunks
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Calendar size={11} />
          {new Date(agent.created_at).toLocaleDateString()}
        </span>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onChat}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: `${agent.color || '#6366f1'}15`,
          border: `1px solid ${agent.color || '#6366f1'}30`,
          color: agent.color || '#6366f1',
        }}
      >
        <MessageSquare size={13} />
        Chat with Agent
        <ChevronRight size={13} />
      </motion.button>
    </motion.div>
  )
}

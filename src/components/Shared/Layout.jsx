import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home, MessageSquare, Plus, Settings, ChevronLeft,
  ChevronRight, Cpu, Wifi, WifiOff,
} from 'lucide-react'
import { EdgeRunnerWordmark } from '../../assets/EdgeRunnerLogo'
import { useAppStore } from '../../store/useAppStore'

const isMac = typeof window !== 'undefined' && window.electronAPI?.platform === 'darwin'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { agents, sidebarCollapsed, setSidebarCollapsed, backendHealth } = useAppStore()

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Plus, label: 'New Agent', path: '/create' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const backendOk = backendHealth?.ollama?.healthy || backendHealth?.llama_server?.healthy

  return (
    <div className="flex h-screen bg-mesh overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex flex-col glass border-r border-white/5 z-20 relative flex-shrink-0"
      >
        {/* Titlebar area (Mac traffic lights) */}
        <div
          className={`h-12 flex items-center titlebar-drag ${sidebarCollapsed ? 'justify-center' : 'px-4'}`}
          style={{ paddingLeft: isMac && !sidebarCollapsed ? 80 : undefined }}
        >
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="titlebar-no-drag"
            >
              <EdgeRunnerWordmark height={28} />
            </motion.div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {navItems.map(({ icon: Icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive(path)
                  ? 'text-slate-100 bg-edge-600/15 border border-edge-600/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="truncate"
                >
                  {label}
                </motion.span>
              )}
            </button>
          ))}

          {/* Agent list */}
          {!sidebarCollapsed && agents.length > 0 && (
            <div className="pt-3">
              <p className="px-3 text-xs font-semibold text-slate-600 uppercase tracking-widest mb-2">
                Agents
              </p>
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => navigate(`/chat/${agent.id}`)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150
                    ${location.pathname === `/chat/${agent.id}`
                      ? 'text-slate-100 bg-white/8 border border-white/10'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                    }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: agent.color || '#6366f1', boxShadow: `0 0 6px ${agent.color || '#6366f1'}80` }}
                  />
                  <span className="truncate">{agent.name}</span>
                  {agent.indexed && (
                    <span className="ml-auto text-xs text-neon-green opacity-60">●</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Bottom: status + collapse */}
        <div className="p-2 border-t border-white/5 space-y-1">
          {/* Backend status */}
          <div className={`flex items-center gap-2 px-3 py-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {backendOk
              ? <span className="status-dot status-dot-green" />
              : <span className="status-dot status-dot-red" />
            }
            {!sidebarCollapsed && (
              <span className="text-xs text-slate-500">
                {backendOk ? 'Backend online' : 'Backend offline'}
              </span>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Custom title bar for non-Mac / Windows */}
        {!isMac && (
          <div className="h-8 titlebar-drag flex items-center justify-end px-2 bg-dark-600/50 border-b border-white/5">
            <div className="flex items-center gap-1 titlebar-no-drag">
              <button
                onClick={() => window.electronAPI?.minimize()}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-slate-500 hover:text-slate-300 text-xs"
              >
                ─
              </button>
              <button
                onClick={() => window.electronAPI?.maximize()}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-slate-500 hover:text-slate-300 text-xs"
              >
                □
              </button>
              <button
                onClick={() => window.electronAPI?.close()}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/20 text-slate-500 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}

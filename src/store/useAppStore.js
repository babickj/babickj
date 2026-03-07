import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Agents
      agents: [],
      activeAgentId: null,

      setAgents: (agents) => set({ agents }),
      setActiveAgent: (id) => set({ activeAgentId: id }),
      upsertAgent: (agent) => set((s) => {
        const existing = s.agents.findIndex(a => a.id === agent.id)
        if (existing >= 0) {
          const updated = [...s.agents]
          updated[existing] = agent
          return { agents: updated }
        }
        return { agents: [agent, ...s.agents] }
      }),
      removeAgent: (id) => set((s) => ({
        agents: s.agents.filter(a => a.id !== id),
        activeAgentId: s.activeAgentId === id ? null : s.activeAgentId,
      })),

      // UI state
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      currentView: 'home', // 'home' | 'chat' | 'create' | 'settings'
      setCurrentView: (v) => set({ currentView: v }),

      // Backend health
      backendHealth: null,
      setBackendHealth: (h) => set({ backendHealth: h }),
    }),
    {
      name: 'edgerunner-store',
      partialize: (s) => ({
        activeAgentId: s.activeAgentId,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
)

import React, { useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Shared/Layout'
import HomePage from './components/AgentCreator/HomePage'
import CreateAgentPage from './components/AgentCreator/CreateAgentPage'
import ChatPage from './components/Chat/ChatPage'
import SettingsPage from './components/Settings/SettingsPage'
import { useAppStore } from './store/useAppStore'
import { getAgents, getHealth } from './utils/api'

export default function App() {
  const { setAgents, setBackendHealth } = useAppStore()

  useEffect(() => {
    // Initial data load
    const loadData = async () => {
      try {
        const [agents, health] = await Promise.all([getAgents(), getHealth()])
        setAgents(agents)
        setBackendHealth(health)
      } catch (err) {
        console.warn('Backend not ready yet:', err.message)
        // Retry after 2s
        setTimeout(loadData, 2000)
      }
    }
    loadData()

    // Poll health every 30s
    const interval = setInterval(async () => {
      try {
        const health = await getHealth()
        setBackendHealth(health)
      } catch {
        setBackendHealth(null)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateAgentPage />} />
          <Route path="/create/:agentId" element={<CreateAgentPage />} />
          <Route path="/chat/:agentId" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}

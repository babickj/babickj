import axios from 'axios'

const BASE_URL = 'http://127.0.0.1:8765'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
})

// --- Agents ---
export const getAgents = () => api.get('/agents/').then(r => r.data)
export const createAgent = (data) => api.post('/agents/', data).then(r => r.data)
export const getAgent = (id) => api.get(`/agents/${id}`).then(r => r.data)
export const updateAgent = (id, data) => api.put(`/agents/${id}`, data).then(r => r.data)
export const deleteAgent = (id) => api.delete(`/agents/${id}`).then(r => r.data)
export const getAgentDocuments = (id) => api.get(`/agents/${id}/documents`).then(r => r.data)

// --- Settings ---
export const getSettings = () => api.get('/settings/').then(r => r.data)
export const updateSettings = (data) => api.put('/settings/', data).then(r => r.data)
export const getHealth = () => api.get('/settings/health').then(r => r.data)

// --- SSE Chat Stream ---
export function streamChat(agentId, query, history, callbacks) {
  const { onCitations, onToken, onDone, onError } = callbacks
  const url = `${BASE_URL}/chat/stream`

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, query, history }),
  }).then(async (resp) => {
    if (!resp.ok) {
      onError?.(`HTTP ${resp.status}`)
      return
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'citations') onCitations?.(event.data)
            else if (event.type === 'token') onToken?.(event.data)
            else if (event.type === 'done') onDone?.(event)
            else if (event.type === 'error') onError?.(event.data)
          } catch (e) {
            // skip malformed
          }
        }
      }
    }
  }).catch(err => onError?.(err.message))
}

// --- SSE Index Stream ---
export function streamIndex(agentId, callbacks) {
  const { onProgress, onComplete, onError } = callbacks
  const url = `${BASE_URL}/agents/${agentId}/index`

  fetch(url, { method: 'POST' }).then(async (resp) => {
    if (!resp.ok) {
      onError?.(`HTTP ${resp.status}`)
      return
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6))
            if (event.stage === 'complete') onComplete?.(event)
            else if (event.stage === 'error') onError?.(event.error)
            else onProgress?.(event)
          } catch (e) {
            // skip
          }
        }
      }
    }
  }).catch(err => onError?.(err.message))
}

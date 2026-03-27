import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({ baseURL: API_BASE, timeout: 120000 })

export const fetchKpis = () => api.get('/kpis').then(r => r.data)
export const fetchTopics = () => api.get('/topics').then(r => r.data)
export const fetchTrends = () => api.get('/trends').then(r => r.data)
export const fetchAlerts = () => api.get('/alerts').then(r => r.data)
export const fetchEntities = () => api.get('/entities').then(r => r.data)
export const analyzeText = (text: string) => api.post('/analyze', { text }).then(r => r.data)
export const searchData = (q: string, sentiment?: string, topic?: string, limit = 50) =>
  api.get('/search', { params: { q, sentiment, topic, limit } }).then(r => r.data)
export const fetchSample = (limit = 100) => api.get('/data/sample', { params: { limit } }).then(r => r.data)
export const runPipeline = (limit = 5000) => api.post(`/pipeline/run?limit=${limit}`).then(r => r.data)
export const healthCheck = () => api.get('/health').then(r => r.data)

export default api

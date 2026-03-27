import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { LayoutDashboard, Layers, TrendingUp, Search, Bell, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import Dashboard from './pages/Dashboard'
import TopicExplorer from './pages/TopicExplorer'
import TrendAnalysis from './pages/TrendAnalysis'
import SearchPage from './pages/SearchPage'
import AlertsPage from './pages/AlertsPage'
import AnalyzePage from './pages/AnalyzePage'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/topics', label: 'Topics', icon: Layers },
  { path: '/trends', label: 'Trends', icon: TrendingUp },
  { path: '/search', label: 'Search', icon: Search },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/analyze', label: 'Analyze', icon: Zap },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-dark-900/80 backdrop-blur-xl border-r border-dark-700/50 flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
              InsightIQ
            </h1>
            <p className="text-xs text-dark-400 mt-1">Customer Intelligence</p>
          </div>
          <nav className="flex-1 px-3 space-y-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800/50'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="p-4 m-3 rounded-xl bg-dark-800/50 border border-dark-700/30">
            <p className="text-xs text-dark-400">NLP Pipeline v1.0</p>
            <p className="text-xs text-dark-500 mt-1">BERT + BERTopic</p>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto bg-dark-950">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-8"
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/topics" element={<TopicExplorer />} />
              <Route path="/trends" element={<TrendAnalysis />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/analyze" element={<AnalyzePage />} />
            </Routes>
          </motion.div>
        </main>
      </div>
    </BrowserRouter>
  )
}

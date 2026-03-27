import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, MessageSquare, BarChart3, AlertTriangle } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'
import { fetchKpis, fetchTrends, fetchTopics } from '../api'

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#f59e0b',
}
const TOPIC_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

interface KpiData {
  total_mentions: number
  positive_pct: number
  negative_pct: number
  neutral_pct: number
  avg_score: number
  avg_engagement: number
}

export default function Dashboard() {
  const [kpis, setKpis] = useState<KpiData | null>(null)
  const [trends, setTrends] = useState<any>(null)
  const [topics, setTopics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchKpis(), fetchTrends(), fetchTopics()])
      .then(([k, t, tp]) => { setKpis(k); setTrends(t); setTopics(tp) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingState />
  if (!kpis) return <EmptyState />

  const sentimentPie = [
    { name: 'Positive', value: kpis.positive_pct, color: COLORS.positive },
    { name: 'Negative', value: kpis.negative_pct, color: COLORS.negative },
    { name: 'Neutral', value: kpis.neutral_pct, color: COLORS.neutral },
  ]

  const topicBar = topics?.topics
    ?.filter((t: any) => t.topic_id !== -1)
    ?.slice(0, 8)
    ?.map((t: any, i: number) => ({ name: t.label.split('(')[0].trim(), count: t.count, fill: TOPIC_COLORS[i % TOPIC_COLORS.length] })) || []

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-dark-100">Dashboard</h2>
        <p className="text-dark-400 mt-1">Real-time customer sentiment intelligence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={MessageSquare} label="Total Mentions" value={kpis.total_mentions.toLocaleString()} color="blue" />
        <KpiCard icon={TrendingUp} label="Positive" value={`${kpis.positive_pct}%`} color="green" />
        <KpiCard icon={TrendingDown} label="Negative" value={`${kpis.negative_pct}%`} color="red" />
        <KpiCard icon={BarChart3} label="Avg Engagement" value={kpis.avg_engagement.toFixed(0)} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="text-lg font-semibold mb-4">Sentiment Trend</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trends?.sentiment_daily?.slice(-30) || []}>
              <defs>
                <linearGradient id="gPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d?.slice(5, 10)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
              <Area type="monotone" dataKey="positive" stroke="#10b981" fill="url(#gPos)" strokeWidth={2} />
              <Area type="monotone" dataKey="negative" stroke="#ef4444" fill="url(#gNeg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Sentiment Split</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sentimentPie} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">
                {sentimentPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {sentimentPie.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                {s.name} ({s.value}%)
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Top Topics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topicBar} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {topicBar.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Alerts & Anomalies</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {(trends?.alerts || []).slice(0, 10).map((alert: any, i: number) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                alert.severity === 'high' ? 'bg-accent-red/5 border-accent-red/20' :
                alert.severity === 'medium' ? 'bg-accent-yellow/5 border-accent-yellow/20' :
                'bg-accent-blue/5 border-accent-blue/20'
              }`}>
                <AlertTriangle size={16} className={
                  alert.severity === 'high' ? 'text-accent-red' :
                  alert.severity === 'medium' ? 'text-accent-yellow' : 'text-accent-blue'
                } />
                <p className="text-sm text-dark-300">{alert.message}</p>
              </div>
            ))}
            {(!trends?.alerts || trends.alerts.length === 0) && (
              <p className="text-dark-500 text-sm text-center py-8">No alerts detected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-accent-blue/20 to-accent-blue/5 border-accent-blue/20',
    green: 'from-accent-green/20 to-accent-green/5 border-accent-green/20',
    red: 'from-accent-red/20 to-accent-red/5 border-accent-red/20',
    purple: 'from-accent-purple/20 to-accent-purple/5 border-accent-purple/20',
  }
  const iconColor: Record<string, string> = { blue: 'text-accent-blue', green: 'text-accent-green', red: 'text-accent-red', purple: 'text-accent-purple' }
  return (
    <motion.div whileHover={{ y: -2 }} className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5 transition-all`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-dark-800/50 ${iconColor[color]}`}><Icon size={20} /></div>
        <div>
          <p className="text-xs text-dark-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-dark-400 mt-4">Loading insights...</p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <BarChart3 size={48} className="text-dark-600 mx-auto" />
        <p className="text-dark-400 mt-4">No data available. Run the pipeline first.</p>
        <p className="text-dark-500 text-sm mt-1">POST /pipeline/run to start analysis</p>
      </div>
    </div>
  )
}

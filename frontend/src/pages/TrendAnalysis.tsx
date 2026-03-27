import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Zap, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell, Legend,
} from 'recharts'
import { fetchTrends } from '../api'

const TOPIC_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

export default function TrendAnalysis() {
  const [trends, setTrends] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrends().then(setTrends).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>

  const daily = trends?.sentiment_daily || []
  const weekly = trends?.sentiment_weekly || []
  const spikes = trends?.spikes || []
  const emerging = trends?.emerging_topics || []
  const shifts = trends?.sentiment_shifts || []
  const topicFreq = trends?.topic_frequency || []

  const topicTimeSeries = buildTopicTimeSeries(topicFreq)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Trend Analysis</h2>
        <p className="text-dark-400 mt-1">Temporal patterns, spikes, and emerging signals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Zap} label="Detected Spikes" value={spikes.length} color="red" />
        <StatCard icon={TrendingUp} label="Emerging Topics" value={emerging.length} color="green" />
        <StatCard icon={AlertTriangle} label="Sentiment Shifts" value={shifts.length} color="yellow" />
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Daily Sentiment Ratio</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={daily.slice(-60)}>
            <defs>
              <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
              <linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={d => d?.slice(5, 10)} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 1]} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="positive_ratio" name="Positive %" stroke="#10b981" fill="url(#gp)" strokeWidth={2} />
            <Area type="monotone" dataKey="negative_ratio" name="Negative %" stroke="#ef4444" fill="url(#gn)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Negative Sentiment Spikes</h3>
          {spikes.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {spikes.map((s: any, i: number) => (
                <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className={`flex items-center justify-between p-3 rounded-xl border ${s.severity === 'high' ? 'bg-accent-red/5 border-accent-red/20' : 'bg-accent-yellow/5 border-accent-yellow/20'}`}>
                  <div>
                    <p className="text-sm font-medium">{s.date?.slice(0, 10)}</p>
                    <p className="text-xs text-dark-400">{s.total_mentions} mentions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-accent-red">{(s.value * 100).toFixed(1)}%</p>
                    <p className="text-xs text-dark-500">z: {s.z_score}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : <p className="text-dark-500 text-sm text-center py-8">No significant spikes detected</p>}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Emerging Topics</h3>
          {emerging.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {emerging.slice(0, 10).map((e: any, i: number) => (
                <motion.div key={i} initial={{ x: 10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-accent-green/5 border border-accent-green/20">
                  <div>
                    <p className="text-sm font-medium">{e.topic}</p>
                    <p className="text-xs text-dark-400">{e.recent_count} recent mentions</p>
                  </div>
                  <div className="flex items-center gap-1 text-accent-green">
                    <ArrowUpRight size={14} />
                    <span className="text-sm font-mono">{e.growth_rate > 100 ? 'NEW' : `+${(e.growth_rate * 100).toFixed(0)}%`}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : <p className="text-dark-500 text-sm text-center py-8">No emerging topics detected</p>}
        </div>
      </div>

      {shifts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Sentiment Shifts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {shifts.map((s: any, i: number) => (
              <div key={i} className={`p-4 rounded-xl border ${s.direction === 'worsening' ? 'bg-accent-red/5 border-accent-red/20' : 'bg-accent-green/5 border-accent-green/20'}`}>
                <div className="flex items-center gap-2">
                  {s.direction === 'worsening' ? <ArrowDownRight size={16} className="text-accent-red" /> : <ArrowUpRight size={16} className="text-accent-green" />}
                  <span className="text-sm font-medium capitalize">{s.direction}</span>
                </div>
                <p className="text-xs text-dark-400 mt-1">{s.date?.slice(0, 10)}</p>
                <p className="text-xs text-dark-500 mt-1">Neg: {(s.negative_change * 100).toFixed(1)}% | Pos: {(s.positive_change * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {topicTimeSeries.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Topic Frequency Over Time</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={topicTimeSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="period" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={d => d?.slice(5, 10)} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
              <Legend />
              {getTopTopics(topicFreq).map((topic, i) => (
                <Line key={topic} type="monotone" dataKey={topic} stroke={TOPIC_COLORS[i % TOPIC_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: any) {
  const colors: Record<string, string> = {
    red: 'text-accent-red bg-accent-red/10', green: 'text-accent-green bg-accent-green/10', yellow: 'text-accent-yellow bg-accent-yellow/10',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}><Icon size={22} /></div>
      <div><p className="text-xs text-dark-400 uppercase tracking-wider">{label}</p><p className="text-2xl font-bold">{value}</p></div>
    </div>
  )
}

function getTopTopics(data: any[]): string[] {
  const counts: Record<string, number> = {}
  data.forEach(d => { if (d.topic) counts[d.topic] = (counts[d.topic] || 0) + d.count })
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0])
}

function buildTopicTimeSeries(data: any[]): any[] {
  const periods: Record<string, Record<string, number>> = {}
  data.forEach(d => {
    if (!periods[d.period]) periods[d.period] = {}
    periods[d.period][d.topic] = d.count
  })
  return Object.entries(periods).sort().map(([period, topics]) => ({ period, ...topics }))
}

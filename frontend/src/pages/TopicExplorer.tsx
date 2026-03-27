import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, ChevronDown, ChevronUp, Hash } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fetchTopics } from '../api'

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

export default function TopicExplorer() {
  const [data, setData] = useState<any>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopics().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>

  const topics = data?.topics?.filter((t: any) => t.topic_id !== -1) || []
  const chartData = topics.slice(0, 12).map((t: any, i: number) => ({
    name: t.label.split('(')[0].trim().slice(0, 20),
    count: t.count,
    fill: COLORS[i % COLORS.length],
  }))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Topic Explorer</h2>
        <p className="text-dark-400 mt-1">{data?.total_topics || 0} topics discovered via BERTopic clustering</p>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Topic Distribution</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((e: any, i: number) => <Cell key={i} fill={e.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        {topics.map((topic: any, i: number) => (
          <motion.div
            key={topic.topic_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="card cursor-pointer"
            onClick={() => setExpanded(expanded === topic.topic_id ? null : topic.topic_id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <div>
                  <h4 className="font-medium">{topic.label}</h4>
                  <p className="text-xs text-dark-400">{topic.count} documents</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-1">
                  {topic.keywords.slice(0, 5).map((kw: any) => (
                    <span key={kw.word} className="badge bg-dark-700/50 text-dark-300">
                      <Hash size={10} className="mr-0.5" />{kw.word}
                    </span>
                  ))}
                </div>
                {expanded === topic.topic_id ? <ChevronUp size={18} className="text-dark-400" /> : <ChevronDown size={18} className="text-dark-400" />}
              </div>
            </div>

            <AnimatePresence>
              {expanded === topic.topic_id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-4 pt-4 border-t border-dark-700/50 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-dark-300 mb-2">Keywords & Weights</h5>
                      <div className="space-y-1.5">
                        {topic.keywords.map((kw: any) => (
                          <div key={kw.word} className="flex items-center gap-2">
                            <div className="flex-1 bg-dark-700/30 rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${kw.weight * 100}%`, background: COLORS[i % COLORS.length] }} />
                            </div>
                            <span className="text-xs text-dark-400 w-24 truncate">{kw.word}</span>
                            <span className="text-xs text-dark-500 w-12 text-right">{(kw.weight * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-dark-300 mb-2">Example Texts</h5>
                      <div className="space-y-2">
                        {(topic.representative_docs || []).map((doc: string, j: number) => (
                          <p key={j} className="text-xs text-dark-400 bg-dark-900/50 p-3 rounded-lg leading-relaxed">{doc.slice(0, 200)}...</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

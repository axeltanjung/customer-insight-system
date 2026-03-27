import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, MessageSquare } from 'lucide-react'
import { searchData } from '../api'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [sentiment, setSentiment] = useState<string>('')
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchData(query, sentiment || undefined)
      setResults(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Search & Drill-down</h2>
        <p className="text-dark-400 mt-1">Find specific mentions and filter by sentiment</p>
      </div>

      <div className="card">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              className="input-field pl-11"
              placeholder="Search keywords, products, features..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select className="input-field w-40" value={sentiment} onChange={e => setSentiment(e.target.value)}>
            <option value="">All Sentiment</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </select>
          <button className="btn-primary flex items-center gap-2" onClick={handleSearch} disabled={loading}>
            <Filter size={16} />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-4">
          <p className="text-sm text-dark-400">{results.count} results for "{results.query}"</p>
          <div className="space-y-3">
            {results.results.map((r: any, i: number) => (
              <motion.div
                key={r.id || i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-dark-200 leading-relaxed">{r.clean_text}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-dark-500">
                      <span>{r.timestamp?.slice(0, 10)}</span>
                      <span>r/{r.subreddit}</span>
                      <span>Score: {r.score}</span>
                      {r.topic_label && <span className="badge bg-dark-700/50 text-dark-300">{r.topic_label}</span>}
                    </div>
                  </div>
                  <span className={`badge ${
                    r.sentiment_label === 'positive' ? 'badge-positive' :
                    r.sentiment_label === 'negative' ? 'badge-negative' : 'badge-neutral'
                  }`}>
                    {r.sentiment_label} ({(r.sentiment_score * 100).toFixed(0)}%)
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!results && (
        <div className="flex flex-col items-center justify-center py-20 text-dark-500">
          <MessageSquare size={48} className="mb-4 opacity-30" />
          <p>Enter a keyword to search through analyzed mentions</p>
        </div>
      )}
    </div>
  )
}

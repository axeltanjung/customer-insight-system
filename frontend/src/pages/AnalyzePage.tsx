import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, Send } from 'lucide-react'
import { analyzeText } from '../api'

export default function AnalyzePage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    try {
      const data = await analyzeText(text)
      setResult(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Live Analysis</h2>
        <p className="text-dark-400 mt-1">Analyze any text for sentiment, topic, and entities in real-time</p>
      </div>

      <div className="card">
        <textarea
          className="input-field min-h-[120px] resize-none"
          placeholder="Paste any customer feedback, review, or comment here..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="flex justify-between items-center mt-4">
          <p className="text-xs text-dark-500">{text.length} characters</p>
          <button className="btn-primary flex items-center gap-2" onClick={handleAnalyze} disabled={loading || !text.trim()}>
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">Sentiment</h3>
            <div className="text-center py-4">
              <span className={`text-4xl font-bold ${
                result.sentiment.label === 'positive' ? 'text-accent-green' :
                result.sentiment.label === 'negative' ? 'text-accent-red' : 'text-accent-yellow'
              }`}>
                {result.sentiment.label.toUpperCase()}
              </span>
              <p className="text-dark-400 mt-2 text-sm">
                Confidence: {(result.sentiment.score * 100).toFixed(1)}%
              </p>
              {result.sentiment.vader_compound !== undefined && (
                <p className="text-dark-500 text-xs mt-1">VADER: {result.sentiment.vader_compound.toFixed(3)}</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">Topic</h3>
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-purple/10 border border-accent-purple/20 rounded-xl">
                <Zap size={16} className="text-accent-purple" />
                <span className="text-accent-purple font-medium">{result.topic.label || 'Unknown'}</span>
              </div>
              {result.topic.confidence > 0 && (
                <p className="text-dark-400 mt-3 text-sm">Confidence: {(result.topic.confidence * 100).toFixed(1)}%</p>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">Named Entities</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {result.entities.length > 0 ? result.entities.map((ent: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 bg-dark-700/30 rounded-lg">
                  <span className="text-sm">{ent.text}</span>
                  <span className="badge bg-accent-cyan/20 text-accent-cyan">{ent.label}</span>
                </div>
              )) : (
                <p className="text-dark-500 text-sm text-center py-4">No entities detected</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

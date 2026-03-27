import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, AlertTriangle, TrendingUp, Zap } from 'lucide-react'
import { fetchAlerts } from '../api'

const iconMap: Record<string, any> = {
  negative_spike: AlertTriangle,
  sentiment_shift: TrendingUp,
  emerging_topic: Zap,
}
const colorMap: Record<string, { bg: string; border: string; icon: string }> = {
  high: { bg: 'bg-accent-red/5', border: 'border-accent-red/20', icon: 'text-accent-red' },
  medium: { bg: 'bg-accent-yellow/5', border: 'border-accent-yellow/20', icon: 'text-accent-yellow' },
  info: { bg: 'bg-accent-blue/5', border: 'border-accent-blue/20', icon: 'text-accent-blue' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts().then(d => setAlerts(d.alerts || [])).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>

  const grouped = {
    high: alerts.filter(a => a.severity === 'high'),
    medium: alerts.filter(a => a.severity === 'medium'),
    info: alerts.filter(a => a.severity === 'info'),
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Alert Center</h2>
          <p className="text-dark-400 mt-1">{alerts.length} active alerts from automated monitoring</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-negative">{grouped.high.length} Critical</span>
          <span className="badge badge-neutral">{grouped.medium.length} Warning</span>
          <span className="badge bg-accent-blue/20 text-accent-blue">{grouped.info.length} Info</span>
        </div>
      </div>

      {['high', 'medium', 'info'].map(severity => {
        const items = grouped[severity as keyof typeof grouped]
        if (items.length === 0) return null
        const colors = colorMap[severity]
        return (
          <div key={severity}>
            <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wider mb-3">
              {severity === 'high' ? 'Critical' : severity === 'medium' ? 'Warnings' : 'Information'}
            </h3>
            <div className="space-y-3">
              {items.map((alert, i) => {
                const Icon = iconMap[alert.type] || Bell
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-start gap-4 p-4 rounded-xl border ${colors.bg} ${colors.border}`}
                  >
                    <div className={`p-2 rounded-lg bg-dark-800/50 ${colors.icon}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <div className="flex gap-4 mt-2 text-xs text-dark-500">
                        <span>Type: {alert.type.replace('_', ' ')}</span>
                        {alert.data?.date && <span>Date: {alert.data.date.slice(0, 10)}</span>}
                        {alert.data?.z_score && <span>Z-score: {alert.data.z_score}</span>}
                        {alert.data?.growth_rate && <span>Growth: {alert.data.growth_rate > 100 ? 'NEW' : `${(alert.data.growth_rate * 100).toFixed(0)}%`}</span>}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      })}

      {alerts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-dark-500">
          <Bell size={48} className="mb-4 opacity-30" />
          <p>No alerts — everything looks normal</p>
        </div>
      )}
    </div>
  )
}

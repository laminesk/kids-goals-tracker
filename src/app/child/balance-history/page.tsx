'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Clock, Gift, CheckCircle, Plus, Minus, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { formatDateTime, formatDate } from '@/utils/helpers'
import Link from 'next/link'
import { TaskInstance, Task, PointsAdjustment, RewardUnlock, Reward } from '@/types/database'

type BalanceEntry = {
  date: string
  type: 'task_approved' | 'reward_spent' | 'bonus' | 'malus'
  points: number
  balance: number
  label: string
  detail?: string
}

export default function ChildBalanceHistoryPage() {
  const { session } = useAuth()
  const [entries, setEntries] = useState<BalanceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBalance, setCurrentBalance] = useState(0)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      // 1. Approved tasks (points earned)
      const { data: approvedTasks } = await supabase
        .from('task_instances')
        .select(`
          *,
          tasks!inner (name, points)
        `)
        .eq('child_id', session.user.id)
        .eq('status', 'approved')
        .order('approved_by_parent_at', { ascending: true })

      // 2. Settled rewards (points spent)
      const { data: settledRewards } = await supabase
        .from('reward_unlocks')
        .select(`
          *,
          rewards!inner (name, cost_points)
        `)
        .eq('child_id', session.user.id)
        .not('settled_at', 'is', null)
        .order('settled_at', { ascending: true })

      // 3. Points adjustments (bonus/malus)
      const { data: adjustments } = await supabase
        .from('points_adjustments')
        .select('*')
        .eq('child_id', session.user.id)
        .order('created_at', { ascending: true })

      // Combine all entries with chronological order
      const allEntries: BalanceEntry[] = []

      // Add approved tasks
      approvedTasks?.forEach(t => {
        allEntries.push({
          date: t.approved_by_parent_at || t.created_at,
          type: 'task_approved',
          points: t.tasks?.points || 0,
          balance: 0, // will calculate after sorting
          label: (t.tasks as Task)?.name || 'Tâche',
          detail: `Approuvée le ${formatDateTime(t.approved_by_parent_at || '')}`,
        })
      })

      // Add settled rewards
      settledRewards?.forEach(r => {
        allEntries.push({
          date: r.settled_at || r.created_at,
          type: 'reward_spent',
          points: -(r.rewards?.cost_points || 0),
          balance: 0,
          label: (r.rewards as Reward)?.name || 'Récompense',
          detail: `Soldée le ${formatDateTime(r.settled_at || '')}`,
        })
      })

      // Add adjustments
      adjustments?.forEach(a => {
        allEntries.push({
          date: a.created_at,
          type: a.type === 'bonus' ? 'bonus' : 'malus',
          points: a.type === 'bonus' ? a.points : -a.points,
          balance: 0,
          label: a.type === 'bonus' ? 'Bonus' : 'Malus',
          detail: a.comment || undefined,
        })
      })

      // Sort by date
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Calculate running balance
      let runningBalance = 0
      allEntries.forEach(entry => {
        runningBalance += entry.points
        entry.balance = runningBalance
      })

      setEntries(allEntries.reverse()) // Most recent first
      setCurrentBalance(runningBalance)
      setLoading(false)
    }

    fetchData()
  }, [session])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse"><div className="h-6 w-48 bg-gray-200 rounded" /></div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  const totalEarned = entries.filter(e => e.points > 0).reduce((sum, e) => sum + e.points, 0)
  const totalSpent = Math.abs(entries.filter(e => e.points < 0).reduce((sum, e) => sum + e.points, 0))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/child">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Historique du solde</h1>
          <p className="text-gray-600">Suis l'évolution de tes points</p>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-primary-100 text-sm">Solde actuel</p>
              <p className="text-3xl font-bold">{currentBalance} <span className="text-lg">PTS</span></p>
              <Trophy className="w-8 h-8 mx-auto mt-2 opacity-80" />
            </div>
            <div className="border-l border-white/20">
              <p className="text-primary-100 text-sm">Total gagné</p>
              <p className="text-2xl font-bold text-green-100">+{totalEarned} pts</p>
              <TrendingUp className="w-6 h-6 mx-auto mt-2 text-green-200" />
            </div>
            <div className="border-l border-white/20">
              <p className="text-primary-100 text-sm">Total dépensé</p>
              <p className="text-2xl font-bold text-red-100">-{totalSpent} pts</p>
              <TrendingDown className="w-6 h-6 mx-auto mt-2 text-red-200" />
            </div>
          </div>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun mouvement</h3>
            <p className="text-gray-600 mb-4">Ton historique apparaîtra ici quand tu auras des tâches approuvées</p>
            <Link href="/child">
              <Button variant="primary"><Plus className="w-4 h-4 mr-2" /> Voir mes tâches</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry, index) => (
                    <tr key={`${entry.date}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{formatDateTime(entry.date)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          entry.type === 'task_approved' ? 'success' :
                          entry.type === 'reward_spent' ? 'info' :
                          entry.type === 'bonus' ? 'success' : 'danger'
                        } className="gap-1">
                          {entry.type === 'task_approved' && <CheckCircle className="w-3 h-3" />}
                          {entry.type === 'reward_spent' && <Gift className="w-3 h-3" />}
                          {entry.type === 'bonus' && <TrendingUp className="w-3 h-3" />}
                          {entry.type === 'malus' && <TrendingDown className="w-3 h-3" />}
                          <span className="capitalize">
                            {entry.type === 'task_approved' ? 'Tâche validée' :
                             entry.type === 'reward_spent' ? 'Récompense' :
                             entry.type === 'bonus' ? 'Bonus' : 'Malus'}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{entry.label}</p>
                        {entry.detail && <p className="text-sm text-gray-500">{entry.detail}</p>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-medium ${entry.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.points > 0 ? '+' : ''}{entry.points} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-semibold text-gray-900">{entry.balance} pts</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
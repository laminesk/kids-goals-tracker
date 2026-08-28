'use client'

import { useEffect, useState } from 'react'
import { Calendar, Filter, X, ChevronDown, ChevronUp, User, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { formatDate, cn } from '@/utils/helpers'
import { TaskInstance, Child, Task } from '@/types/database'

const DATE_FILTERS = [
  { value: '7d', label: 'Derniers 7 jours' },
  { value: '14d', label: 'Dernières 2 semaines' },
  { value: '30d', label: 'Dernier mois' },
]

export default function ChildHistoryPage() {
  const { session } = useAuth()
  const [missedTasks, setMissedTasks] = useState<TaskInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<string>('30d')

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      await fetchMissedTasks()
    }
    fetchData()
  }, [session])

  const fetchMissedTasks = async () => {
    if (!session?.user) return
    const supabase = getSupabase()

    let dateThreshold = new Date()
    if (dateFilter === '7d') dateThreshold.setDate(dateThreshold.getDate() - 7)
    else if (dateFilter === '14d') dateThreshold.setDate(dateThreshold.getDate() - 14)
    else dateThreshold.setMonth(dateThreshold.getMonth() - 1)

    const { data } = await supabase
      .from('task_instances')
      .select(`
        *,
        tasks (name, points),
        children (name)
      `)
      .eq('child_id', session.user.id)
      .or('status.eq.rejected,and(status.eq.pending,date.lt.' + new Date().toISOString().split('T')[0] + ')')
      .gte('date', dateThreshold.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (data) setMissedTasks(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchMissedTasks()
  }, [dateFilter, session])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rejected': return 'Rejetée'
      case 'pending': return 'Non faite (expirée)'
      default: return status
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'rejected': return 'danger'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse"><div className="h-6 w-48 bg-gray-200 rounded" /></div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Historique tâches non-faites</h1>
          <p className="text-gray-600">Consulte tes tâches non complétées</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            options={DATE_FILTERS}
            className="w-full sm:w-64"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {missedTasks.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tâche non-faite</h3>
              <p className="text-gray-600">Toutes les tâches ont été complétées sur la période sélectionnée !</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tâche</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date limite</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points perdus</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {missedTasks.map((instance) => (
                    <tr key={instance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {(instance.tasks as Task)?.name || 'Tâche inconnue'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          {formatDate(instance.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-red-600 font-medium">
                          -{(instance.tasks as Task)?.points || 0} pts
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(instance.status)}>
                          {getStatusLabel(instance.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {missedTasks.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {missedTasks.length} tâche(s) non-faite(s) au total
        </p>
      )}
    </div>
  )
}
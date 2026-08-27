'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, User, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { formatDate, cn } from '@/utils/helpers'
import Link from 'next/link'
import { TaskInstance, Task, Child } from '@/types/database'

export default function ParentApprovalsPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [pendingApprovals, setPendingApprovals] = useState<TaskInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      const { data: childrenData } = await supabase
        .from('children')
        .select('id')
        .eq('family_id', session.user.family_id)

      if (!childrenData) {
        setLoading(false)
        return
      }

      const childIds = childrenData.map(c => c.id)

      const { data } = await supabase
        .from('task_instances')
        .select(`
          *,
          tasks (name, points),
          children (name)
        `)
        .in('child_id', childIds)
        .eq('status', 'pending')
        .not('validated_by_child_at', 'is', null)
        .is('approved_by_parent_at', null)
        .order('validated_by_child_at', { ascending: false })

      if (data) setPendingApprovals(data)
      setLoading(false)
    }
    fetchData()
  }, [session])

  const handleApprove = async (instanceId: string, childId: string, points: number) => {
    setApprovingId({ id: instanceId, action: 'approve' })
    const supabase = getSupabase()

    const { error } = await supabase
      .from('task_instances')
      .update({ 
        status: 'approved',
        approved_by_parent_at: new Date().toISOString(),
      })
      .eq('id', instanceId)

    if (!error) {
      addToast({ type: 'success', title: 'Tâche approuvée', message: `+${points} pts crédités` })
      setPendingApprovals(prev => prev.filter(i => i.id !== instanceId))
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible d\'approuver' })
    }
    setApprovingId(null)
  }

  const handleReject = async (instanceId: string) => {
    setApprovingId({ id: instanceId, action: 'reject' })
    const supabase = getSupabase()

    const { error } = await supabase
      .from('task_instances')
      .update({ 
        status: 'rejected',
        approved_by_parent_at: new Date().toISOString(),
        validated_by_child_at: null, // Reset so child can re-validate
      })
      .eq('id', instanceId)

    if (!error) {
      addToast({ type: 'success', title: 'Tâche rejetée', message: 'L\'enfant peut la re-valider' })
      setPendingApprovals(prev => prev.filter(i => i.id !== instanceId))
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de rejeter' })
    }
    setApprovingId(null)
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
          <Link href="/parent">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Tâches à approuver</h1>
          <p className="text-gray-600">{pendingApprovals.length} validation(s) en attente</p>
        </div>
      </div>

      {pendingApprovals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune validation en attente</h3>
            <p className="text-gray-600">Les tâches validées par les enfants apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tâche</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enfant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validée le</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingApprovals.map((instance) => (
                    <tr key={instance.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {(instance.tasks as Task)?.name || 'Tâche inconnue'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium">
                            {(instance.children as Child)?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-sm text-gray-700">
                            {(instance.children as Child)?.name || 'Inconnu'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">+{(instance.tasks as Task)?.points || 0} pts</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">
                          {formatDate(instance.validated_by_child_at || '')} à {new Date(instance.validated_by_child_at || '').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApprove(instance.id, instance.child_id, (instance.tasks as Task)?.points || 0)}
                            loading={approvingId?.id === instance.id && approvingId?.action === 'approve'}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(instance.id)}
                            loading={approvingId?.id === instance.id && approvingId?.action === 'reject'}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
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
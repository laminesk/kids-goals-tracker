'use client'

import { useEffect, useState } from 'react'
import { Users, Target, Gift, Clock, TrendingUp, CheckCircle, XCircle, ClipboardCheck, Clock as ClockIcon, ArrowUp, ArrowDown, MessageSquare, Plus, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { formatDate, cn } from '@/utils/helpers'
import Link from 'next/link'
import { TaskInstance, Child, Task } from '@/types/database'

export default function ParentDashboardPage() {
  const { session } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [stats, setStats] = useState<Record<string, { completed: number; missed: number; points: number }>>({})
  const [pendingApprovals, setPendingApprovals] = useState<TaskInstance[]>([])
  const [recentValidated, setRecentValidated] = useState<TaskInstance[]>([])
  const [recentNonValidated, setRecentNonValidated] = useState<TaskInstance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', session.user.family_id)
        .order('created_at')

      if (childrenData) {
        setChildren(childrenData)

        const oneMonthAgo = new Date()
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

        for (const child of childrenData) {
          const { data: instances } = await supabase
            .from('task_instances')
            .select(`
              *,
              tasks (points)
            `)
            .eq('child_id', child.id)
            .gte('created_at', oneMonthAgo.toISOString())

          const completed = instances?.filter(i => i.status === 'approved').length || 0
          const missed = instances?.filter(i => i.status === 'rejected' || (i.status === 'pending' && new Date(i.date) < new Date())).length || 0
          const points = instances
            ?.filter(i => i.status === 'approved')
            .reduce((sum, i) => sum + (i.tasks?.points || 0), 0) || 0

          setStats(prev => ({ ...prev, [child.id]: { completed, missed, points } }))
        }

        // Fetch pending approvals (validated by child, waiting for parent)
        const { data: pendingData } = await supabase
          .from('task_instances')
          .select(`
            *,
            tasks (name, points),
            children (name)
          `)
          .in('child_id', childrenData.map(c => c.id))
          .eq('status', 'pending')
          .not('validated_by_child_at', 'is', null)
          .is('approved_by_parent_at', null)
          .order('validated_by_child_at', { ascending: false })
          .limit(10)

        if (pendingData) setPendingApprovals(pendingData)

        // Fetch last 4 validated (approved) tasks
        const { data: validatedData } = await supabase
          .from('task_instances')
          .select(`
            *,
            tasks (name, points),
            children (name)
          `)
          .in('child_id', childrenData.map(c => c.id))
          .eq('status', 'approved')
          .order('approved_by_parent_at', { ascending: false })
          .limit(4)

        if (validatedData) setRecentValidated(validatedData)

        // Fetch last 4 non-validated (rejected) tasks
        const { data: nonValidatedData } = await supabase
          .from('task_instances')
          .select(`
            *,
            tasks (name, points),
            children (name)
          `)
          .in('child_id', childrenData.map(c => c.id))
          .eq('status', 'rejected')
          .order('approved_by_parent_at', { ascending: false })
          .limit(4)

        if (nonValidatedData) setRecentNonValidated(nonValidatedData)
      }
      setLoading(false)
    }

    fetchData()
  }, [session])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-24" /></Card>
          ))}
        </div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-600">Vue d'ensemble de votre famille</p>
        </div>
        <div className="flex gap-3">
                <Link href="/parent/tasks">
                  <Button>
                    <Target className="w-4 h-4 mr-2" />
                    Nouvelle tâche
                  </Button>
                </Link>
                <Link href="/parent/rewards">
                  <Button variant="outline">
                    <Gift className="w-4 h-4 mr-2" />
                    Nouvelle récompense
                  </Button>
                </Link>
                <Link href="/parent/adjustments">
                  <Button variant="outline">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Bonus / Malus
                  </Button>
                </Link>
              </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {children.map((child) => {
          const childStats = stats[child.id] || { completed: 0, missed: 0, points: 0 }
          return (
            <Card key={child.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Solde points</p>
                    <p className="text-3xl font-bold text-primary-600">{childStats.points} pts</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{child.name}</h3>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>{childStats.completed} faites</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span>{childStats.missed} non-faites</span>
                  </div>
                </div>
                <Link href="/parent/tasks" className="mt-4 block text-center">
                  <Button variant="outline" size="sm" className="w-full">
                    Voir tâches
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
        {children.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-4">
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun enfant ajouté</h3>
              <p className="text-gray-600 mb-4">Ajoutez vos enfants dans les paramètres pour commencer</p>
              <Link href="/parent/settings">
                <Button>Aller aux paramètres</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 1. Tâches à approuver (en attente) */}
      {pendingApprovals.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <ClipboardCheck className="w-5 h-5" />
              Tâches à approuver ({pendingApprovals.length})
            </CardTitle>
            <Link href="/parent/approvals">
              <Button variant="ghost" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.map((instance) => (
                <div key={instance.id} className="p-3 bg-white border border-yellow-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600">
                        <ClipboardCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {(instance.tasks as Task)?.name || 'Tâche inconnue'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(instance.children as Child)?.name || 'Enfant'} • Validée le {formatDate(instance.validated_by_child_at || '')} à {new Date(instance.validated_by_child_at || '').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">En attente</Badge>
                      <Badge variant="info">+{(instance.tasks as Task)?.points || 0} pts</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Dernières 4 tâches validées */}
      {recentValidated.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Dernières tâches validées (4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentValidated.map((instance) => (
                <div key={instance.id} className="p-3 bg-white border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {(instance.tasks as Task)?.name || 'Tâche inconnue'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(instance.children as Child)?.name || 'Enfant'} • Approuvée le {formatDate(instance.approved_by_parent_at || '')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">+{(instance.tasks as Task)?.points || 0} pts</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. Dernières 4 non validées (rejetées) */}
      {recentNonValidated.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              Dernières non validées (4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentNonValidated.map((instance) => (
                <div key={instance.id} className="p-3 bg-white border border-red-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {(instance.tasks as Task)?.name || 'Tâche inconnue'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {(instance.children as Child)?.name || 'Enfant'} • Rejetée le {formatDate(instance.approved_by_parent_at || '')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="danger">Rejetée</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity fallback - if no specific sections have data */}
      {pendingApprovals.length === 0 && recentValidated.length === 0 && recentNonValidated.length === 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Activité récente</CardTitle>
            <Link href="/parent/tasks">
              <Button variant="ghost" size="sm">Voir tout</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Aucune activité récente</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
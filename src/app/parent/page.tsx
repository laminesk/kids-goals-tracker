'use client'

import { useEffect, useState } from 'react'
import { Users, Target, Gift, Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
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
  const [recentActivity, setRecentActivity] = useState<TaskInstance[]>([])
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

        const { data: activity } = await supabase
          .from('task_instances')
          .select(`
            *,
            tasks (name, points),
            children (name)
          `)
          .in('child_id', childrenData.map(c => c.id))
          .order('created_at', { ascending: false })
          .limit(10)

        if (activity) setRecentActivity(activity)
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Activité récente</CardTitle>
          <Link href="/parent/tasks">
            <Button variant="ghost" size="sm">Voir tout</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((instance) => (
                <div key={instance.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      instance.status === 'approved' ? 'bg-green-100 text-green-600' :
                      instance.status === 'rejected' ? 'bg-red-100 text-red-600' :
                      'bg-yellow-100 text-yellow-600'
                    )}>
                      {instance.status === 'approved' && <CheckCircle className="w-5 h-5" />}
                      {instance.status === 'rejected' && <XCircle className="w-5 h-5" />}
                      {instance.status === 'pending' && <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {(instance.tasks as Task)?.name || 'Tâche inconnue'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(instance.children as Child)?.name || 'Enfant'} • {formatDate(instance.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={cn(
                      'font-medium',
                      instance.status === 'approved' ? 'text-green-600' :
                      instance.status === 'rejected' ? 'text-red-600' :
                      'text-yellow-600'
                    )}>
                      +{(instance.tasks as Task)?.points || 0} pts
                    </span>
                    <Badge variant={
                      instance.status === 'approved' ? 'success' :
                      instance.status === 'rejected' ? 'danger' : 'warning'
                    }>
                      {instance.status === 'approved' ? 'Approuvée' :
                       instance.status === 'rejected' ? 'Rejetée' : 'En attente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
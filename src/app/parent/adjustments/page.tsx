'use client'

import { useEffect, useState } from 'react'
import { Plus, Minus, MessageSquare, User, ArrowLeft, TrendingUp, TrendingDown, CheckCircle, Gift, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/utils/helpers'
import Link from 'next/link'
import { Child, PointsAdjustment, AdjustmentType, TaskInstance, Task, RewardUnlock, Reward } from '@/types/database'

export default function ParentAdjustmentsPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [children, setChildren] = useState<Child[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingChildId, setEditingChildId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    type: 'bonus' as AdjustmentType,
    points: '',
    comment: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('family_id', session.user.family_id)
        .order('created_at')

      if (childrenData) setChildren(childrenData)

      const childIds = childrenData?.map(c => c.id) || []
      if (childIds.length > 0) {
        // Fetch all three types of movements
        const [adjData, approvedTasks, settledRewards] = await Promise.all([
          supabase
            .from('points_adjustments')
            .select(`
              *,
              children (id, name)
            `)
            .in('child_id', childIds)
            .order('created_at', { ascending: false })
            .limit(50),
          supabase
            .from('task_instances')
            .select(`
              *,
              tasks!inner (name, points),
              children (id, name)
            `)
            .in('child_id', childIds)
            .eq('status', 'approved')
            .order('approved_by_parent_at', { ascending: false })
            .limit(50),
          supabase
            .from('reward_unlocks')
            .select(`
              *,
              rewards!inner (name, cost_points),
              children (id, name)
            `)
            .in('child_id', childIds)
            .not('settled_at', 'is', null)
            .order('settled_at', { ascending: false })
            .limit(50),
        ])

        // Combine all movements into a unified history
        const allMovements: any[] = []

        // Adjustments (bonus/malus)
        adjData.data?.forEach(a => {
          allMovements.push({
            id: a.id,
            type: a.type === 'bonus' ? 'bonus' : 'malus',
            child_id: a.child_id,
            child: a.children,
            points: a.type === 'bonus' ? a.points : -a.points,
            label: a.type === 'bonus' ? 'Bonus' : 'Malus',
            detail: a.comment,
            date: a.created_at,
            source: 'adjustment',
          })
        })

        // Approved tasks
        approvedTasks.data?.forEach(t => {
          allMovements.push({
            id: t.id,
            type: 'task_approved',
            child_id: t.child_id,
            child: t.children,
            points: (t.tasks as any)?.[0]?.points || 0,
            label: (t.tasks as any)?.[0]?.name || 'Tâche',
            detail: `Tâche approuvée`,
            date: t.approved_by_parent_at || t.created_at,
            source: 'task',
          })
        })

        // Settled rewards
        settledRewards.data?.forEach(r => {
          allMovements.push({
            id: r.id,
            type: 'reward_spent',
            child_id: r.child_id,
            child: r.children,
            points: -((r.rewards as any)?.[0]?.cost_points || 0),
            label: (r.rewards as any)?.[0]?.name || 'Récompense',
            detail: `Récompense soldée`,
            date: r.settled_at || r.created_at,
            source: 'reward',
          })
        })

        // Sort by date descending (most recent first)
        allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // Limit to 50 most recent
        setMovements(allMovements.slice(0, 50))
      }
      setLoading(false)
    }
    fetchData()
  }, [session])

  const handleOpenModal = (childId: string) => {
    setEditingChildId(childId)
    setFormData({ type: 'bonus', points: '', comment: '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user || !editingChildId || !formData.points) return

    const points = parseInt(formData.points, 10)
    if (isNaN(points) || points <= 0) {
      addToast({ type: 'error', title: 'Erreur', message: 'Points invalides' })
      return
    }

    setSaving(true)
    const supabase = getSupabase()

    const { error } = await supabase
      .from('points_adjustments')
      .insert({
        child_id: editingChildId,
        parent_id: session.user.id,
        type: formData.type,
        points,
        comment: formData.comment || null,
      })

    if (!error) {
      addToast({
        type: 'success',
        title: formData.type === 'bonus' ? 'Bonus ajouté' : 'Malus appliqué',
        message: `${formData.type === 'bonus' ? '+' : '-'}${points} pts`,
      })
      setShowModal(false)
      setEditingChildId(null)
      // Refresh
      const { data: adjData } = await supabase
        .from('points_adjustments')
        .select(`
          *,
          children (id, name)
        `)
        .in('child_id', children.map(c => c.id))
        .order('created_at', { ascending: false })
        .limit(50)
      if (adjData) {
        const formatted = adjData.map(a => ({
          id: a.id,
          type: a.type === 'bonus' ? 'bonus' : 'malus',
          child_id: a.child_id,
          child: a.children,
          points: a.type === 'bonus' ? a.points : -a.points,
          label: a.type === 'bonus' ? 'Bonus' : 'Malus',
          detail: a.comment,
          date: a.created_at,
          source: 'adjustment',
        }))
        // Re-fetch all movements
        const { data: tasksData } = await supabase
          .from('task_instances')
          .select(`
            *,
            tasks!inner (name, points),
            children (id, name)
          `)
          .in('child_id', children.map(c => c.id))
          .eq('status', 'approved')
          .order('approved_by_parent_at', { ascending: false })
          .limit(50)

        const { data: rewardsData } = await supabase
          .from('reward_unlocks')
          .select(`
            *,
            rewards!inner (name, cost_points),
            children (id, name)
          `)
          .in('child_id', children.map(c => c.id))
          .not('settled_at', 'is', null)
          .order('settled_at', { ascending: false })
          .limit(50)

        const allMovements = [...formatted]
        tasksData?.forEach(t => {
          allMovements.push({
            id: t.id,
            type: 'task_approved',
            child_id: t.child_id,
            child: t.children,
            points: (t.tasks as any)?.[0]?.points || 0,
            label: (t.tasks as any)?.[0]?.name || 'Tâche',
            detail: `Tâche approuvée`,
            date: t.approved_by_parent_at || t.created_at,
            source: 'task',
          })
        })
        rewardsData?.forEach(r => {
          allMovements.push({
            id: r.id,
            type: 'reward_spent',
            child_id: r.child_id,
            child: r.children,
            points: -((r.rewards as any)?.[0]?.cost_points || 0),
            label: (r.rewards as any)?.[0]?.name || 'Récompense',
            detail: `Récompense soldée`,
            date: r.settled_at || r.created_at,
            source: 'reward',
          })
        })
        allMovements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setMovements(allMovements.slice(0, 50))
      }
    } else {
      addToast({ type: 'error', title: 'Erreur', message: error.message })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse"><div className="h-6 w-48 bg-gray-200 rounded" /></div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  const bonusTotal = movements
    .filter(a => a.type === 'bonus')
    .reduce((sum, a) => sum + a.points, 0)
  const malusTotal = movements
    .filter(a => a.type === 'malus')
    .reduce((sum, a) => sum + a.points, 0)

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
          <h1 className="text-2xl font-bold text-gray-900">Bonus / Malus</h1>
          <p className="text-gray-600">Ajoutez ou retirez des points avec un commentaire</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total bonus</p>
                <p className="text-2xl font-bold text-green-600">+{bonusTotal} pts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total malus</p>
                <p className="text-2xl font-bold text-red-600">-{malusTotal} pts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Enfants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {children.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucun enfant</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {children.map((child) => (
                <Button
                  key={child.id}
                  variant="outline"
                  className="h-24 flex-col gap-2 justify-center"
                  onClick={() => handleOpenModal(child.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                      {child.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{child.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="success">+{movements.filter((a: any) => a.child_id === child.id && a.type === 'task_approved').reduce((s: number, a: any) => s + a.points, 0)}</Badge>
                    <Badge variant="success">+{movements.filter((a: any) => a.child_id === child.id && a.type === 'bonus').reduce((s: number, a: any) => s + a.points, 0)}</Badge>
                    <Badge variant="danger">-{movements.filter((a: any) => a.child_id === child.id && a.type === 'malus').reduce((s: number, a: any) => s + a.points, 0)}</Badge>
                    <Badge variant="info">-{Math.abs(movements.filter((a: any) => a.child_id === child.id && a.type === 'reward_spent').reduce((s: number, a: any) => s + a.points, 0))}</Badge>
                  </div>
                  <p className="text-xs text-gray-500"><Plus className="w-3 h-3 mr-1 inline" /> Ajuster</p>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Historique des mouvements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movements.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun mouvement</h3>
              <p className="text-gray-600">Les tâches validées, récompenses et ajustements apparaîtront ici</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enfant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commentaire</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movements.map((adj: any) => {
                    const isCredit = adj.points > 0
                    const getBadge = () => {
                      switch (adj.type) {
                        case 'bonus':
                          return <Badge variant="success"><TrendingUp className="w-3 h-3 mr-1 inline" /> Bonus</Badge>
                        case 'malus':
                          return <Badge variant="danger"><TrendingDown className="w-3 h-3 mr-1 inline" /> Malus</Badge>
                        case 'task_approved':
                          return <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1 inline" /> Tâche validée</Badge>
                        case 'reward_spent':
                          return <Badge variant="info"><Gift className="w-3 h-3 mr-1 inline" /> Récompense</Badge>
                        default:
                          return <Badge variant="default">{adj.type}</Badge>
                      }
                    }
                    return (
                      <tr key={adj.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium">
                              {adj.child?.name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <span className="text-sm text-gray-700">{adj.child?.name || 'Inconnu'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getBadge()}</td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{adj.label}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-medium ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                            {isCredit ? '+' : ''}{adj.points} pts
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600 max-w-xs truncate">
                            {adj.detail || '<span className="text-gray-400 italic">Aucun commentaire</span>'}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">{formatDateTime(adj.date)}</p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingChildId(null); }}
        title={`Ajouter ${formData.type === 'bonus' ? 'un bonus' : 'un malus'}`}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border-2 rounded-lg transition-colors
              {formData.type === 'bonus' ? 'border-green-500 bg-green-50' : 'border-gray-200'}
              {formData.type === 'malus' ? 'border-red-500 bg-red-50' : 'border-gray-200'}">
              <input
                type="radio"
                name="type"
                value="bonus"
                checked={formData.type === 'bonus'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AdjustmentType })}
                className="w-4 h-4 text-green-500 focus:ring-green-500"
              />
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <TrendingUp className="w-4 h-4" />
                Bonus (+)
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer flex-1 p-3 border-2 rounded-lg transition-colors
              {formData.type === 'malus' ? 'border-red-500 bg-red-50' : 'border-gray-200'}
              {formData.type === 'bonus' ? 'border-gray-200' : 'border-gray-200'}">
              <input
                type="radio"
                name="type"
                value="malus"
                checked={formData.type === 'malus'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as AdjustmentType })}
                className="w-4 h-4 text-red-500 focus:ring-red-500"
              />
              <div className="flex items-center gap-2 text-red-700 font-medium">
                <TrendingDown className="w-4 h-4" />
                Malus (-)
              </div>
            </label>
          </div>

          <Input
            label="Points *"
            type="number"
            value={formData.points}
            onChange={(e) => setFormData({ ...formData, points: e.target.value })}
            placeholder="Ex: 10"
            min="1"
            max="1000"
            required
          />

          <Input
            label="Commentaire"
            type="text"
            value={formData.comment}
            onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            placeholder="Ex: Aide pour le ménage, Comportement exemplaire..."
            maxLength={200}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingChildId(null); }}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              Confirmer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { Target, Gift, Clock, CheckCircle, XCircle, AlertCircle, Trophy, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { formatDate, cn, getRecurrenceLabel } from '@/utils/helpers'
import { TaskInstance, Task, Reward, RewardUnlock } from '@/types/database'
import { 
  notifyParentTaskValidated, 
  notifyChildTaskApproved, 
  notifyChildTaskRejected, 
  notifyParentRewardUnlocked 
} from '@/lib/notifications'

export default function ChildDashboardPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [tasks, setTasks] = useState<TaskInstance[]>([])
  const [rewards, setRewards] = useState<(Reward & { unlocked: boolean })[]>([])
  const [pendingTasks, setPendingTasks] = useState<TaskInstance[]>([])
  const [pointsBalance, setPointsBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [validatingTaskId, setValidatingTaskId] = useState<string | null>(null)
  const [unlockingRewardId, setUnlockingRewardId] = useState<string | null>(null)
  const [showValidateConfirm, setShowValidateConfirm] = useState<{ taskId: string; taskName: string } | null>(null)
  const [showUnlockConfirm, setShowUnlockConfirm] = useState<{ rewardId: string; rewardName: string; cost: number } | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const weekLater = new Date(today)
      weekLater.setDate(weekLater.getDate() + 7)

      const [tasksRes, rewardsRes, unlocksRes, pendingRes] = await Promise.all([
        supabase
          .from('task_instances')
          .select(`
            *,
            tasks (name, points, recurrence_type, recurrence_days)
          `)
          .eq('child_id', session.user.id)
          .eq('status', 'pending')
          .lte('date', weekLater.toISOString().split('T')[0])
          .order('date', { ascending: true }),
        supabase
          .from('rewards')
          .select('*')
          .eq('family_id', session.user.family_id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('cost_points', { ascending: true }),
        supabase
          .from('reward_unlocks')
          .select('reward_id')
          .eq('child_id', session.user.id),
        supabase
          .from('task_instances')
          .select(`
            *,
            tasks (name, points)
          `)
          .eq('child_id', session.user.id)
          .eq('status', 'pending')
          .not('validated_by_child_at', 'is', null)
          .is('approved_by_parent_at', null)
          .order('validated_by_child_at', { ascending: false }),
      ])

      const unlockedRewardIds = new Set(unlocksRes.data?.map(u => u.reward_id) || [])

      if (tasksRes.data) {
        const todayTasks = tasksRes.data.filter(t => new Date(t.date).toDateString() === today.toDateString())
        const laterTasks = tasksRes.data.filter(t => new Date(t.date).toDateString() !== today.toDateString())
        setTasks([...todayTasks, ...laterTasks])
      }

      if (rewardsRes.data) {
        const rewardsWithStatus = rewardsRes.data.map(r => ({
          ...r,
          unlocked: unlockedRewardIds.has(r.id),
        }))
        setRewards(rewardsWithStatus)
      }

      if (pendingRes.data) setPendingTasks(pendingRes.data)

      // Calculate points balance from approved tasks
      const { data: approvedTasks } = await supabase
        .from('task_instances')
        .select(`
          tasks!inner (points)
        `)
        .eq('child_id', session.user.id)
        .eq('status', 'approved')

      const earnedPoints = approvedTasks?.reduce((sum, t: any) => sum + (t.tasks?.points || 0), 0) || 0

      // Subtract spent points from unlocked rewards
      const { data: spentRewards } = await supabase
        .from('reward_unlocks')
        .select(`
          rewards!inner (cost_points)
        `)
        .eq('child_id', session.user.id)

      const spentPoints = spentRewards?.reduce((sum, r: any) => sum + (r.rewards?.cost_points || 0), 0) || 0

      setPointsBalance(earnedPoints - spentPoints)
      setLoading(false)
    }

    fetchData()
  }, [session])

  const handleValidateTask = async () => {
    if (!showValidateConfirm || !session?.user) return
    setValidatingTaskId(showValidateConfirm.taskId)

    const supabase = getSupabase()
    const { error } = await supabase
      .from('task_instances')
      .update({ validated_by_child_at: new Date().toISOString() })
      .eq('id', showValidateConfirm.taskId)

    if (!error) {
      addToast({ type: 'success', title: 'Tâche validée', message: 'En attente d\'approbation par un parent' })
      // Notify parent
      await notifyParentTaskValidated(
        session.user.family_id,
        session.user.name,
        showValidateConfirm.taskName,
        (tasks.find(t => t.id === showValidateConfirm.taskId)?.tasks as Task)?.points || 0
      )
      setTasks(prev => prev.filter(t => t.id !== showValidateConfirm.taskId))
      setPendingTasks(prev => [...prev, { ...tasks.find(t => t.id === showValidateConfirm.taskId)! }])
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de valider la tâche' })
    }
    setValidatingTaskId(null)
    setShowValidateConfirm(null)
  }

  const handleUnlockReward = async () => {
    if (!showUnlockConfirm || !session?.user) return
    setUnlockingRewardId(showUnlockConfirm.rewardId)

    const supabase = getSupabase()
    const { error } = await supabase
      .from('reward_unlocks')
      .insert({ reward_id: showUnlockConfirm.rewardId, child_id: session.user.id })

    if (!error) {
      addToast({ type: 'success', title: 'Récompense débloquée !', message: `Félicitations ! Tu as débloqué "${showUnlockConfirm.rewardName}"` })
      // Notify parent
      await notifyParentRewardUnlocked(
        session.user.family_id,
        session.user.name,
        showUnlockConfirm.rewardName
      )
      setRewards(prev => prev.map(r => r.id === showUnlockConfirm.rewardId ? { ...r, unlocked: true } : r))
      setPointsBalance(prev => prev - showUnlockConfirm.cost)
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de débloquer la récompense' })
    }
    setUnlockingRewardId(null)
    setShowUnlockConfirm(null)
  }

  const getTaskUrgency = (date: string) => {
    const taskDate = new Date(date)
    taskDate.setHours(0, 0, 0, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'overdue'
    if (diff === 0) return 'today'
    if (diff <= 3) return 'soon'
    return 'later'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="animate-pulse"><CardContent className="h-32" /></Card>
          <Card className="animate-pulse"><CardContent className="h-32" /></Card>
        </div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  const todayTasks = tasks.filter(t => getTaskUrgency(t.date) === 'today')
  const upcomingTasks = tasks.filter(t => getTaskUrgency(t.date) === 'soon')
  const overdueTasks = tasks.filter(t => getTaskUrgency(t.date) === 'overdue')

  const availableRewards = rewards.filter(r => !r.unlocked && r.cost_points <= pointsBalance)
  const lockedRewards = rewards.filter(r => !r.unlocked && r.cost_points > pointsBalance)
  const unlockedRewards = rewards.filter(r => r.unlocked)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenue {session?.user.name} !</h1>
        <p className="text-gray-600">Voici tes tâches et récompenses</p>
      </div>

      <Card className="bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">Ton solde</p>
              <p className="text-4xl font-bold">{pointsBalance} <span className="text-xl">PTS</span></p>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center">
              <Trophy className="w-10 h-10" />
            </div>
          </div>
        </CardContent>
      </Card>

      {(todayTasks.length > 0 || upcomingTasks.length > 0 || overdueTasks.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Tes tâches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> En retard ({overdueTasks.length})
                </h4>
                <div className="space-y-2">
                  {overdueTasks.map((task) => (
                    <div key={task.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{(task.tasks as Task)?.name}</p>
                          <p className="text-sm text-gray-500">Échéance : {formatDate(task.date)}</p>
                        </div>
                        <Badge variant="danger">En retard</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {todayTasks.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-primary-600 mb-2 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> Aujourd'hui ({todayTasks.length})
                </h4>
                <div className="space-y-2">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="p-3 bg-primary-50 border border-primary-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{(task.tasks as Task)?.name}</p>
                          <p className="text-sm text-gray-500">+{(task.tasks as Task)?.points} pts</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setShowValidateConfirm({ taskId: task.id, taskName: (task.tasks as Task)?.name || '' })}
                          loading={validatingTaskId === task.id}
                        >
                          Valider
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                  <Star className="w-4 h-4" /> À venir ({upcomingTasks.length})
                </h4>
                <div className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{(task.tasks as Task)?.name}</p>
                          <p className="text-sm text-gray-500">Échéance : {formatDate(task.date)} • +{(task.tasks as Task)?.points} pts</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getRecurrenceLabel((task.tasks as Task)?.recurrence_type || 'none', (task.tasks as Task)?.recurrence_days || undefined)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {pendingTasks.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <Clock className="w-5 h-5" />
              En attente d'approbation ({pendingTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingTasks.map((task) => (
                <div key={task.id} className="p-3 bg-white border border-yellow-200 rounded-lg">
                  <p className="font-medium text-gray-900">{(task.tasks as Task)?.name}</p>
                  <p className="text-sm text-gray-500">Validée le {formatDate(task.validated_by_child_at || '')} • +{(task.tasks as Task)?.points} pts</p>
                  <Badge variant="warning" className="mt-2">En attente</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Récompenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableRewards.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-600 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Disponibles à débloquer ({availableRewards.length})
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {availableRewards.map((reward) => (
                  <div key={reward.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{reward.name}</p>
                        {reward.description && <p className="text-sm text-gray-600">{reward.description}</p>}
                        <p className="text-sm text-green-700 font-medium">{reward.cost_points} pts</p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setShowUnlockConfirm({ rewardId: reward.id, rewardName: reward.name, cost: reward.cost_points })}
                        loading={unlockingRewardId === reward.id}
                      >
                        Débloquer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {unlockedRewards.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Déjà débloquées ({unlockedRewards.length})
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {unlockedRewards.map((reward) => (
                  <div key={reward.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{reward.name}</p>
                        {reward.description && <p className="text-sm text-gray-600">{reward.description}</p>}
                        <p className="text-sm text-blue-700 font-medium">{reward.cost_points} pts</p>
                        <p className="text-xs text-blue-600">✓ Débloquée</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lockedRewards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Bloquées ({lockedRewards.length})
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {lockedRewards.map((reward) => {
                  const missing = reward.cost_points - pointsBalance
                  return (
                    <div key={reward.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-75">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{reward.name}</p>
                          {reward.description && <p className="text-sm text-gray-600">{reward.description}</p>}
                          <p className="text-sm text-gray-500">{reward.cost_points} pts</p>
                          <p className="text-sm text-red-600 font-medium">
                            Il manque {missing} pts
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {missing} pts manquants
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {rewards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Aucune récompense disponible pour l'instant</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmModal
        isOpen={!!showValidateConfirm}
        onClose={() => setShowValidateConfirm(null)}
        onConfirm={handleValidateTask}
        title="Valider la tâche"
        message={showValidateConfirm ? `Confirmer que tu as terminé "${showValidateConfirm.taskName}" ?` : ''}
        confirmText="Valider"
        variant="primary"
      />

      <ConfirmModal
        isOpen={!!showUnlockConfirm}
        onClose={() => setShowUnlockConfirm(null)}
        onConfirm={handleUnlockReward}
        title="Débloquer la récompense"
        message={showUnlockConfirm ? `Débloquer "${showUnlockConfirm.rewardName}" pour ${showUnlockConfirm.cost} pts ? Tu auras alors ${pointsBalance - showUnlockConfirm.cost} pts restants.` : ''}
        confirmText="Débloquer"
        variant="primary"
      />
    </div>
  )
}
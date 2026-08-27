'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Calendar, Repeat, UserCheck, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { formatDate, getRecurrenceLabel, cn } from '@/utils/helpers'
import { Task, Child, TaskRecurrence } from '@/types/database'

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Aucune' },
  { value: 'daily', label: 'Quotidienne' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'custom', label: 'Personnalisée (jours spécifiques)' },
]

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
]

export default function ParentTasksPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    points: '',
    deadline: '',
    recurrence_type: 'none' as TaskRecurrence,
    recurrence_days: [] as number[],
    assigned_to: [] as string[],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [customDaysOpen, setCustomDaysOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      const [childrenRes, tasksRes] = await Promise.all([
        supabase.from('children').select('*').eq('family_id', session.user.family_id).order('created_at'),
        supabase
          .from('tasks')
          .select('*')
          .eq('family_id', session.user.family_id)
          .is('deleted_at', null)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
      ])

      if (childrenRes.data) setChildren(childrenRes.data)
      if (tasksRes.data) setTasks(tasksRes.data)
      setLoading(false)
    }

    fetchData()
  }, [session])

  const resetForm = () => {
    setFormData({
      name: '',
      points: '',
      deadline: '',
      recurrence_type: 'none',
      recurrence_days: [],
      assigned_to: [],
    })
    setErrors({})
    setEditingTask(null)
  }

  const openModal = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      setFormData({
        name: task.name,
        points: task.points.toString(),
        deadline: task.deadline || '',
        recurrence_type: task.recurrence_type,
        recurrence_days: task.recurrence_days || [],
        assigned_to: task.assigned_to || [],
      })
    } else {
      resetForm()
    }
    setModalOpen(true)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Nom requis'
    if (!formData.points || parseInt(formData.points) <= 0) newErrors.points = 'Points requis (nombre positif)'
    if (formData.assigned_to.length === 0) newErrors.assigned_to = 'Au moins un enfant requis'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !session?.user) return

    const supabase = getSupabase()
    const taskData = {
      family_id: session.user.family_id,
      name: formData.name.trim(),
      points: parseInt(formData.points),
      deadline: formData.deadline || null,
      recurrence_type: formData.recurrence_type,
      recurrence_days: formData.recurrence_type === 'custom' ? formData.recurrence_days : null,
      assigned_to: formData.assigned_to,
      is_active: true,
    }

    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', editingTask.id)
        if (error) throw error
        // Generate instances for updated task
        await generateTaskInstances(supabase, editingTask.id, taskData)
        addToast({ type: 'success', title: 'Tâche modifiée' })
      } else {
        const { data: newTask, error } = await supabase.from('tasks').insert(taskData).select().single()
        if (error) throw error
        // Generate instances for new task
        await generateTaskInstances(supabase, newTask.id, taskData)
        addToast({ type: 'success', title: 'Tâche créée' })
      }
      setModalOpen(false)
      resetForm()
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de sauvegarder la tâche' })
    }
  }

  // Generate task instances based on recurrence
  const generateTaskInstances = async (supabase: any, taskId: string, taskData: any) => {
    const { assigned_to, recurrence_type, recurrence_days, deadline } = taskData
    if (!assigned_to || assigned_to.length === 0) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endDate = deadline ? new Date(deadline) : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days default
    endDate.setHours(0, 0, 0, 0)

    const instances = []

    for (const childId of assigned_to) {
      let currentDate = new Date(today)
      
      while (currentDate <= endDate) {
        let shouldCreate = false
        
        switch (recurrence_type) {
          case 'daily':
            shouldCreate = true
            break
          case 'weekly':
            shouldCreate = currentDate.getDay() === today.getDay()
            break
          case 'custom':
            shouldCreate = recurrence_days?.includes(currentDate.getDay()) || false
            break
          case 'none':
          default:
            shouldCreate = currentDate.getTime() === today.getTime()
            break
        }
        
        if (shouldCreate) {
          instances.push({
            task_id: taskId,
            child_id: childId,
            date: currentDate.toISOString().split('T')[0],
            status: 'pending',
          })
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    if (instances.length > 0) {
      await supabase.from('task_instances').upsert(instances, { onConflict: 'task_id,child_id,date' })
    }
  }

  const handleDelete = async () => {
    if (!deletingTaskId || !session?.user) return
    const supabase = getSupabase()
    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', deletingTaskId)
    if (!error) {
      addToast({ type: 'success', title: 'Tâche supprimée' })
      setTasks(prev => prev.filter(t => t.id !== deletingTaskId))
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de supprimer la tâche' })
    }
    setDeletingTaskId(null)
  }

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter(d => d !== day)
        : [...prev.recurrence_days, day].sort((a, b) => a - b),
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-6 w-48 bg-gray-200 rounded" />
          </div>
        </div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des tâches</h1>
          <p className="text-gray-600">Créez et gérez les tâches de vos enfants</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle tâche
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {tasks.length === 0 ? (
            <div className="p-12 text-center">
              <Check className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune tâche</h3>
              <p className="text-gray-600 mb-4">Commencez par créer une première tâche pour vos enfants</p>
              <Button onClick={() => openModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une tâche
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tâche</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Récurrence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigné à</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{task.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">{task.points} pts</Badge>
                      </td>
                      <td className="px-6 py-4">
                        {task.deadline ? (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            {formatDate(task.deadline)}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sans échéance</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-xs">
                          {getRecurrenceLabel(task.recurrence_type, task.recurrence_days || undefined)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {task.assigned_to?.map((childId) => {
                            const child = children.find(c => c.id === childId)
                            return child ? (
                              <Badge key={childId} variant="default" className="text-xs">
                                {child.name}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openModal(task)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingTaskId(task.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom de la tâche *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="Ex: Faire ses devoirs"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Points *"
              type="number"
              min="1"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: e.target.value })}
              error={errors.points}
              placeholder="5"
            />
            <Input
              label="Date limite (optionnel)"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              error={errors.deadline}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Récurrence</label>
            <Select
              value={formData.recurrence_type}
              onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as TaskRecurrence })}
              options={RECURRENCE_OPTIONS}
            />
          </div>

          {formData.recurrence_type === 'custom' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Jours de la semaine</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      formData.recurrence_days.includes(day.value)
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {day.label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigné à *</label>
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <label
                  key={child.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors',
                    formData.assigned_to.includes(child.id)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={formData.assigned_to.includes(child.id)}
                    onChange={(e) => setFormData({
                      ...formData,
                      assigned_to: e.target.checked
                        ? [...formData.assigned_to, child.id]
                        : formData.assigned_to.filter(id => id !== child.id),
                    })}
                    className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                  />
                  <span>{child.name}</span>
                </label>
              ))}
            </div>
            {errors.assigned_to && <p className="mt-1 text-sm text-red-600">{errors.assigned_to}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingTask ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingTaskId}
        onClose={() => setDeletingTaskId(null)}
        onConfirm={handleDelete}
        title="Supprimer la tâche"
        message="Cette tâche sera masquée (soft delete) et ne sera plus visible dans la liste active. L'historique sera conservé."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  )
}
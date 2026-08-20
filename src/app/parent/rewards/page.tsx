'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, Gift, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Reward } from '@/types/database'

export default function ParentRewardsPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [deletingRewardId, setDeletingRewardId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    cost_points: '',
    description: '',
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()
      const { data } = await supabase
        .from('rewards')
        .select('*')
        .eq('family_id', session.user.family_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (data) setRewards(data)
      setLoading(false)
    }
    fetchData()
  }, [session])

  const resetForm = () => {
    setFormData({ name: '', cost_points: '', description: '', is_active: true })
    setErrors({})
    setEditingReward(null)
  }

  const openModal = (reward?: Reward) => {
    if (reward) {
      setEditingReward(reward)
      setFormData({
        name: reward.name,
        cost_points: reward.cost_points.toString(),
        description: reward.description || '',
        is_active: reward.is_active,
      })
    } else {
      resetForm()
    }
    setModalOpen(true)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Nom requis'
    if (!formData.cost_points || parseInt(formData.cost_points) <= 0) newErrors.cost_points = 'Coût requis (nombre positif)'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !session?.user) return

    const supabase = getSupabase()
    const rewardData = {
      family_id: session.user.family_id,
      name: formData.name.trim(),
      cost_points: parseInt(formData.cost_points),
      description: formData.description.trim() || null,
      is_active: formData.is_active,
    }

    try {
      if (editingReward) {
        const { error } = await supabase.from('rewards').update(rewardData).eq('id', editingReward.id)
        if (error) throw error
        addToast({ type: 'success', title: 'Récompense modifiée' })
      } else {
        const { error } = await supabase.from('rewards').insert(rewardData)
        if (error) throw error
        addToast({ type: 'success', title: 'Récompense créée' })
      }
      setModalOpen(false)
      resetForm()
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de sauvegarder la récompense' })
    }
  }

  const handleDelete = async () => {
    if (!deletingRewardId || !session?.user) return
    const supabase = getSupabase()
    const { error } = await supabase
      .from('rewards')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deletingRewardId)
    if (!error) {
      addToast({ type: 'success', title: 'Récompense supprimée' })
      setRewards(prev => prev.filter(r => r.id !== deletingRewardId))
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de supprimer la récompense' })
    }
    setDeletingRewardId(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="animate-pulse"><div className="h-6 w-48 bg-gray-200 rounded" /></div>
        </div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des récompenses</h1>
          <p className="text-gray-600">Créez des récompenses que vos enfants pourront débloquer avec leurs points</p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle récompense
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {rewards.length === 0 ? (
            <div className="p-12 text-center">
              <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune récompense</h3>
              <p className="text-gray-600 mb-4">Ajoutez des récompenses pour motiver vos enfants</p>
              <Button onClick={() => openModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une récompense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Récompense</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{reward.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">{reward.cost_points} pts</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate">{reward.description || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={reward.is_active ? 'success' : 'danger'}>
                          {reward.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openModal(reward)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingRewardId(reward.id)}>
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

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingReward ? 'Modifier la récompense' : 'Nouvelle récompense'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            placeholder="Ex: Sortie cinéma"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Coût en points *"
              type="number"
              min="1"
              value={formData.cost_points}
              onChange={(e) => setFormData({ ...formData, cost_points: e.target.value })}
              error={errors.cost_points}
              placeholder="20"
            />
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <Input
            label="Description (optionnel)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de la récompense..."
            error={errors.description}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">
              {editingReward ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingRewardId}
        onClose={() => setDeletingRewardId(null)}
        onConfirm={handleDelete}
        title="Supprimer la récompense"
        message="Cette récompense sera masquée (soft delete). Les déblocages passés seront conservés."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  )
}
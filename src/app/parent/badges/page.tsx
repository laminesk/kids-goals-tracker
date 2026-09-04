'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Edit, Shield, Star, Award, Clock, Calendar, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { BadgeConfig, BadgeTier, BadgeFrequency } from '@/types/database'

export default function ParentBadgesPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [badgeConfigs, setBadgeConfigs] = useState<(BadgeConfig & { earned_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBadge, setEditingBadge] = useState<BadgeConfig | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    tier: 'silver' as BadgeTier,
    frequency: 'daily' as BadgeFrequency,
    threshold_points: '',
    pokemon_name: '',
    pokemon_image_url: '',
    is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      const { data: configs } = await supabase
        .from('badge_configs')
        .select('*')
        .eq('family_id', session.user.family_id)
        .order('created_at', { ascending: false })

      if (configs) {
        // Fetch earned count for each badge
        const configsWithCount = await Promise.all(configs.map(async (config) => {
          const { count } = await supabase
            .from('badges_earned')
            .select('id', { count: 'exact', head: true })
            .eq('badge_config_id', config.id)
          return { ...config, earned_count: count || 0 }
        }))
        setBadgeConfigs(configsWithCount)
      }
      setLoading(false)
    }
    fetchData()
  }, [session])

  const handleOpenModal = (badge?: BadgeConfig) => {
    if (badge) {
      setEditingBadge(badge)
      setFormData({
        name: badge.name,
        tier: badge.tier,
        frequency: badge.frequency,
        threshold_points: badge.threshold_points.toString(),
        pokemon_name: badge.pokemon_name,
        pokemon_image_url: badge.pokemon_image_url || '',
        is_active: badge.is_active,
      })
    } else {
      setEditingBadge(null)
      setFormData({
        name: '',
        tier: 'silver',
        frequency: 'daily',
        threshold_points: '',
        pokemon_name: '',
        pokemon_image_url: '',
        is_active: true,
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user) return

    const threshold = parseInt(formData.threshold_points, 10)
    if (isNaN(threshold) || threshold <= 0) {
      addToast({ type: 'error', title: 'Erreur', message: 'Seuil de points invalide' })
      return
    }

    setSaving(true)
    const supabase = getSupabase()

    const badgeData = {
      family_id: session.user.family_id,
      name: formData.name,
      tier: formData.tier,
      frequency: formData.frequency,
      threshold_points: threshold,
      pokemon_name: formData.pokemon_name,
      pokemon_image_url: formData.pokemon_image_url || null,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    }

    let error = null
    if (editingBadge) {
      const { error: updateError } = await supabase
        .from('badge_configs')
        .update(badgeData)
        .eq('id', editingBadge.id)
      error = updateError
    } else {
      const { error: insertError } = await supabase
        .from('badge_configs')
        .insert(badgeData)
      error = insertError
    }

    if (!error) {
      addToast({
        type: 'success',
        title: editingBadge ? 'Badge modifié' : 'Badge créé',
      })
      setShowModal(false)
      setEditingBadge(null)
      // Refresh
      const { data: configs } = await supabase
        .from('badge_configs')
        .select('*')
        .eq('family_id', session.user.family_id)
        .order('created_at', { ascending: false })
      if (configs) {
        const configsWithCount = await Promise.all(configs.map(async (config) => {
          const { count } = await supabase
            .from('badges_earned')
            .select('id', { count: 'exact', head: true })
            .eq('badge_config_id', config.id)
          return { ...config, earned_count: count || 0 }
        }))
        setBadgeConfigs(configsWithCount)
      }
    } else {
      addToast({ type: 'error', title: 'Erreur', message: error.message })
    }
    setSaving(false)
  }

  const handleDelete = async (badgeId: string) => {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('badge_configs')
      .delete()
      .eq('id', badgeId)

    if (!error) {
      addToast({ type: 'success', title: 'Badge supprimé' })
      setBadgeConfigs(prev => prev.filter(b => b.id !== badgeId))
    } else {
      addToast({ type: 'error', title: 'Erreur', message: error.message })
    }
    setShowDeleteConfirm(null)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse"><div className="h-6 w-48 bg-gray-200 rounded" /></div>
        <Card className="animate-pulse"><CardContent className="h-64" /></Card>
      </div>
    )
  }

  const tierColors = {
    silver: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', badge: 'bg-gray-200 text-gray-800' },
    gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', badge: 'bg-yellow-300 text-yellow-900' },
  }

  const frequencyLabels: Record<BadgeFrequency, string> = {
    daily: 'Quotidien',
    weekly: 'Hebdomadaire',
    monthly: 'Mensuel',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration des Badges</h1>
          <p className="text-gray-600">Définissez les badges Pokémon à gagner selon les points</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nouveau badge
        </Button>
      </div>

      {badgeConfigs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun badge configuré</h3>
            <p className="text-gray-600 mb-4">Créez votre premier badge Pokémon !</p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Créer un badge
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {badgeConfigs.map((badge) => {
            const colors = tierColors[badge.tier]
            return (
              <Card key={badge.id} className={`border-2 ${colors.border}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                        {badge.pokemon_image_url ? (
                          <img src={badge.pokemon_image_url} alt={badge.pokemon_name} className="w-12 h-12 rounded-xl" />
                        ) : (
                          <span className="text-3xl">🏅</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{badge.name}</h3>
                          <Badge variant="outline" className={colors.badge}>
                            {badge.tier === 'gold' ? (
                              <>
                                <Star className="w-3 h-3 mr-1" /> Or
                              </>
                            ) : (
                              <>
                                <Shield className="w-3 h-3 mr-1" /> Argent
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 capitalize">{frequencyLabels[badge.frequency]}</p>
                        <p className="text-sm text-gray-500">Seuil : {badge.threshold_points} pts • {badge.pokemon_name}</p>
                        <p className="text-xs text-gray-400">{badge.earned_count} fois obtenu</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.is_active ? 'success' : 'default'} className="gap-1">
                        {badge.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenModal(badge)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setShowDeleteConfirm(badge.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingBadge(null); }}
        title={editingBadge ? 'Modifier le badge' : 'Nouveau badge'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom du badge *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Champion du jour, Maître de la semaine"
            required
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Type *"
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value as BadgeTier })}
              options={[
                { value: 'silver', label: '🥈 Argent' },
                { value: 'gold', label: '🥇 Or' },
              ]}
              required
            />

            <Select
              label="Fréquence *"
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value as BadgeFrequency })}
              options={[
                { value: 'daily', label: '📅 Quotidien' },
                { value: 'weekly', label: '📆 Hebdomadaire' },
                { value: 'monthly', label: '🗓️ Mensuel' },
              ]}
              required
            />
          </div>

          <Input
            label="Seuil de points *"
            type="number"
            value={formData.threshold_points}
            onChange={(e) => setFormData({ ...formData, threshold_points: e.target.value })}
            placeholder="Ex: 30 (quotidien) ou 120 (hebdomadaire)"
            min="1"
            required
          />

          <Input
            label="Nom du Pokémon *"
            value={formData.pokemon_name}
            onChange={(e) => setFormData({ ...formData, pokemon_name: e.target.value })}
            placeholder="Ex: Pikachu, Dracaufeu, Mewtwo"
            required
          />

          <Input
            label="URL image Pokémon (optionnel)"
            value={formData.pokemon_image_url}
            onChange={(e) => setFormData({ ...formData, pokemon_image_url: e.target.value })}
            placeholder="https://... (image du Pokémon)"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-primary-500 rounded"
            />
            <span className="text-sm text-gray-700">Badge actif</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingBadge(null); }}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              {editingBadge ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        title="Supprimer le badge"
        message="Cette action est irréversible. Le badge ne sera plus disponible pour les enfants."
        confirmText="Supprimer"
        variant="danger"
      />
    </div>
  )
}
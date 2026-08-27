'use client'

import { useEffect, useState } from 'react'
import { User, Lock, Shield, Trash2, Download, AlertTriangle, Save, Eye, EyeOff, X, Plus, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { hashPassword, verifyPassword } from '@/utils/helpers'
import { Child, Parent } from '@/types/database'

export default function ParentSettingsPage() {
  const { session, refreshSession } = useAuth()
  const { addToast } = useToast()
  const [children, setChildren] = useState<Child[]>([])
  const [parent, setParent] = useState<Parent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [parentForm, setParentForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [parentErrors, setParentErrors] = useState<Record<string, string>>({})
  const [showParentPassword, setShowParentPassword] = useState(false)

  const [childPins, setChildPins] = useState<Record<string, { currentPin: string; newPin: string; confirmPin: string }>>({})
  const [childErrors, setChildErrors] = useState<Record<string, Record<string, string>>>({})
  const [showChildPasswords, setShowChildPasswords] = useState<Record<string, boolean>>({})
  const [editingChildId, setEditingChildId] = useState<string | null>(null)

  const [stats, setStats] = useState({ tasksCount: 0, rewardsCount: 0 })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [showAddChildModal, setShowAddChildModal] = useState(false)
  const [addChildForm, setAddChildForm] = useState({
    name: '',
    pin: '',
    confirmPin: '',
  })
  const [addChildErrors, setAddChildErrors] = useState<Record<string, string>>({})
  const [showAddChildPassword, setShowAddChildPassword] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      const [childrenRes, parentRes, tasksRes, rewardsRes] = await Promise.all([
        supabase.from('children').select('*').eq('family_id', session.user.family_id).order('created_at'),
        supabase.from('parents').select('*').eq('id', session.user.id).single(),
        supabase.from('tasks').select('id', { count: 'exact' }).eq('family_id', session.user.family_id).is('deleted_at', null),
        supabase.from('rewards').select('id', { count: 'exact' }).eq('family_id', session.user.family_id).is('deleted_at', null),
      ])

      if (childrenRes.data) {
        setChildren(childrenRes.data)
        const initialPins: Record<string, { currentPin: string; newPin: string; confirmPin: string }> = {}
        childrenRes.data.forEach(c => {
          initialPins[c.id] = { currentPin: '', newPin: '', confirmPin: '' }
        })
        setChildPins(initialPins)
      }
      if (parentRes.data) setParent(parentRes.data)
      setStats({
        tasksCount: tasksRes.count || 0,
        rewardsCount: rewardsRes.count || 0,
      })
      setLoading(false)
    }
    fetchData()
  }, [session])

  const validateParentForm = () => {
    const errors: Record<string, string> = {}
    if (!parentForm.currentPassword) errors.currentPassword = 'Mot de passe actuel requis'
    if (!parentForm.newPassword) errors.newPassword = 'Nouveau mot de passe requis'
    else if (parentForm.newPassword.length < 8) errors.newPassword = 'Minimum 8 caractères'
    if (parentForm.newPassword !== parentForm.confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas'
    setParentErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleParentPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateParentForm() || !session?.user || !parent) return

    setSaving(true)
    const supabase = getSupabase()

    const valid = await verifyPassword(parentForm.currentPassword, parent.password_hash)
    if (!valid) {
      setParentErrors({ currentPassword: 'Mot de passe actuel incorrect' })
      setSaving(false)
      return
    }

    const newHash = await hashPassword(parentForm.newPassword)
    const { error } = await supabase.from('parents').update({ password_hash: newHash }).eq('id', session.user.id)

    if (!error) {
      addToast({ type: 'success', title: 'Mot de passe modifié' })
      setParentForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de modifier le mot de passe' })
    }
    setSaving(false)
  }

  const validateChildPin = (childId: string) => {
    const pins = childPins[childId]
    const errors: Record<string, string> = {}
    if (!pins.currentPin) errors.currentPin = 'PIN actuel requis'
    if (!pins.newPin) errors.newPin = 'Nouveau PIN requis'
    else if (!/^\d{4,6}$/.test(pins.newPin)) errors.newPin = '4 à 6 chiffres'
    if (pins.newPin !== pins.confirmPin) errors.confirmPin = 'Les PIN ne correspondent pas'
    setChildErrors(prev => ({ ...prev, [childId]: errors }))
    return Object.keys(errors).length === 0
  }

  const handleChildPinChange = async (childId: string) => {
    if (!validateChildPin(childId) || !session?.user) return

    const child = children.find(c => c.id === childId)
    if (!child) return

    setSaving(true)
    const supabase = getSupabase()

    const valid = await verifyPassword(childPins[childId].currentPin, child.pin_hash)
    if (!valid) {
      setChildErrors(prev => ({ ...prev, [childId]: { ...prev[childId], currentPin: 'PIN actuel incorrect' } }))
      setSaving(false)
      return
    }

    const newHash = await hashPassword(childPins[childId].newPin)
    const { error } = await supabase.from('children').update({ pin_hash: newHash, updated_at: new Date().toISOString() }).eq('id', childId)

    if (!error) {
      addToast({ type: 'success', title: `PIN de ${child.name} modifié` })
      setChildPins(prev => ({ ...prev, [childId]: { currentPin: '', newPin: '', confirmPin: '' } }))
      setEditingChildId(null)
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de modifier le PIN' })
    }
    setSaving(false)
  }

  const validateAddChildForm = () => {
    const errors: Record<string, string> = {}
    if (!addChildForm.name.trim()) errors.name = 'Prénom requis'
    if (!addChildForm.pin) errors.pin = 'PIN requis'
    else if (!/^\d{4,6}$/.test(addChildForm.pin)) errors.pin = '4 à 6 chiffres'
    if (addChildForm.pin !== addChildForm.confirmPin) errors.confirmPin = 'Les PIN ne correspondent pas'
    setAddChildErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateAddChildForm() || !session?.user) return

    setSaving(true)
    const supabase = getSupabase()

    const pinHash = await hashPassword(addChildForm.pin)

    const { error } = await supabase
      .from('children')
      .insert({
        family_id: session.user.family_id,
        name: addChildForm.name.trim(),
        pin_hash: pinHash,
      })

    if (!error) {
      addToast({ type: 'success', title: `Enfant ${addChildForm.name} ajouté` })
      setAddChildForm({ name: '', pin: '', confirmPin: '' })
      setShowAddChildModal(false)
      // Refresh children list
      const { data } = await supabase.from('children').select('*').eq('family_id', session.user.family_id).order('created_at')
      if (data) setChildren(data)
    } else {
      addToast({ type: 'error', title: 'Erreur', message: error.message })
    }
    setSaving(false)
  }

  const handleResetPoints = async () => {
    if (!session?.user) return
    const supabase = getSupabase()

    const { error } = await supabase
      .from('children')
      .update({ points_balance: 0 })
      .eq('family_id', session.user.family_id)

    addToast({ type: 'success', title: 'Points réinitialisés (simulation)' })
    setShowResetConfirm(false)
  }

  const handleExport = async () => {
    if (!session?.user) return
    const supabase = getSupabase()

    const childrenRes = await supabase.from('children').select('*').eq('family_id', session.user.family_id)
    const childIds = childrenRes.data?.map(c => c.id) || []

    const [tasksRes, rewardsRes, instancesRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('family_id', session.user.family_id).is('deleted_at', null),
      supabase.from('rewards').select('*').eq('family_id', session.user.family_id).is('deleted_at', null),
      supabase.from('task_instances').select('*').in('child_id', childIds),
    ])

    const csv = [
      'Type,ID,Name,Points,Date,Status,Child',
      ...(childrenRes.data || []).map(c => `Child,${c.id},${c.name},,,,`),
      ...(tasksRes.data || []).map(t => `Task,${t.id},${t.name},${t.points},${t.deadline || ''},${t.recurrence_type},`),
      ...(rewardsRes.data || []).map(r => `Reward,${r.id},${r.name},${r.cost_points},,,${r.is_active ? 'active' : 'inactive'}`),
      ...(instancesRes.data || []).map(i => `Instance,${i.id},,${i.points},${i.date},${i.status},${i.child_id}`),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `kids-goals-tracker-export-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)

    addToast({ type: 'success', title: 'Export téléchargé' })
    setShowExportConfirm(false)
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
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600">Gérez la sécurité et les données de votre famille</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Sécurité - Mot de passe parent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleParentPasswordChange} className="space-y-4 max-w-md">
                <div className="relative">
                  <Input
                    label="Mot de passe actuel *"
                    type={showParentPassword ? 'text' : 'password'}
                    value={parentForm.currentPassword}
                    onChange={(e) => setParentForm({ ...parentForm, currentPassword: e.target.value })}
                    error={parentErrors.currentPassword}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowParentPassword(!showParentPassword)}
                    className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  >
                    {showParentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    label="Nouveau mot de passe *"
                    type={showParentPassword ? 'text' : 'password'}
                    value={parentForm.newPassword}
                    onChange={(e) => setParentForm({ ...parentForm, newPassword: e.target.value })}
                    error={parentErrors.newPassword}
                    placeholder="Minimum 8 caractères"
                    autoComplete="new-password"
                  />
                </div>
                <div className="relative">
                  <Input
                    label="Confirmer le nouveau mot de passe *"
                    type={showParentPassword ? 'text' : 'password'}
                    value={parentForm.confirmPassword}
                    onChange={(e) => setParentForm({ ...parentForm, confirmPassword: e.target.value })}
                    error={parentErrors.confirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" loading={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Sécurité - PIN des enfants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">{children.length}/4 enfants</span>
                <Button onClick={() => setShowAddChildModal(true)} variant="outline" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Ajouter un enfant
                </Button>
              </div>

              {children.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucun enfant ajouté</p>
              ) : (
                <div className="space-y-4">
                  {children.map((child) => (
                    <div key={child.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                            {child.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{child.name}</p>
                            <p className="text-sm text-gray-500">Modifier le PIN d'accès</p>
                          </div>
                        </div>
                        {editingChildId === child.id ? (
                          <Button variant="ghost" size="sm" onClick={() => setEditingChildId(null)}>
                            <X className="w-4 h-4" /> Annuler
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => setEditingChildId(child.id)}>
                            Modifier le PIN
                          </Button>
                        )}
                      </div>

                      {editingChildId === child.id && (
                        <form onSubmit={(e) => { e.preventDefault(); handleChildPinChange(child.id) }} className="space-y-3">
                          <div className="grid sm:grid-cols-3 gap-3">
                            <div className="relative">
                              <Input
                                label="PIN actuel"
                                type={showChildPasswords[child.id] ? 'text' : 'password'}
                                value={childPins[child.id]?.currentPin || ''}
                                onChange={(e) => setChildPins(prev => ({ ...prev, [child.id]: { ...prev[child.id], currentPin: e.target.value } }))}
                                error={childErrors[child.id]?.currentPin}
                                placeholder="1234"
                                autoComplete="off"
                                inputMode="numeric"
                                maxLength={6}
                              />
                              <button
                                type="button"
                                onClick={() => setShowChildPasswords(prev => ({ ...prev, [child.id]: !prev[child.id] }))}
                                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                              >
                                {showChildPasswords[child.id] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            <div className="relative">
                              <Input
                                label="Nouveau PIN"
                                type={showChildPasswords[child.id] ? 'text' : 'password'}
                                value={childPins[child.id]?.newPin || ''}
                                onChange={(e) => setChildPins(prev => ({ ...prev, [child.id]: { ...prev[child.id], newPin: e.target.value } }))}
                                error={childErrors[child.id]?.newPin}
                                placeholder="123456"
                                autoComplete="off"
                                inputMode="numeric"
                                maxLength={6}
                              />
                            </div>
                            <div className="relative">
                              <Input
                                label="Confirmer PIN"
                                type={showChildPasswords[child.id] ? 'text' : 'password'}
                                value={childPins[child.id]?.confirmPin || ''}
                                onChange={(e) => setChildPins(prev => ({ ...prev, [child.id]: { ...prev[child.id], confirmPin: e.target.value } }))}
                                error={childErrors[child.id]?.confirmPin}
                                placeholder="123456"
                                autoComplete="off"
                                inputMode="numeric"
                                maxLength={6}
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setEditingChildId(null)}>
                              Annuler
                            </Button>
                            <Button type="submit" loading={saving}>
                              <Save className="w-4 h-4 mr-2" />
                              Enregistrer
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Données familiales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Tâches actives</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.tasksCount}</p>
                </div>
                <Badge variant="info">Actives</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Récompenses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rewardsCount}</p>
                </div>
                <Badge variant={stats.rewardsCount > 0 ? 'success' : 'warning'}>
                  {stats.rewardsCount > 0 ? 'Disponibles' : 'Aucune'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Enfants</p>
                  <p className="text-2xl font-bold text-gray-900">{children.length}</p>
                </div>
                <Badge variant="default">{children.length}/4</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Actions dangereuses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setShowResetConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Réinitialiser tous les points
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowExportConfirm(true)}
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter données (CSV)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetPoints}
        title="Réinitialiser tous les points"
        message="Cette action remettra le solde de points de TOUS les enfants à 0. L'historique des tâches validées sera conservé mais les points ne seront plus comptabilisés."
        confirmText="Tout réinitialiser"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={handleExport}
        title="Exporter les données"
        message="Télécharger un fichier CSV contenant : enfants, tâches, récompenses et historique des tâches."
        confirmText="Télécharger CSV"
        variant="primary"
      />

      <Modal
        isOpen={showAddChildModal}
        onClose={() => { setShowAddChildModal(false); setAddChildForm({ name: '', pin: '', confirmPin: '' }); setAddChildErrors({}); }}
        title="Ajouter un enfant"
        size="md"
      >
        <form onSubmit={handleAddChild} className="space-y-4">
          <Input
            label="Prénom *"
            value={addChildForm.name}
            onChange={(e) => setAddChildForm({ ...addChildForm, name: e.target.value })}
            error={addChildErrors.name}
            placeholder="Ex: Lucas"
            autoComplete="given-name"
            disabled={saving}
          />

          <div className="relative">
            <Input
              label="PIN (4-6 chiffres) *"
              type={showAddChildPassword ? 'text' : 'password'}
              value={addChildForm.pin}
              onChange={(e) => setAddChildForm({ ...addChildForm, pin: e.target.value })}
              error={addChildErrors.pin}
              placeholder="1234"
              autoComplete="off"
              inputMode="numeric"
              maxLength={6}
              disabled={saving}
            />
            <button
              type="button"
              onClick={() => setShowAddChildPassword(!showAddChildPassword)}
              className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              aria-label={showAddChildPassword ? 'Masquer le PIN' : 'Afficher le PIN'}
            >
              {showAddChildPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <Input
            label="Confirmer le PIN *"
            type={showAddChildPassword ? 'text' : 'password'}
            value={addChildForm.confirmPin}
            onChange={(e) => setAddChildForm({ ...addChildForm, confirmPin: e.target.value })}
            error={addChildErrors.confirmPin}
            placeholder="1234"
            autoComplete="off"
            inputMode="numeric"
            maxLength={6}
            disabled={saving}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={() => setShowAddChildModal(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={saving}>
              <UserPlus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
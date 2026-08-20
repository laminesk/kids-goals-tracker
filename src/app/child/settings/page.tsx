'use client'

import { useEffect, useState } from 'react'
import { Lock, Eye, EyeOff, Save, Shield, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { verifyPassword, hashPassword } from '@/utils/helpers'
import Link from 'next/link'

export default function ChildSettingsPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [formData, setFormData] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setLoading(false)
  }, [session])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.currentPin) newErrors.currentPin = 'PIN actuel requis'
    if (!formData.newPin) newErrors.newPin = 'Nouveau PIN requis'
    else if (!/^\d{4,6}$/.test(formData.newPin)) newErrors.newPin = '4 à 6 chiffres'
    if (formData.newPin !== formData.confirmPin) newErrors.confirmPin = 'Les PIN ne correspondent pas'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !session?.user) return

    setSaving(true)
    const supabase = getSupabase()

    // Get current PIN hash
    const { data: child } = await supabase
      .from('children')
      .select('pin_hash')
      .eq('id', session.user.id)
      .single()

    if (!child) {
      addToast({ type: 'error', title: 'Erreur', message: 'Enfant non trouvé' })
      setSaving(false)
      return
    }

    const valid = await verifyPassword(formData.currentPin, child.pin_hash)
    if (!valid) {
      setErrors({ currentPin: 'PIN actuel incorrect' })
      setSaving(false)
      return
    }

    const newHash = await hashPassword(formData.newPin)
    const { error } = await supabase
      .from('children')
      .update({ pin_hash: newHash, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    if (!error) {
      addToast({ type: 'success', title: 'PIN modifié avec succès' })
      setFormData({ currentPin: '', newPin: '', confirmPin: '' })
    } else {
      addToast({ type: 'error', title: 'Erreur', message: 'Impossible de modifier le PIN' })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-center gap-3">
        <Link href="/child">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon PIN</h1>
          <p className="text-gray-600">Change ton code d'accès personnel</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Modifier mon PIN
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="PIN actuel *"
                type={showCurrent ? 'text' : 'password'}
                value={formData.currentPin}
                onChange={(e) => setFormData({ ...formData, currentPin: e.target.value })}
                error={errors.currentPin}
                placeholder="1234"
                autoComplete="off"
                inputMode="numeric"
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                aria-label={showCurrent ? 'Masquer le PIN' : 'Afficher le PIN'}
              >
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Nouveau PIN *"
                type={showNew ? 'text' : 'password'}
                value={formData.newPin}
                onChange={(e) => setFormData({ ...formData, newPin: e.target.value })}
                error={errors.newPin}
                placeholder="123456"
                autoComplete="off"
                inputMode="numeric"
                maxLength={6}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                aria-label={showNew ? 'Masquer le PIN' : 'Afficher le PIN'}
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Input
              label="Confirmer le nouveau PIN *"
              type={showNew ? 'text' : 'password'}
              value={formData.confirmPin}
              onChange={(e) => setFormData({ ...formData, confirmPin: e.target.value })}
              error={errors.confirmPin}
              placeholder="123456"
              autoComplete="off"
              inputMode="numeric"
              maxLength={6}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Link href="/child">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" loading={saving}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Conseil :</strong> Choisis un PIN facile à retenir pour toi mais difficile à deviner pour les autres. Évite les dates de naissance ou suites logiques (1234, 0000, etc.).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Sécurité de ton compte</p>
              <p className="text-sm text-blue-700 mt-1">
                Ton PIN est stocké de manière sécurisée (hashé). Personne, pas même tes parents, ne peut le voir.
                Si tu l'oublies, demande à tes parents de le réinitialiser depuis leurs paramètres.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
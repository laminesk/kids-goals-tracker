'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, User, Lock, Shield, Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { getSupabase } from '@/lib/supabase/client'
import { hashPassword } from '@/utils/helpers'

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    familyName: '',
    parentName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({
    familyName: '',
    parentName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const validateForm = () => {
    const newErrors = {
      familyName: '',
      parentName: '',
      email: '',
      password: '',
      confirmPassword: '',
    }
    if (!formData.familyName.trim()) newErrors.familyName = 'Nom de famille requis'
    if (!formData.parentName.trim()) newErrors.parentName = 'Votre prénom requis'
    if (!formData.email) newErrors.email = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email invalide'
    if (!formData.password) newErrors.password = 'Mot de passe requis'
    else if (formData.password.length < 8) newErrors.password = 'Minimum 8 caractères'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    setErrors(newErrors)
    return Object.values(newErrors).every(e => !e)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    const supabase = getSupabase()

    try {
      // Hash password
      const passwordHash = await hashPassword(formData.password)

      // Create family
      const { data: family, error: familyError } = await supabase
        .from('families')
        .insert({ name: formData.familyName.trim() })
        .select()
        .single()

      if (familyError) throw familyError

      // Create parent
      const { error: parentError } = await supabase
        .from('parents')
        .insert({
          family_id: family.id,
          email: formData.email.toLowerCase().trim(),
          password_hash: passwordHash,
          name: formData.parentName.trim(),
        })

      if (parentError) throw parentError

      addToast({ type: 'success', title: 'Famille créée !', message: 'Connectez-vous maintenant' })
      router.push('/login')
      router.refresh()
    } catch (error: any) {
      if (error.code === '23505') {
        addToast({ type: 'error', title: 'Erreur', message: 'Cet email est déjà utilisé' })
      } else {
        addToast({ type: 'error', title: 'Erreur', message: error.message || 'Impossible de créer le compte' })
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Créer ma famille</h1>
          <p className="text-gray-600 mt-1">Configurez votre compte parent</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inscription Parent</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Nom de la famille *"
                value={formData.familyName}
                onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                error={errors.familyName}
                placeholder="Ex: Famille Martin"
                autoComplete="off"
                disabled={loading}
              />

              <Input
                label="Votre prénom *"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                error={errors.parentName}
                placeholder="Ex: Marie"
                autoComplete="given-name"
                disabled={loading}
              />

              <Input
                label="Email *"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                placeholder="parent@email.com"
                autoComplete="email"
                disabled={loading}
              />

              <div className="relative">
                <Input
                  label="Mot de passe *"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  error={errors.password}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirmer le mot de passe *"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  error={errors.confirmPassword}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Créer ma famille
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Déjà un compte ?{' '}
                <a href="/login" className="text-primary-500 hover:underline font-medium">
                  Se connecter
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
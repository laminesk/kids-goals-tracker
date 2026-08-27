'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, User, Lock, UserCheck, Shield } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const { addToast } = useToast()
  const [role, setRole] = useState<'parent' | 'child'>('parent')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    parent: { email: '', password: '' },
    child: { name: '', pin: '' },
  })
  const [errors, setErrors] = useState({
    parent: { email: '', password: '' },
    child: { name: '', pin: '' },
  })

  const redirectTo = searchParams.get('redirect') || (role === 'parent' ? '/parent' : '/child')

  const validateParentForm = () => {
    const newErrors = { email: '', password: '' }
    if (!formData.parent.email) newErrors.email = 'Email requis'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parent.email)) newErrors.email = 'Email invalide'
    if (!formData.parent.password) newErrors.password = 'Mot de passe requis'
    setErrors((prev) => ({ ...prev, parent: newErrors }))
    return !newErrors.email && !newErrors.password
  }

  const validateChildForm = () => {
    const newErrors = { name: '', pin: '' }
    if (!formData.child.name) newErrors.name = 'Nom requis'
    if (!formData.child.pin) newErrors.pin = 'PIN requis'
    else if (!/^\d{4,6}$/.test(formData.child.pin)) newErrors.pin = 'PIN invalide (4-6 chiffres)'
    setErrors((prev) => ({ ...prev, child: newErrors }))
    return !newErrors.name && !newErrors.pin
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (role === 'parent') {
      if (!validateParentForm()) {
        setLoading(false)
        return
      }
      const result = await login('parent', formData.parent.email, formData.parent.password)
      if (result.success) {
        addToast({ type: 'success', title: 'Connexion réussie', message: 'Bienvenue !' })
        router.push(redirectTo)
        router.refresh()
      } else {
        addToast({ type: 'error', title: 'Erreur', message: result.error })
      }
    } else {
      if (!validateChildForm()) {
        setLoading(false)
        return
      }
      const result = await login('child', formData.child.name, formData.child.pin)
      if (result.success) {
        addToast({ type: 'success', title: 'Connexion réussie', message: `Bienvenue ${formData.child.name} !` })
        router.push(redirectTo)
        router.refresh()
      } else {
        addToast({ type: 'error', title: 'Erreur', message: result.error })
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
          <h1 className="text-3xl font-bold text-gray-900">Kids Goals Tracker</h1>
          <p className="text-gray-600 mt-1">Gestion des objectifs familiaux</p>
        </div>

        <Card>
          <CardHeader>
            <Tabs defaultValue={role} onChange={(value) => setRole(value as 'parent' | 'child')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="parent">
                  <User className="w-4 h-4 mr-2" />
                  Parent
                </TabsTrigger>
                <TabsTrigger value="child">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Enfant
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'parent' ? (
                <>
                  <Input
                    label="Email"
                    type="email"
                    value={formData.parent.email}
                    onChange={(e) => setFormData({ ...formData, parent: { ...formData.parent, email: e.target.value } })}
                    error={errors.parent.email}
                    placeholder="parent@email.com"
                    autoComplete="email"
                    disabled={loading}
                  />
                  <div className="relative">
                    <Input
                      label="Mot de passe"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.parent.password}
                      onChange={(e) => setFormData({ ...formData, parent: { ...formData.parent, password: e.target.value } })}
                      error={errors.parent.password}
                      placeholder="••••••••"
                      autoComplete="current-password"
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
                </>
              ) : (
                <>
                  <Input
                    label="Prénom"
                    type="text"
                    value={formData.child.name}
                    onChange={(e) => setFormData({ ...formData, child: { ...formData.child, name: e.target.value } })}
                    error={errors.child.name}
                    placeholder="Maxime"
                    autoComplete="given-name"
                    disabled={loading}
                  />
                  <div className="relative">
                    <Input
                      label="PIN (4-6 chiffres)"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.child.pin}
                      onChange={(e) => setFormData({ ...formData, child: { ...formData.child, pin: e.target.value } })}
                      error={errors.child.pin}
                      placeholder="1234"
                      autoComplete="off"
                      disabled={loading}
                      inputMode="numeric"
                      maxLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? 'Masquer le PIN' : 'Afficher le PIN'}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                {role === 'parent' ? 'Se connecter' : 'Entrer'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                {role === 'parent'
                  ? 'Première fois ? '
                  : 'Demandez à votre parent de vous créer un compte.'}
                {role === 'parent' && (
                  <a href="/register" className="text-primary-500 hover:underline font-medium">
                    Créez votre famille
                  </a>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
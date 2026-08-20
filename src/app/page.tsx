'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Shield, ArrowRight, Users, Target, Gift, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import Link from 'next/link'

export default function HomePage() {
  const router = useRouter()
  const { session, loading } = useAuth()

  useEffect(() => {
    if (!loading && session) {
      router.push(session.user.role === 'parent' ? '/parent' : '/child')
    }
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (session) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Kids Goals Tracker</span>
          </div>
          <Link href="/login">
            <Button variant="ghost">Connexion</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="px-6 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary-100 mb-6">
              <Shield className="w-10 h-10 text-primary-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Transformez les tâches en <span className="text-primary-500">aventures</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Une application ludique pour motiver vos enfants à accomplir leurs tâches quotidiennes 
              et hebdomadaires. Points, récompenses, validation parentale : tout pour une routine familiale harmonieuse.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto px-8">
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Commencer gratuitement
                </Button>
              </Link>
              <Link href="/login?redirect=/parent">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                  Mode Parent
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Fonctionnalités</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-7 h-7 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestion familiale</h3>
                  <p className="text-gray-600">Jusqu\'à 4 enfants par famille, rôles parent/enfant distincts avec authentification sécurisée</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-7 h-7 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Tâches & Récurrence</h3>
                  <p className="text-gray-600">Quotidienne, hebdomadaire, personnalisée (lun/mer/ven...). Deadline, points, assignation multiple</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-7 h-7 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Récompenses & Points</h3>
                  <p className="text-gray-600">Système de points, récompenses personnalisées, déblocage enfant, notifications temps réel</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-7 h-7 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Validation & Historique</h3>
                  <p className="text-gray-600">Workflow enfant → parent, approbation/rejet, historique tâches non-faites sur 1 mois</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Sécurité & Confidentialité</h3>
                  <p className="text-gray-600">Mots de passe hashés, PIN enfants, isolation des données par famille, session persistante</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 rounded-xl bg-pink-100 flex items-center justify-center mx-auto mb-4">
                    <Gift className="w-7 h-7 text-pink-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notifications In-App</h3>
                  <p className="text-gray-600">30 dernières notifications, marquage lu/non-lu, suppression individuelle ou groupée</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="px-6 py-20 bg-gray-50">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Prêt à commencer ?</h2>
            <p className="text-gray-600 mb-8">Créez votre famille en quelques clics et commencez à suivre les objectifs de vos enfants dès aujourd'hui.</p>
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto px-8">
                <ArrowRight className="w-5 h-5 mr-2" />
                Créer mon compte
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>Kids Goals Tracker - Application de productivité familiale</p>
        </div>
      </footer>
    </div>
  )
}
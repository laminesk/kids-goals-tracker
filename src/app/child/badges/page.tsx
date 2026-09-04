'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Star, Shield, Award, Sparkles, Crown, TrendingUp, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { BadgeConfig, BadgeEarned } from '@/types/database'

export default function ChildBadgesPage() {
  const { session } = useAuth()
  const [earnedBadges, setEarnedBadges] = useState<(BadgeEarned & { badge_config: BadgeConfig })[]>([])
  const [availableBadges, setAvailableBadges] = useState<BadgeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'earned' | 'available'>('earned')

  useEffect(() => {
    async function fetchData() {
      if (!session?.user) return
      const supabase = getSupabase()

      // Fetch badge configs for this family
      const { data: configs } = await supabase
        .from('badge_configs')
        .select('*')
        .eq('family_id', session.user.family_id)
        .eq('is_active', true)
        .order('tier', { ascending: false })

      if (configs) setAvailableBadges(configs)

      // Fetch badges earned by this child
      const { data: earned } = await supabase
        .from('badges_earned')
        .select(`
          *,
          badge_configs (*)
        `)
        .eq('child_id', session.user.id)
        .order('earned_at', { ascending: false })

      if (earned) {
        const formatted = earned.map(e => ({
          ...e,
          badge_config: e.badge_configs,
        }))
        setEarnedBadges(formatted)
      }
      setLoading(false)
    }
    fetchData()
  }, [session])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse"><div className="h-6 w-48 bg-gray-200 rounded" /></div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="h-40" /></Card>
          ))}
        </div>
      </div>
    )
  }

  // Count by tier
  const goldCount = earnedBadges.filter(b => b.badge_config?.tier === 'gold').length
  const silverCount = earnedBadges.filter(b => b.badge_config?.tier === 'silver').length

  const getPokemonColor = (pokemonName: string) => {
    // Simple color mapping based on Pokemon name
    const colors: Record<string, string> = {
      pikachu: 'from-yellow-300 to-yellow-500',
      dracaufeu: 'from-red-300 to-red-500',
      charizard: 'from-red-300 to-red-500',
      mewtwo: 'from-purple-300 to-purple-500',
      evoli: 'from-brown-300 to-brown-500',
      eevee: 'from-brown-300 to-brown-500',
      ronflex: 'from-blue-300 to-blue-500',
      snorlax: 'from-blue-300 to-blue-500',
      magikarp: 'from-orange-300 to-orange-500',
      gyarados: 'from-blue-400 to-blue-600',
    }
    return colors[pokemonName.toLowerCase()] || 'from-gray-300 to-gray-500'
  }

  const getTierGradient = (tier: string) => {
    return tier === 'gold' ? 'from-yellow-400 via-yellow-200 to-yellow-400' : 'from-gray-300 via-gray-100 to-gray-300'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/child">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Mes Badges Pokémon</h1>
        <div className="w-16" />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardContent className="p-6 text-center">
            <Star className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-yellow-700">Badges Or</p>
            <p className="text-3xl font-bold text-yellow-600">{goldCount}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-6 text-center">
            <Shield className="w-10 h-10 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-700">Badges Argent</p>
            <p className="text-3xl font-bold text-gray-600">{silverCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('earned')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'earned'
              ? 'bg-white shadow-sm text-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Award className="w-4 h-4 inline mr-1" />
          Mes badges ({earnedBadges.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'available'
              ? 'bg-white shadow-sm text-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-1" />
          À gagner ({availableBadges.length})
        </button>
      </div>

      {activeTab === 'earned' ? (
        <div>
          {earnedBadges.length === 0 ? (
            <Card className="border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun badge pour l'instant</h3>
                <p className="text-gray-600 mb-4">Gagne des points pour débloquer tes premiers badges Pokémon !</p>
                <Link href="/child">
                  <Button variant="primary"><TrendingUp className="w-4 h-4 mr-2" /> Voir mes tâches</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {earnedBadges.map((earned) => {
                const badge = earned.badge_config
                if (!badge) return null
                const gradient = getTierGradient(badge.tier)
                const pokemonGradient = getPokemonColor(badge.pokemon_name)
                const earnedDate = new Date(earned.earned_at).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: '2-digit', year: 'numeric'
                })

                return (
                  <Card
                    key={earned.id}
                    className={`relative overflow-hidden border-2 transition-all hover:shadow-lg ${
                      badge.tier === 'gold' ? 'border-yellow-300' : 'border-gray-300'
                    }`}
                  >
                    {/* Background gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
                    
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className={badge.tier === 'gold' ? 'bg-yellow-100 border-yellow-300 text-yellow-700 flex items-center gap-1' : 'bg-gray-100 border-gray-300 text-gray-700 flex items-center gap-1'}>
                          {badge.tier === 'gold' ? (
                            <> <Star className="w-3 h-3" /> Or </>
                          ) : (
                            <> <Shield className="w-3 h-3" /> Argent </>
                          )}
                        </Badge>
                        <span className="text-xs text-gray-400">{earnedDate}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Pokemon Image */}
                        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${pokemonGradient} flex items-center justify-center flex-shrink-0`}>
                          {badge.pokemon_image_url ? (
                            <img src={badge.pokemon_image_url} alt={badge.pokemon_name} className="w-20 h-20 object-contain" />
                          ) : (
                            <span className="text-5xl">{badge.tier === 'gold' ? '🥇' : '🥈'}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{badge.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{badge.pokemon_name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {earned.points_earned} pts gagnés sur la période
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {earned.period_start} → {earned.period_end}
                        </span>
                        <Crown className="w-5 h-5 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          {availableBadges.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun badge disponible</h3>
                <p className="text-gray-600">Demande à tes parents de configurer des badges !</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableBadges.map((badge) => {
                const gradient = getTierGradient(badge.tier)
                const pokemonGradient = getPokemonColor(badge.pokemon_name)
                const isEarned = earnedBadges.some(e => e.badge_config_id === badge.id)
                const frequencyLabel = badge.frequency === 'daily' ? '📅 Quotidien' : '📆 Hebdomadaire'

                return (
                  <Card
                    key={badge.id}
                    className={`relative overflow-hidden border-2 transition-all hover:shadow-lg opacity-75 ${
                      badge.tier === 'gold' ? 'border-yellow-300' : 'border-gray-300'
                    } ${isEarned ? 'ring-2 ring-green-400' : ''}`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`} />
                    
                    <CardContent className="p-4 relative">
                      <div className="flex items-start justify-between mb-3">
                        <Badge variant="outline" className={badge.tier === 'gold' ? 'bg-yellow-100 border-yellow-300 text-yellow-700 flex items-center gap-1' : 'bg-gray-100 border-gray-300 text-gray-700 flex items-center gap-1'}>
                          {badge.tier === 'gold' ? (
                            <> <Star className="w-3 h-3" /> Or </>
                          ) : (
                            <> <Shield className="w-3 h-3" /> Argent </>
                          )}
                        </Badge>
                        {isEarned && (
                          <Badge variant="success" className="ml-auto">
                            <Check className="w-3 h-3 mr-1" /> Obtenu
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${pokemonGradient} flex items-center justify-center flex-shrink-0`}>
                          {badge.pokemon_image_url ? (
                            <img src={badge.pokemon_image_url} alt={badge.pokemon_name} className="w-20 h-20 object-contain" />
                          ) : (
                            <span className="text-5xl">{badge.tier === 'gold' ? '🥇' : '🥈'}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate">{badge.name}</h3>
                          <p className="text-sm text-gray-600 capitalize">{badge.pokemon_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{frequencyLabel}</p>
                          <p className="text-xs text-primary-600 font-medium mt-1">
                            Seuil : {badge.threshold_points} pts
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
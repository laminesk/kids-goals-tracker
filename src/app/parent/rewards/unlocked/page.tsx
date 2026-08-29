'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Gift, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { formatDateTime } from '@/utils/helpers'
import { RewardUnlock, Child, Reward } from '@/types/database'

export default function ParentUnlockedRewardsPage() {
  const { session } = useAuth()
  const { addToast } = useToast()
  const [unlocks, setUnlocks] = useState<(RewardUnlock & { reward: Reward; child: Child })[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'settled'>('pending')
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [resetForReuse, setResetForReuse] = useState(false)
  const [settlingError, setSettlingError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!session?.user) return
    const supabase = getSupabase()

    const { data } = await supabase
      .from('reward_unlocks')
      .select(`
        *,
        rewards (id, name, cost_points, description),
        children (id, name)
      `)
      .in('child_id', 
        (await supabase.from('children').select('id').eq('family_id', session.user.family_id)).data?.map(c => c.id) || []
      )
      .order('unlocked_at', { ascending: false })

    if (data) {
      const formatted = data.map(u => ({
        ...u,
        reward: u.rewards,
        child: u.children
      }))
      setUnlocks(formatted)
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const filteredUnlocks = unlocks.filter(u => {
    if (filterStatus === 'pending') return !u.settled_at
    if (filterStatus === 'settled') return !!u.settled_at
    return true
  })

  const handleSettle = (unlockId: string) => {
    setSettlingId(unlockId)
    setResetForReuse(false)
    setSettlingError(null)
  }

  const confirmSettle = async () => {
    if (!settlingId || !session?.user?.family_id) return
    
    setSettlingError(null)
    
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('reward_unlocks')
        .update({
          settled_at: new Date().toISOString(),
          settled_by: session.user.id,
          reset_for_reuse: resetForReuse
        })
        .eq('id', settlingId)

      if (error) {
        console.error('Erreur update reward_unlocks:', error)
        setSettlingError(error.message || 'Erreur lors du solder')
        addToast({ type: 'error', title: 'Erreur', message: error.message || 'Impossible de solder la récompense' })
        return
      }

      // Verify the update by fetching the record
      const { data: verifyData, error: verifyError } = await supabase
        .from('reward_unlocks')
        .select('settled_at, settled_by, reset_for_reuse')
        .eq('id', settlingId)
        .single()

      if (verifyError || !verifyData?.settled_at) {
        console.error('Vérification échouée:', verifyError, verifyData)
        setSettlingError('La mise à jour n\'a pas été persistée')
        addToast({ type: 'error', title: 'Erreur', message: 'La récompense n\'a pas été soldée (vérification échouée)' })
        return
      }

      addToast({ 
        type: 'success', 
        title: 'Récompense soldée', 
        message: resetForReuse ? 'Récompense remise à disposition de l\'enfant' : 'Récompense soldée définitivement' 
      })
      
      setUnlocks(prev => prev.map(u => 
        u.id === settlingId ? { 
          ...u, 
          settled_at: new Date().toISOString(), 
          settled_by: session.user.id,
          reset_for_reuse: resetForReuse
        } : u
      ))
      setResetForReuse(false)
      setSettlingId(null)
      
    } catch (err) {
      console.error('Exception confirmSettle:', err)
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setSettlingError(msg)
      addToast({ type: 'error', title: 'Erreur', message: msg })
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Récompenses débloquées</h1>
          <p className="text-gray-600">Gérez les récompenses débloquées par vos enfants</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filterStatus === 'all' ? 'primary' : 'outline'} 
              size="sm" 
              onClick={() => setFilterStatus('all')}
            >
              Toutes
            </Button>
            <Button 
              variant={filterStatus === 'pending' ? 'primary' : 'outline'} 
              size="sm" 
              onClick={() => setFilterStatus('pending')}
            >
              En attente ({unlocks.filter(u => !u.settled_at).length})
            </Button>
            <Button 
              variant={filterStatus === 'settled' ? 'primary' : 'outline'} 
              size="sm" 
              onClick={() => setFilterStatus('settled')}
            >
              Soldées ({unlocks.filter(u => u.settled_at).length})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filteredUnlocks.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune récompense</h3>
              <p className="text-gray-600">Aucune récompense débloquée pour ce filtre</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Récompense</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enfant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Débloquée le</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUnlocks.map((unlock) => (
                    <tr key={unlock.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{unlock.reward?.name || 'Récompense'}</p>
                        {unlock.reward?.description && <p className="text-sm text-gray-600 max-w-xs truncate">{unlock.reward.description}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium">
                            {unlock.child?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-sm text-gray-700">{unlock.child?.name || 'Inconnu'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info">{unlock.reward?.cost_points || 0} pts</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{formatDateTime(unlock.unlocked_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={unlock.settled_at ? 'success' : 'warning'}>
                          {unlock.settled_at ? 'Soldée' : 'En attente'}
                        </Badge>
                        {unlock.reset_for_reuse && unlock.settled_at && (
                          <Badge variant="outline" className="ml-1 text-xs">Remise dispo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {unlock.settled_at ? (
                          <div className="flex items-center justify-end gap-2 text-sm text-gray-500">
                            <span>Soldée le {formatDateTime(unlock.settled_at)}</span>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => setSettlingId(unlock.id)}
                          >
                            <Clock className="w-4 h-4 mr-1" />
                            Solder
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {settlingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => { setSettlingId(null); setResetForReuse(false); setSettlingError(null); }} />
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => { setSettlingId(null); setResetForReuse(false); setSettlingError(null); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Solder la récompense</h2>
            <p className="text-gray-600 mb-4">Confirmez le solder de cette récompense. L'enfant a débloqué cette récompense et attend votre validation.</p>
            
            {settlingError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{settlingError}</span>
              </div>
            )}
            
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={resetForReuse}
                onChange={(e) => setResetForReuse(e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-gray-900">Remettre cette récompense à disposition</p>
                <p className="text-sm text-gray-500">Si coché, l'enfant pourra débloquer cette récompense à nouveau (points redéduits)</p>
              </div>
            </label>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setSettlingId(null); setResetForReuse(false); setSettlingError(null); }}>
                Annuler
              </Button>
              <Button onClick={confirmSettle} loading={!!settlingError}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
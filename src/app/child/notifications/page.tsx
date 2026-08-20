'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { useAuth } from '@/hooks/useAuth'
import { getSupabase } from '@/lib/supabase/client'
import { formatDateTime } from '@/utils/helpers'
import { Notification as NotificationType } from '@/types/database'

export default function ChildNotificationsPage() {
  const { session } = useAuth()
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [loading, setLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const fetchNotifications = async () => {
    if (!session?.user) return
    const supabase = getSupabase()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('user_type', 'child')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setNotifications(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
  }, [session])

  const markAsRead = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const markAllAsRead = async () => {
    if (!session?.user) return
    const supabase = getSupabase()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('user_type', 'child')
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = async (id: string) => {
    const supabase = getSupabase()
    await supabase.from('notifications').update({ deleted_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const deleteAllNotifications = async () => {
    if (!session?.user) return
    const supabase = getSupabase()
    await supabase
      .from('notifications')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', session.user.id)
      .eq('user_type', 'child')
    setNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_approved': return <Check className="w-5 h-5 text-green-500" />
      case 'task_rejected': return <X className="w-5 h-5 text-red-500" />
      case 'reward_unlocked': return <Bell className="w-5 h-5 text-purple-500" />
      case 'new_task': return <Bell className="w-5 h-5 text-blue-500" />
      case 'new_reward': return <Bell className="w-5 h-5 text-orange-500" />
      default: return <Bell className="w-5 h-5 text-gray-500" />
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
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">Tes dernières notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" />
              Tout marquer lu
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(true)}>
              <X className="w-4 h-4 mr-1" />
              Tout effacer
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
              <p className="text-gray-600">Tes notifications apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-6 py-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTime(notif.created_at)}</p>
                      {!notif.read && (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="mt-2 text-xs text-primary-500 hover:text-primary-600"
                        >
                          Marquer comme lu
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded"
                      aria-label="Supprimer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {notifications.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {notifications.length} notification(s) au total, {unreadCount} non lue(s)
        </p>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={deleteAllNotifications}
        title="Effacer toutes les notifications"
        message="Cette action est irréversible. Toutes vos notifications seront supprimées définitivement."
        confirmText="Tout effacer"
        variant="danger"
      />
    </div>
  )
}


'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Bell, LogOut, LayoutDashboard, ListTodo, Gift, History, Settings, Users, ChevronDown, ChevronUp, ClipboardCheck, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { useNotifications } from '@/components/ui/Toast'
import Link from 'next/link'
import { formatDateTime, getRecurrenceLabel } from '@/utils/helpers'
import { Notification as NotificationType } from '@/types/database'

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const { session, logout, loading: authLoading } = useAuth()
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, loading: notifLoading } = useNotifications()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showClearNotifConfirm, setShowClearNotifConfirm] = useState(false)

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/login')
    }
    // Redirect child trying to access parent routes
    if (session && session.user.role === 'child') {
      router.push('/child')
    }
  }, [session, authLoading, router])

  if (authLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  // Block child from accessing parent routes
  if (session.user.role === 'child') {
    return null // The redirect will happen via useEffect
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
    router.refresh()
  }

  const formatNotifTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
              <Link href="/parent" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Kids Goals Tracker</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lues` : ''}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                            Tout marquer lu
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setShowClearNotifConfirm(true)}>
                          Tout effacer
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifLoading ? (
                        <div className="px-4 py-8 text-center text-gray-500">Chargement...</div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">Aucune notification</div>
                      ) : (
                        notifications.map((notif: NotificationType) => (
                          <div
                            key={notif.id}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-blue-50' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${!notif.read ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                {notif.message}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteNotification(notif.id)
                                }}
                                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded"
                                aria-label="Supprimer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{formatNotifTime(notif.created_at)}</p>
                            {!notif.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notif.id)
                                }}
                                className="mt-2 text-xs text-primary-500 hover:text-primary-600"
                              >
                                Marquer comme lu
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Parent</span>
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-medium">
                  {session.user.name?.charAt(0).toUpperCase() || 'P'}
                </div>
              </div>

              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="Déconnexion"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          aria-label="Navigation principale"
        >
          <nav className="p-4 space-y-1" role="navigation">
            <Link
              href="/parent"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Tableau de bord</span>
            </Link>
            <Link
              href="/parent/tasks"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ListTodo className="w-5 h-5" />
              <span>Gestion des tâches</span>
            </Link>
            <Link
              href="/parent/rewards"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Gift className="w-5 h-5" />
              <span>Gestion des récompenses</span>
            </Link>
            <Link
              href="/parent/history"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <History className="w-5 h-5" />
              <span>Historique non-fait</span>
            </Link>
            <Link
              href="/parent/approvals"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ClipboardCheck className="w-5 h-5" />
              <span>Tâches à approuver</span>
            </Link>
            <Link
              href="/parent/rewards/unlocked"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Receipt className="w-5 h-5" />
              <span>Récompenses débloquées</span>
            </Link>
            <Link
              href="/parent/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span>Paramètres</span>
            </Link>
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <main className="flex-1 lg:ml-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Déconnexion"
        message="Êtes-vous sûr de vouloir vous déconnecter ?"
        confirmText="Se déconnecter"
        variant="danger"
      />

      <ConfirmModal
        isOpen={showClearNotifConfirm}
        onClose={() => setShowClearNotifConfirm(false)}
        onConfirm={deleteAllNotifications}
        title="Effacer toutes les notifications"
        message="Cette action est irréversible. Toutes vos notifications seront supprimées définitivement."
        confirmText="Tout effacer"
        variant="danger"
      />
    </div>
  )
}

import { useState } from 'react'
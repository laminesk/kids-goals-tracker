'use client'

import { Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page introuvable</p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <button className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
              Accueil
            </button>
          </Link>
          <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
        </div>
      </div>
    </div>
  )
}
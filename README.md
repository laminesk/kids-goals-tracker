# Kids Goals Tracker

Application de gestion des objectifs familiaux pour enfants avec système de points et récompenses.

## Stack Technique

- **Frontend** : Next.js 15 + React 18 + TypeScript
- **Styling** : Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + RLS)
- **Hosting** : Vercel
- **État** : React Context + Hooks

## Fonctionnalités

### 🔐 Authentification
- **Parents** : Email + mot de passe (hashé bcrypt)
- **Enfants** : Prénom + PIN 4-6 chiffres (hashé bcrypt)
- Sessions persistantes (localStorage)

### 👨‍👩‍👧‍👦 Espace Parent
- **Tableau de bord** : Vue d'ensemble enfants (points, tâches faites/non-faites), activité récente
- **Gestion des tâches** : CRUD complet, récurrence (quotidienne/hebdomadaire/personnalisée), assignation multiple
- **Gestion des récompenses** : CRUD, activation/désactivation, coûts en points
- **Historique non-fait** : Filtres par enfant et période (7j/14j/30j)
- **Paramètres** : Changement mot de passe parent, PIN enfants, export CSV, réinitialisation points
- **Notifications** : Dropdown temps réel, marquage lu, suppression

### 🧒 Espace Enfant
- **Tableau de bord** : Solde points, tâches aujourd'hui/à venir/en retard, validation tâches
- **Récompenses** : Disponibles (débloquables) et bloquées (points manquants)
- **En attente** : Tâches validées en attente d'approbation parentale
- **Notifications** : Historique 30 dernières, types variés
- **Paramètres** : Changement PIN personnel

### ⚙️ Système de Tâches Récurrentes
- Quotidienne : nouvelle instance chaque jour à 00h
- Hebdomadaire : nouvelle instance chaque lundi (ou jours choisis)
- Personnalisée : jours spécifiques (lun/mer/ven, etc.)
- Non-faites → historique, nouvelle instance créée quand même

### 💰 Points & Récompenses
- Points gagnés = parent approuve tâche
- Solde initial = 0
- Pas de pénalité points (juste tracking stats)
- Récompenses personnalisées par les parents
- Déblocage enfant = points déduits + notif parent

### 🔔 Notifications In-App
Stockées en base, 30 dernières affichées, types :
- **Parent** : enfant valide tâche, enfant débloque récompense, nouvelle tâche (récurrence), nouvelle récompense créée
- **Enfant** : tâche approuvée/rejetée, nouvelle tâche assignée, nouvelle récompense dispo, récompense débloquée

## Installation

### 1. Prérequis
- Node.js 20+
- Compte Supabase
- (Optionnel) Supabase CLI pour développement local

### 2. Configuration Supabase

```bash
# Créer un projet sur https://supabase.com
# Puis exécuter la migration SQL dans l'éditeur SQL de Supabase :
# Contenu de supabase/migrations/001_initial_schema.sql
```

### 3. Variables d'environnement

```bash
cp .env.example .env.local
# Éditer .env.local avec vos clés Supabase
```

### 4. Installation et développement

```bash
npm install
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### 5. Déploiement Vercel

1. Push sur GitHub
2. Importer le repo sur Vercel
3. Ajouter les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Déployer

## Structure du Projet

```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── login/page.tsx           # Page de connexion
│   ├── parent/
│   │   ├── layout.tsx           # Layout parent (sidebar, header, notifications)
│   │   ├── page.tsx             # Dashboard parent
│   │   ├── tasks/page.tsx       # Gestion tâches
│   │   ├── rewards/page.tsx     # Gestion récompenses
│   │   ├── history/page.tsx     # Historique non-fait
│   │   └── settings/page.tsx    # Paramètres
│   └── child/
│       ├── layout.tsx           # Layout enfant
│       ├── page.tsx             # Dashboard enfant
│       ├── notifications/page.tsx
│       └── settings/page.tsx
├── components/
│   └── ui/                      # Composants UI réutilisables
├── hooks/
│   └── useAuth.tsx              # Auth context + hook
├── lib/
│   └── supabase/client.ts       # Client Supabase
├── types/
│   └── database.ts              # Types TypeScript
└── utils/
    └── helpers.ts               # Fonctions utilitaires
```

## Base de Données

Tables principales :
- `families` - Familles
- `parents` - Parents (email, password_hash)
- `children` - Enfants (nom, pin_hash)
- `tasks` - Tâches définitions (récurrence, points, assignation)
- `task_instances` - Instances quotidiennes/hebdomadaires
- `rewards` - Récompenses (coût, description)
- `reward_unlocks` - Récompenses débloquées par enfant
- `notifications` - Notifications in-app

RLS (Row Level Security) activé sur toutes les tables.

## Développement

### Commandes utiles

```bash
npm run dev        # Serveur de développement
npm run build      # Build production
npm run start      # Serveur production
npm run lint       # ESLint
```

### Ajouter une migration

```bash
# Créer un fichier dans supabase/migrations/
# Puis l'appliquer via Supabase Dashboard > SQL Editor
```

## Sécurité

- Mots de passe/PIN hashés avec bcrypt (12 rounds)
- RLS Supabase pour isolation des données par famille
- Pas de limitation tentatives (selon specs)
- Enfants ne voient que leurs données
- Soft delete pour tâches/récompenses (historique conservé)

## Tests Manuels Recommandés

1. Créer une famille (inscription parent)
2. Ajouter 2-3 enfants
3. Créer tâches : quotidienne, hebdomadaire, personnalisée, sans échéance
4. Créer récompenses variées (coûts différents)
5. Enfant : valider tâches → Parent : approuver/rejeter
6. Enfant : débloquer récompenses
7. Vérifier notifications des deux côtés
8. Tester filtres historique
9. Tester export CSV
10. Tester changement MDP/PIN

## Licence

MIT
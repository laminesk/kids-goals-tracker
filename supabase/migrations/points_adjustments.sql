-- Migration: Add points_adjustments table for bonus/malus points
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.points_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('bonus', 'malus')),
    points INTEGER NOT NULL CHECK (points > 0),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS désactivé car l'app utilise une auth custom (localStorage)
-- L'autorisation est gérée côté application via session.user.family_id

-- Indexes
CREATE INDEX IF NOT EXISTS idx_points_adjustments_child_id ON public.points_adjustments(child_id);
CREATE INDEX IF NOT EXISTS idx_points_adjustments_created_at ON public.points_adjustments(created_at DESC);
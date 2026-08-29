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

-- Enable RLS
ALTER TABLE public.points_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies
-- Parents can view adjustments for children in their family
CREATE POLICY "Parents can view family adjustments" ON public.points_adjustments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.children c
            JOIN public.parents p ON p.family_id = c.family_id
            WHERE c.id = points_adjustments.child_id
            AND p.id = auth.uid()
        )
    );

-- Parents can insert adjustments for children in their family
CREATE POLICY "Parents can create adjustments" ON public.points_adjustments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children c
            JOIN public.parents p ON p.family_id = c.family_id
            WHERE c.id = points_adjustments.child_id
            AND p.id = auth.uid()
        )
        AND points_adjustments.parent_id = auth.uid()
    );

-- Children can view their own adjustments
CREATE POLICY "Children can view own adjustments" ON public.points_adjustments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = points_adjustments.child_id
            AND c.id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_points_adjustments_child_id ON public.points_adjustments(child_id);
CREATE INDEX IF NOT EXISTS idx_points_adjustments_created_at ON public.points_adjustments(created_at DESC);
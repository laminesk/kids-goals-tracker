-- Migration: Add badge system tables
-- Run this in Supabase SQL Editor

-- Badge configurations (defined by parents)
CREATE TABLE IF NOT EXISTS public.badge_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('silver', 'gold')),
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly')),
    threshold_points INTEGER NOT NULL CHECK (threshold_points > 0),
    pokemon_name TEXT NOT NULL,
    pokemon_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Badges earned by children
CREATE TABLE IF NOT EXISTS public.badges_earned (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    badge_config_id UUID NOT NULL REFERENCES public.badge_configs(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    points_earned INTEGER NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_badge_configs_family ON public.badge_configs(family_id);
CREATE INDEX IF NOT EXISTS idx_badges_earned_child ON public.badges_earned(child_id);
CREATE INDEX IF NOT EXISTS idx_badges_earned_config ON public.badges_earned(badge_config_id);
CREATE INDEX IF NOT EXISTS idx_badges_earned_date ON public.badges_earned(earned_at DESC);

-- RLS Policies (using custom auth, so disable RLS or use simple policies)
ALTER TABLE public.badge_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges_earned ENABLE ROW LEVEL SECURITY;

-- Parents can manage badge configs for their family
CREATE POLICY "Parents manage family badge configs" ON public.badge_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.parents p
            WHERE p.family_id = badge_configs.family_id
            AND p.id = auth.uid()
        )
    );

-- Parents can view badges earned for children in their family
CREATE POLICY "Parents view family badges earned" ON public.badges_earned
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.children c
            JOIN public.parents p ON p.family_id = c.family_id
            WHERE c.id = badges_earned.child_id
            AND p.id = auth.uid()
        )
    );

-- Children can view their own earned badges
CREATE POLICY "Children view own badges" ON public.badges_earned
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = badges_earned.child_id
            AND c.id = auth.uid()
        )
    );

-- Updated_at trigger for badge_configs
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_badge_configs_updated_at
    BEFORE UPDATE ON public.badge_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
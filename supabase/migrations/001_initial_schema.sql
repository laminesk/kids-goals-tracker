-- Kids Goals Tracker Database Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Families table
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parents table
CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Children table
CREATE TABLE children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    points INTEGER NOT NULL CHECK (points > 0),
    deadline DATE,
    recurrence_type TEXT NOT NULL DEFAULT 'none' CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'custom')),
    recurrence_days INTEGER[], -- Array of day numbers (0=Sunday, 1=Monday, etc.)
    assigned_to UUID[] NOT NULL DEFAULT '{}', -- Array of child IDs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Task instances table (one row per activation)
CREATE TABLE task_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    validated_by_child_at TIMESTAMPTZ,
    approved_by_parent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, child_id, date)
);

-- Rewards table
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cost_points INTEGER NOT NULL CHECK (cost_points > 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Reward unlocks table
CREATE TABLE reward_unlocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(reward_id, child_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('parent', 'child')),
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_tasks_family_id ON tasks(family_id);
CREATE INDEX idx_tasks_is_active ON tasks(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_task_instances_task_id ON task_instances(task_id);
CREATE INDEX idx_task_instances_child_id ON task_instances(child_id);
CREATE INDEX idx_task_instances_date ON task_instances(date);
CREATE INDEX idx_task_instances_status ON task_instances(status);
CREATE INDEX idx_rewards_family_id ON rewards(family_id);
CREATE INDEX idx_rewards_is_active ON rewards(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_reward_unlocks_child_id ON reward_unlocks(child_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_children_family_id ON children(family_id);
CREATE INDEX idx_parents_family_id ON parents(family_id);

-- Row Level Security (RLS) Policies
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Families: users can only see their own family
CREATE POLICY "Families - own family" ON families
    FOR ALL USING (id IN (
        SELECT family_id FROM parents WHERE id = auth.uid()
        UNION
        SELECT family_id FROM children WHERE id = auth.uid()
    ));

-- Parents: can only see parents in their family
CREATE POLICY "Parents - own family" ON parents
    FOR ALL USING (family_id IN (
        SELECT family_id FROM parents WHERE id = auth.uid()
    ));

-- Children: can only see children in their family
CREATE POLICY "Children - own family" ON children
    FOR ALL USING (family_id IN (
        SELECT family_id FROM parents WHERE id = auth.uid()
        UNION
        SELECT family_id FROM children WHERE id = auth.uid()
    ));

-- Tasks: family members can see active tasks
CREATE POLICY "Tasks - family members" ON tasks
    FOR SELECT USING (
        family_id IN (
            SELECT family_id FROM parents WHERE id = auth.uid()
            UNION
            SELECT family_id FROM children WHERE id = auth.uid()
        )
        AND is_active = TRUE
    );

CREATE POLICY "Tasks - parents manage" ON tasks
    FOR ALL USING (
        family_id IN (
            SELECT family_id FROM parents WHERE id = auth.uid()
        )
    );

-- Task instances: children see their own, parents see all in family
CREATE POLICY "Task instances - child own" ON task_instances
    FOR SELECT USING (
        child_id = auth.uid()
    );

CREATE POLICY "Task instances - parent family" ON task_instances
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM parents WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Task instances - child validate" ON task_instances
    FOR UPDATE USING (
        child_id = auth.uid()
        AND status = 'pending'
        AND validated_by_child_at IS NULL
    );

CREATE POLICY "Task instances - parent approve" ON task_instances
    FOR UPDATE USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM parents WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Task instances - system create" ON task_instances
    FOR INSERT WITH CHECK (TRUE);

-- Rewards: family members can see active rewards
CREATE POLICY "Rewards - family members" ON rewards
    FOR SELECT USING (
        family_id IN (
            SELECT family_id FROM parents WHERE id = auth.uid()
            UNION
            SELECT family_id FROM children WHERE id = auth.uid()
        )
        AND is_active = TRUE
    );

CREATE POLICY "Rewards - parents manage" ON rewards
    FOR ALL USING (
        family_id IN (
            SELECT family_id FROM parents WHERE id = auth.uid()
        )
    );

-- Reward unlocks: children see their own, parents see all in family
CREATE POLICY "Reward unlocks - child own" ON reward_unlocks
    FOR SELECT USING (child_id = auth.uid());

CREATE POLICY "Reward unlocks - parent family" ON reward_unlocks
    FOR SELECT USING (
        child_id IN (
            SELECT id FROM children WHERE family_id IN (
                SELECT family_id FROM parents WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Reward unlocks - child create" ON reward_unlocks
    FOR INSERT WITH CHECK (child_id = auth.uid());

-- Notifications: users see only their own
CREATE POLICY "Notifications - own" ON notifications
    FOR ALL USING (
        user_id = auth.uid()
        AND user_type = CASE
            WHEN EXISTS (SELECT 1 FROM parents WHERE id = auth.uid()) THEN 'parent'
            WHEN EXISTS (SELECT 1 FROM children WHERE id = auth.uid()) THEN 'child'
        END
    );
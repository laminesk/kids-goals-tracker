-- Kids Goals Tracker Database Schema - Reward Settlement Feature
-- Migration: 002_reward_settlement.sql

-- Add settlement tracking to reward_unlocks
ALTER TABLE reward_unlocks 
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settled_by UUID REFERENCES parents(id),
ADD COLUMN IF NOT EXISTS reset_for_reuse BOOLEAN DEFAULT FALSE;

-- Create index for pending settlements
CREATE INDEX IF NOT EXISTS idx_reward_unlocks_settled ON reward_unlocks(settled_at) WHERE settled_at IS NULL;

-- Add settled_at to reward_unlocks for parents to filter
-- When a reward is settled and reset_for_reuse is true, it becomes available again for the child
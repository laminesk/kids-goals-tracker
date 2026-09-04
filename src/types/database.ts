export type UserRole = 'parent' | 'child'

export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'custom'

export type TaskStatus = 'pending' | 'approved' | 'rejected'

export interface Family {
  id: string
  name: string
  created_at: string
}

export interface Parent {
  id: string
  family_id: string
  email: string
  password_hash: string
  created_at: string
}

export interface Child {
  id: string
  family_id: string
  name: string
  pin_hash: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  family_id: string
  name: string
  points: number
  deadline: string | null
  recurrence_type: TaskRecurrence
  recurrence_days: number[] | null
  assigned_to: string[]
  created_at: string
  deleted_at: string | null
  is_active: boolean
}

export interface TaskInstance {
  id: string
  task_id: string
  child_id: string
  date: string
  status: TaskStatus
  validated_by_child_at: string | null
  approved_by_parent_at: string | null
  created_at: string
  tasks?: Task
  children?: Child
}

export interface Reward {
  id: string
  family_id: string
  name: string
  cost_points: number
  description: string | null
  is_active: boolean
  created_at: string
  deleted_at: string | null
}

export interface RewardUnlock {
  id: string
  reward_id: string
  child_id: string
  unlocked_at: string
  created_at: string
  settled_at: string | null
  settled_by: string | null
  reset_for_reuse: boolean
}

export interface Notification {
  id: string
  user_id: string
  user_type: UserRole
  type: string
  message: string
  read: boolean
  created_at: string
  deleted_at: string | null
}

export interface AuthSession {
  user: {
    id: string
    role: UserRole
    family_id: string
    name: string
  }
}

export type AdjustmentType = 'bonus' | 'malus'

export interface PointsAdjustment {
  id: string
  child_id: string
  parent_id: string
  type: AdjustmentType
  points: number
  comment: string | null
  created_at: string
}

export type BadgeTier = 'silver' | 'gold'
export type BadgeFrequency = 'daily' | 'weekly'

export interface BadgeConfig {
  id: string
  family_id: string
  name: string
  tier: BadgeTier
  frequency: BadgeFrequency
  threshold_points: number
  pokemon_name: string
  pokemon_image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BadgeEarned {
  id: string
  child_id: string
  badge_config_id: string
  earned_at: string
  period_start: string
  period_end: string
  points_earned: number
}
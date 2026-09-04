import { createClient } from '@supabase/supabase-js'

// Helper to get start/end of day in UTC
function getDayBounds(date: Date) {
  const start = new Date(date)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

// Helper to get start of month and end of month
function getMonthBounds(date: Date) {
  const start = new Date(date)
  start.setUTCDate(1)
  start.setUTCHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setUTCMonth(start.getUTCMonth() + 1)
  end.setUTCDate(0) // Last day of month
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

// Helper to get start of week (Monday) and end of week (Saturday)
function getWeekBounds(date: Date) {
  const day = date.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
  const start = new Date(date)
  start.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1)) // Monday
  start.setUTCHours(0, 0, 0, 0)
  
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 5) // Saturday
  end.setUTCHours(23, 59, 59, 999)
  return { start, end }
}

// Calculate points earned by child in a period
async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

async function getPointsEarned(childId: string, start: Date, end: Date) {
  const supabase = await getSupabase()
  
  const { data: tasks } = await supabase
    .from('task_instances')
    .select(`
      tasks!inner (points)
    `)
    .eq('child_id', childId)
    .eq('status', 'approved')
    .gte('approved_by_parent_at', start.toISOString())
    .lte('approved_by_parent_at', end.toISOString())

  const { data: rewards } = await supabase
    .from('reward_unlocks')
    .select(`
      rewards!inner (cost_points)
    `)
    .eq('child_id', childId)
    .not('settled_at', 'is', null)
    .gte('settled_at', start.toISOString())
    .lte('settled_at', end.toISOString())

  const { data: adjustments } = await supabase
    .from('points_adjustments')
    .select('type, points')
    .eq('child_id', childId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const taskPoints = tasks?.reduce((sum, t) => sum + ((t.tasks as any)?.[0]?.points || 0), 0) || 0
  const rewardPoints = rewards?.reduce((sum, r) => sum + ((r.rewards as any)?.[0]?.cost_points || 0), 0) || 0
  const adjustmentPoints = adjustments?.reduce((sum, a) => sum + (a.type === 'bonus' ? a.points : -a.points), 0) || 0

  return taskPoints - rewardPoints + adjustmentPoints
}

// Check if badge already earned for this period
async function hasBadgeForPeriod(childId: string, badgeConfigId: string, periodStart: Date, periodEnd: Date) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('badges_earned')
    .select('id')
    .eq('child_id', childId)
    .eq('badge_config_id', badgeConfigId)
    .eq('period_start', periodStart.toISOString().split('T')[0])
    .eq('period_end', periodEnd.toISOString().split('T')[0])
    .single()
  
  return !!data
}

// Award badge
async function awardBadge(childId: string, badgeConfigId: string, periodStart: Date, periodEnd: Date, pointsEarned: number) {
  const supabase = await getSupabase()
  const { error } = await supabase
    .from('badges_earned')
    .insert({
      child_id: childId,
      badge_config_id: badgeConfigId,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      points_earned: pointsEarned,
    })
  
  return !error
}

export async function checkAndAwardDailyBadges() {
  console.log('🔍 Checking daily badges...')
  const now = new Date()
  const { start, end } = getDayBounds(now)
  
  // Get all active daily badge configs
  const supabase = await getSupabase()
  const { data: configs } = await supabase
    .from('badge_configs')
    .select('*')
    .eq('is_active', true)
    .eq('frequency', 'daily')
  
  if (!configs || configs.length === 0) {
    console.log('No daily badge configs found')
    return
  }
  
  // Get all children
  const { data: children } = await supabase
    .from('children')
    .select('id')
  
  if (!children) return
  
  for (const config of configs) {
    for (const child of children) {
      // Check if already earned today
      const alreadyEarned = await hasBadgeForPeriod(child.id, config.id, start, end)
      if (alreadyEarned) continue
      
      // Calculate points earned today
      const points = await getPointsEarned(child.id, start, end)
      
      if (points >= config.threshold_points) {
        const success = await awardBadge(child.id, config.id, start, end, points)
        if (success) {
          console.log(`✅ Daily badge "${config.name}" awarded to child ${child.id} (${points} pts)`)
        }
      }
    }
  }
  console.log('✅ Daily badge check complete')
}

export async function checkAndAwardWeeklyBadges() {
  console.log('🔍 Checking weekly badges...')
  const now = new Date()
  const { start, end } = getWeekBounds(now)
  
  // Only run on Sunday (0) or Monday (1) at 20h Paris time
  const day = now.getUTCDay()
  if (day !== 0 && day !== 1) {
    console.log('Not weekly check day (Sunday/Monday only)')
    return
  }
  
  const supabase = await getSupabase()
  
  const { data: configs } = await supabase
    .from('badge_configs')
    .select('*')
    .eq('is_active', true)
    .eq('frequency', 'weekly')
  
  if (!configs || configs.length === 0) {
    console.log('No weekly badge configs found')
    return
  }
  
  const { data: children } = await supabase
    .from('children')
    .select('id')
  
  if (!children) return
  
  for (const config of configs) {
    for (const child of children) {
      const alreadyEarned = await hasBadgeForPeriod(child.id, config.id, start, end)
      if (alreadyEarned) continue
      
      const points = await getPointsEarned(child.id, start, end)
      
      if (points >= config.threshold_points) {
        const success = await awardBadge(child.id, config.id, start, end, points)
        if (success) {
          console.log(`✅ Weekly badge "${config.name}" awarded to child ${child.id} (${points} pts)`)
        }
      }
    }
  }
  console.log('✅ Weekly badge check complete')
}

export async function checkAndAwardMonthlyBadges() {
  console.log('🔍 Checking monthly badges...')
  const now = new Date()
  const { start, end } = getMonthBounds(now)
  
  // Only run on the 1st day of the month (or last day)
  // We check on the 1st day of the new month for the previous month
  const day = now.getUTCDate()
  if (day !== 1) {
    console.log('Not monthly check day (1st of month only)')
    return
  }
  
  const supabase = await getSupabase()
  
  const { data: configs } = await supabase
    .from('badge_configs')
    .select('*')
    .eq('is_active', true)
    .eq('frequency', 'monthly')
  
  if (!configs || configs.length === 0) {
    console.log('No monthly badge configs found')
    return
  }
  
  const { data: children } = await supabase
    .from('children')
    .select('id')
  
  if (!children) return
  
  for (const config of configs) {
    for (const child of children) {
      const alreadyEarned = await hasBadgeForPeriod(child.id, config.id, start, end)
      if (alreadyEarned) continue
      
      const points = await getPointsEarned(child.id, start, end)
      
      if (points >= config.threshold_points) {
        const success = await awardBadge(child.id, config.id, start, end, points)
        if (success) {
          console.log(`✅ Monthly badge "${config.name}" awarded to child ${child.id} (${points} pts)`)
        }
      }
    }
  }
  console.log('✅ Monthly badge check complete')
}
import { getSupabase } from '@/lib/supabase/client'

export type NotificationType = 
  | 'task_validated'       // Child validated task
  | 'task_approved'        // Parent approved task
  | 'task_rejected'        // Parent rejected task
  | 'reward_unlocked'      // Child unlocked reward
  | 'reward_created'       // Parent created reward
  | 'task_created'         // Parent created task (recurring)

export interface CreateNotificationParams {
  userId: string
  userType: 'parent' | 'child'
  type: NotificationType
  message: string
}

export async function createNotification(params: CreateNotificationParams) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      user_type: params.userType,
      type: params.type,
      message: params.message,
      read: false,
    })
  
  if (error) {
    console.error('Failed to create notification:', error)
  }
}

// Helper functions for common notifications
export async function notifyParentTaskValidated(familyId: string, childName: string, taskName: string, points: number) {
  const supabase = getSupabase()
  const { data: parents } = await supabase
    .from('parents')
    .select('id')
    .eq('family_id', familyId)

  if (parents) {
    for (const parent of parents) {
      await createNotification({
        userId: parent.id,
        userType: 'parent',
        type: 'task_validated',
        message: `${childName} a validé "${taskName}" (${points}pts)`
      })
    }
  }
}

export async function notifyChildTaskApproved(familyId: string, childId: string, taskName: string, points: number) {
  await createNotification({
    userId: childId,
    userType: 'child',
    type: 'task_approved',
    message: `"${taskName}" approuvée ✓ +${points}pts`
  })
}

export async function notifyChildTaskRejected(familyId: string, childId: string, taskName: string) {
  await createNotification({
    userId: childId,
    userType: 'child',
    type: 'task_rejected',
    message: `"${taskName}" rejetée`
  })
}

export async function notifyParentRewardUnlocked(familyId: string, childName: string, rewardName: string) {
  const supabase = getSupabase()
  const { data: parents } = await supabase
    .from('parents')
    .select('id')
    .eq('family_id', familyId)

  if (parents) {
    for (const parent of parents) {
      await createNotification({
        userId: parent.id,
        userType: 'parent',
        type: 'reward_unlocked',
        message: `${childName} a débloqué "${rewardName}"`
      })
    }
  }
}

export async function notifyChildrenRewardCreated(familyId: string, rewardName: string) {
  const supabase = getSupabase()
  const { data: children } = await supabase
    .from('children')
    .select('id')
    .eq('family_id', familyId)

  if (children) {
    for (const child of children) {
      await createNotification({
        userId: child.id,
        userType: 'child',
        type: 'reward_created',
        message: `Nouvelle récompense disponible : "${rewardName}"`
      })
    }
  }
}

export async function notifyChildrenTaskCreated(familyId: string, taskName: string, childNames: string[]) {
  const supabase = getSupabase()
  const { data: children } = await supabase
    .from('children')
    .select('id, name')
    .eq('family_id', familyId)

  if (children) {
    for (const child of children) {
      if (childNames.includes(child.name)) {
        await createNotification({
          userId: child.id,
          userType: 'child',
          type: 'task_created',
          message: `Nouvelle tâche assignée : "${taskName}"`
        })
      }
    }
  }
}
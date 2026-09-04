import { checkAndAwardDailyBadges, checkAndAwardWeeklyBadges, checkAndAwardMonthlyBadges } from '@/lib/badges/check-badges'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const hour = now.getUTCHours()
    
    console.log(`🕐 Badge check triggered at ${now.toISOString()} (hour: ${hour})`)
    
    // Always check daily badges at 20h
    await checkAndAwardDailyBadges()
    
    // Check weekly badges on Sunday/Monday
    await checkAndAwardWeeklyBadges()
    
    // Check monthly badges (1st of month)
    await checkAndAwardMonthlyBadges()
    
    return Response.json({ success: true })
  } catch (error) {
    console.error('❌ Badge check failed:', error)
    return Response.json({ success: false, error: String(error) }, { status: 500 })
  }
}
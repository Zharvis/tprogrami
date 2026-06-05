import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyUser } from './actions'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'ADMIN') {
    redirect('/')
  }

  // 1. Fetch unverified users
  const unverifiedUsers = await prisma.user.findMany({
    where: { status: 'UNVERIFIED' },
    orderBy: { createdAt: 'desc' },
  })

  // 2. Fetch all weekly plans
  let weeklyPlans = await prisma.weeklyPlan.findMany({
    orderBy: { createdAt: 'desc' },
  })

  // 3. Ensure a plan exists and load active plan
  let activePlan = await prisma.weeklyPlan.findFirst({
    where: { isActive: true },
    include: {
      activities: {
        include: {
          activityType: true,
          teachers: true,
        }
      }
    }
  })

  if (!activePlan) {
    if (weeklyPlans.length > 0) {
      // Set the first plan as active
      activePlan = await prisma.weeklyPlan.update({
        where: { id: weeklyPlans[0].id },
        data: { isActive: true },
        include: {
          activities: {
            include: {
              activityType: true,
              teachers: true,
            }
          }
        }
      })
    } else {
      // Create a default plan
      const defaultPlan = await prisma.weeklyPlan.create({
        data: {
          name: 'Default Baseline Plan',
          isActive: true,
        },
        include: {
          activities: {
            include: {
              activityType: true,
              teachers: true,
            }
          }
        }
      })
      activePlan = defaultPlan
      weeklyPlans = [defaultPlan]
    }
  }

  // 4. Fetch activity types (seeding if empty)
  let activityTypes = await prisma.activityType.findMany()
  if (activityTypes.length === 0) {
    await prisma.activityType.createMany({
      data: [
        { name: 'Lesson', color: '#3b82f6' },
        { name: 'Workshop', color: '#10b981' },
        { name: 'Break', color: '#f59e0b' }
      ]
    })
    activityTypes = await prisma.activityType.findMany()
  }

  // 5. Fetch all verified teachers
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER', status: 'VERIFIED' },
    orderBy: { email: 'asc' },
  })

  // Server action callback helper
  async function verifyUserAction(userId: string, formData: FormData) {
    'use server'
    await verifyUser(userId, formData)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AdminDashboardClient
        unverifiedUsers={unverifiedUsers}
        weeklyPlans={weeklyPlans}
        activePlan={activePlan}
        activityTypes={activityTypes}
        teachers={teachers}
        verifyUserAction={verifyUserAction}
      />
    </div>
  )
}




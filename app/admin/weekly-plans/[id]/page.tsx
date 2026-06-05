import { getCurrentUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import WeeklyPlanEditorClient from './WeeklyPlanEditorClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WeeklyPlanEditorPage({ params }: PageProps) {
  const resolvedParams = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'ADMIN') {
    redirect('/')
  }

  const planId = resolvedParams.id

  const plan = await prisma.weeklyPlan.findUnique({
    where: { id: planId },
    include: {
      activities: {
        include: {
          activityType: true,
          teachers: true,
        },
      },
    },
  })

  if (!plan) {
    notFound()
  }

  const activityTypes = await prisma.activityType.findMany()
  const teachers = await prisma.user.findMany({
    where: { role: 'TEACHER', status: 'VERIFIED' },
    orderBy: { email: 'asc' },
  })

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <WeeklyPlanEditorClient
        plan={plan}
        activityTypes={activityTypes}
        teachers={teachers}
      />
    </div>
  )
}

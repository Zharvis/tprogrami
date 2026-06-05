'use server'

import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Role, Group } from '@/app/generated/prisma'

export async function verifyUser(userId: string, formData: FormData) {
  // 1. Authorize the user
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Extract and validate parameters
  const roleStr = formData.get('role') as string
  const groupStr = formData.get('group') as string

  if (!roleStr || !Object.values(Role).includes(roleStr as Role)) {
    throw new Error('Invalid role')
  }

  const role = roleStr as Role
  let group: Group | null = null

  if (groupStr && groupStr !== 'none') {
    if (Object.values(Group).includes(groupStr as Group)) {
      group = groupStr as Group
    } else {
      throw new Error('Invalid group')
    }
  }

  // 3. Update the database record
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'VERIFIED',
      role,
      group,
    },
  })

  // 4. Revalidate cache
  revalidatePath('/admin')
}

export async function createWeeklyPlan(formData: FormData) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const name = formData.get('name') as string
  if (!name) {
    throw new Error('Name is required')
  }

  // Deactivate other plans if this is set to active
  const newPlan = await prisma.weeklyPlan.create({
    data: {
      name,
      isActive: false, // will default to false, admin can toggle active
    }
  })

  revalidatePath('/admin')
  return newPlan.id
}

export async function setActiveWeeklyPlan(planId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.$transaction([
    prisma.weeklyPlan.updateMany({
      data: { isActive: false }
    }),
    prisma.weeklyPlan.update({
      where: { id: planId },
      data: { isActive: true }
    })
  ])

  revalidatePath('/admin')
  revalidatePath(`/admin/weekly-plans/${planId}`)
}

export async function createActivity(weeklyPlanId: string, formData: FormData) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const title = formData.get('title') as string
  const dayOfWeekStr = formData.get('dayOfWeek') as string
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string
  const activityTypeId = formData.get('activityTypeId') as string
  const groupsRaw = formData.getAll('groups') as string[]
  const teacherIds = formData.getAll('teacherIds') as string[]

  if (!title || !dayOfWeekStr || !startTime || !endTime || !activityTypeId) {
    throw new Error('All fields are required')
  }

  const dayOfWeek = parseInt(dayOfWeekStr, 10)
  const groups = groupsRaw.filter((g): g is Group => Object.values(Group).includes(g as Group))

  await prisma.activity.create({
    data: {
      title,
      dayOfWeek,
      startTime,
      endTime,
      weeklyPlanId,
      activityTypeId,
      groups,
      teachers: {
        connect: teacherIds.map((id) => ({ id })),
      },
    },
  })

  revalidatePath('/admin')
  revalidatePath(`/admin/weekly-plans/${weeklyPlanId}`)
}

export async function deleteActivity(activityId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const act = await prisma.activity.delete({
    where: { id: activityId },
  })

  revalidatePath('/admin')
  revalidatePath(`/admin/weekly-plans/${act.weeklyPlanId}`)
}

export async function duplicateWeeklyPlan(planId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const sourcePlan = await prisma.weeklyPlan.findUnique({
    where: { id: planId },
    include: {
      activities: {
        include: {
          teachers: true,
        },
      },
    },
  })

  if (!sourcePlan) {
    throw new Error('Weekly Plan not found')
  }

  const newPlan = await prisma.weeklyPlan.create({
    data: {
      name: `Copy of ${sourcePlan.name}`,
      isActive: false,
      activities: {
        create: sourcePlan.activities.map((act) => ({
          title: act.title,
          dayOfWeek: act.dayOfWeek,
          startTime: act.startTime,
          endTime: act.endTime,
          activityTypeId: act.activityTypeId,
          groups: act.groups,
          teachers: {
            connect: act.teachers.map((t) => ({ id: t.id })),
          },
        })),
      },
    },
  })

  revalidatePath('/admin')
  return newPlan.id
}

export async function deleteWeeklyPlan(planId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.weeklyPlan.delete({
    where: { id: planId },
  })

  revalidatePath('/admin')
}

export async function renameWeeklyPlan(planId: string, name: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  if (!name.trim()) {
    throw new Error('Name cannot be empty')
  }

  await prisma.weeklyPlan.update({
    where: { id: planId },
    data: { name: name.trim() },
  })

  revalidatePath('/admin')
  revalidatePath(`/admin/weekly-plans/${planId}`)
}

export async function upsertOverride(formData: FormData) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const id = formData.get('id') as string // optional
  const date = formData.get('date') as string
  const isCancelledStr = formData.get('isCancelled') as string
  const activityId = formData.get('activityId') as string || null
  
  console.log('[DEBUG upsertOverride]', { id, date, isCancelledStr, activityId })
  
  const title = formData.get('title') as string
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string
  const activityTypeId = formData.get('activityTypeId') as string
  const groupsRaw = formData.getAll('groups') as string[]
  const teacherIds = formData.getAll('teacherIds') as string[]

  if (!date) {
    throw new Error('Date is required')
  }

  const isCancelled = isCancelledStr === 'true'
  const groups = groupsRaw.filter((g): g is Group => Object.values(Group).includes(g as Group))

  const data: any = {
    date,
    isCancelled,
    activityId: activityId || null,
    title: isCancelled ? null : (title || null),
    startTime: isCancelled ? null : (startTime || null),
    endTime: isCancelled ? null : (endTime || null),
    activityTypeId: isCancelled ? null : (activityTypeId || null),
    groups: isCancelled ? [] : groups,
  }

  if (id) {
    await prisma.override.update({
      where: { id },
      data: {
        ...data,
        teachers: {
          set: isCancelled ? [] : teacherIds.map((id) => ({ id })),
        },
      },
    })
  } else {
    await prisma.override.create({
      data: {
        ...data,
        teachers: {
          connect: isCancelled ? [] : teacherIds.map((id) => ({ id })),
        },
      },
    })
  }

  revalidatePath('/schedule')
}

export async function deleteOverride(overrideId: string) {
  const currentUser = await getCurrentUser()
  if (!currentUser || currentUser.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.override.delete({
    where: { id: overrideId },
  })

  revalidatePath('/schedule')
}



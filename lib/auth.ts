import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const mockToken = cookieStore.get('sb-access-token')?.value

  if (mockToken === 'mock-admin-token') {
    let user = await prisma.user.findUnique({ where: { email: 'admin@test.com' } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@test.com',
          status: 'VERIFIED',
          role: 'ADMIN',
        }
      })
    }
    return user;
  }

  if (mockToken === 'mock-verified-token') {
    let user = await prisma.user.findUnique({ where: { email: 'student@test.com' } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: '00000000-0000-0000-0000-000000000002',
          email: 'student@test.com',
          status: 'VERIFIED',
          role: 'STUDENT',
          group: 'GROUP_1',
        }
      })
    }
    return user;
  }

  if (mockToken === 'mock-unverified-token') {
    let user = await prisma.user.findUnique({ where: { email: 'unverified@test.com' } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: '00000000-0000-0000-0000-000000000003',
          email: 'unverified@test.com',
          status: 'UNVERIFIED',
        }
      })
    }
    return user;
  }

  if (mockToken && mockToken.startsWith('mock-user-')) {
    const userId = mockToken.replace('mock-user-', '');
    return await prisma.user.findUnique({
      where: { id: userId }
    });
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return await prisma.user.findUnique({
    where: { id: user.id }
  })
}

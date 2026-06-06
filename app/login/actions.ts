'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'

export async function loginWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (data.url) {
    redirect(data.url)
  }
}

export async function logout() {
  const supabase = await createClient()
  
  // Sign out from Supabase
  await supabase.auth.signOut()

  // Clear mock cookies if they exist
  const cookieStore = await cookies()
  cookieStore.delete('sb-access-token')

  redirect('/login')
}

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error logging out:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

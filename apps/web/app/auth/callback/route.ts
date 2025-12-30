import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
      const { origin } = new URL(request.url)
  
  // Supabase has already handled the OAuth exchange
  // Just verify we have a session and redirect
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Could not authenticate user`)
}

// Supabase Edge Function: admin-delete-user
// Deploy with: supabase functions deploy admin-delete-user
// No extra secrets needed — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are provided automatically inside every Edge Function.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Body = {
  user_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Tiada token pengesahan' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Scoped to the caller's own JWT — used only to find out who's calling.
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !callerData.user) {
      return new Response(JSON.stringify({ error: 'Token tidak sah' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Full service-role access, bypasses RLS.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callerData.user.id)
      .single()

    if (callerProfile?.role !== 'pkop') {
      return new Response(JSON.stringify({ error: 'Hanya Super Admin boleh padam pengguna' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user_id }: Body = await req.json()
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id diperlukan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // A Super Admin can't delete themselves — enforced here too, not just
    // hidden in the UI, in case the endpoint is ever called directly.
    if (user_id === callerData.user.id) {
      return new Response(JSON.stringify({ error: 'Anda tidak boleh memadam akaun anda sendiri' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Deletes the auth.users row; profiles.id references auth.users(id)
    // on delete cascade, so the profile row goes with it automatically.
    const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (deleteErr) throw deleteErr

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
// Supabase Edge Function: admin-create-user
// Deploy with: supabase functions deploy admin-create-user
// No extra secrets needed — SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// are provided automatically inside every Edge Function.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

type Body = {
  email: string
  full_name: string
  role: 'pkop' | 'pkon'
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
      return new Response(JSON.stringify({ error: 'Hanya Super Admin boleh cipta pengguna' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, full_name, role }: Body = await req.json()
    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email dan peranan diperlukan' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'

    const { data: invited, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { data: { full_name }, redirectTo: `${siteUrl}/set-password` },
    )
    if (inviteErr || !invited.user) {
      throw inviteErr ?? new Error('Gagal jemput pengguna')
    }

    // handle_new_user() already inserted a default 'pkon' profile row —
    // update it with the actual name/role chosen in the form.
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, role })
      .eq('id', invited.user.id)
    if (updateErr) throw updateErr

    return new Response(JSON.stringify({ id: invited.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
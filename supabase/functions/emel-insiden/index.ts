// Supabase Edge Function: emel-insiden
// Sends a Laporan Insiden ("Makluman Awal Insiden" PDF attached) to every active
// PKON account of the incident's state. PKOP only.
//
// Deploy:  supabase functions deploy emel-insiden
// Secrets: supabase secrets set GMAIL_USER=apmlabuan@civildefence.gov.my GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
// (Gmail on port 465: Supabase blocks outgoing ports 25 and 587.)

import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'
import { corsHeaders } from '../_shared/cors.ts'

type Body = {
  insiden_id: string
  pdf_base64: string
  nama_fail: string
}

// Kuala Lumpur, Putrajaya and Labuan: one PKON group "Wilayah Persekutuan" (same rule as kumpulan_negeri())
const ANGGOTA_WP = ['Kuala Lumpur', 'Putrajaya', 'Labuan']
const SAIZ_PDF_MAKS = 7_000_000 // base64 characters ≈ 5 MB

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Tiada token pengesahan' }, 401)

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Caller: an active PKOP
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token)
    if (callerErr || !callerData.user) {
      return json({ error: `Token tidak sah${callerErr ? `: ${callerErr.message}` : ''}` }, 401)
    }
    const { data: caller } = await supabaseAdmin
      .from('profiles')
      .select('role, status')
      .eq('id', callerData.user.id)
      .single()
    if (caller?.role !== 'pkop' || caller.status !== 'aktif') {
      return json({ error: 'Hanya PKOP boleh menghantar emel insiden' }, 403)
    }

    const { insiden_id, pdf_base64, nama_fail }: Body = await req.json()
    if (!insiden_id || !pdf_base64) return json({ error: 'insiden_id dan pdf_base64 diperlukan' }, 400)
    if (pdf_base64.length > SAIZ_PDF_MAKS) return json({ error: 'Fail PDF terlalu besar' }, 400)

    const { data: insiden, error: insidenErr } = await supabaseAdmin
      .from('laporan_insiden')
      .select('id, tarikh_masa, ringkasan, tempat, daerah, negeri')
      .eq('id', insiden_id)
      .single()
    if (insidenErr || !insiden) return json({ error: 'Laporan insiden tidak dijumpai' }, 404)

    // Recipients: active PKON of that state (or of Wilayah Persekutuan for KL / Putrajaya / Labuan)
    const kumpulan = ANGGOTA_WP.includes(insiden.negeri) ? 'Wilayah Persekutuan' : insiden.negeri
    const { data: pkon, error: pkonErr } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('role', 'pkon')
      .eq('status', 'aktif')
      .in('negeri', [...new Set([insiden.negeri, kumpulan])])
      .not('email', 'is', null)
    if (pkonErr) throw pkonErr

    const penerima = [...new Set((pkon ?? []).map((p) => p.email as string).filter(Boolean))]
    if (penerima.length === 0) {
      return json({ error: `Tiada akaun PKON aktif bagi ${kumpulan}.` }, 400)
    }

    const user = Deno.env.get('GMAIL_USER')
    const pass = Deno.env.get('GMAIL_APP_PASSWORD')
    if (!user || !pass) return json({ error: 'Tetapan emel (GMAIL_USER / GMAIL_APP_PASSWORD) belum lengkap' }, 500)

    // Malaysian time, whatever the server's time zone
    const masa = new Date(insiden.tarikh_masa).toLocaleString('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const baris = [
      ['Tarikh / Masa', masa],
      ['Insiden', insiden.ringkasan],
      ['Lokasi', insiden.tempat],
      ['Daerah / Negeri', `${insiden.daerah} / ${insiden.negeri}`],
    ]

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f1b33;max-width:600px">
        <h2 style="margin:0 0 4px;color:#d7262e">Makluman Awal Insiden</h2>
        <p style="margin:0 0 16px;color:#555">Angkatan Pertahanan Awam Malaysia</p>
        <table style="border-collapse:collapse;width:100%">
          ${baris
            .map(
              ([k, v]) =>
                `<tr><td style="padding:8px;border:1px solid #dde3ee;background:#f4f7fc;width:35%"><b>${esc(k)}</b></td>` +
                `<td style="padding:8px;border:1px solid #dde3ee">${esc(v)}</td></tr>`,
            )
            .join('')}
        </table>
        <p style="margin:16px 0 0">Poster makluman dilampirkan (PDF).</p>
        <p style="margin:24px 0 0;font-size:12px;color:#888">
          Dikeluarkan oleh Pusat Kawalan Operasi Pusat, Bahagian Pengurusan Bencana dan Operasi,
          Ibu Pejabat Pertahanan Awam. Emel ini dijana secara automatik.
        </p>
      </div>`

    const text = [
      'MAKLUMAN AWAL INSIDEN',
      'Angkatan Pertahanan Awam Malaysia',
      '',
      ...baris.map(([k, v]) => `${k}: ${v}`),
      '',
      'Poster makluman dilampirkan (PDF).',
    ].join('\n')

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: `"Makluman Insiden APM" <${user}>`,
      to: penerima,
      subject: `Makluman Awal Insiden: ${insiden.ringkasan} — ${insiden.daerah}, ${insiden.negeri}`,
      text,
      html,
      attachments: [
        {
          filename: (nama_fail || 'Makluman_Awal_Insiden.pdf').replace(/[^\w.-]/g, '_'),
          content: pdf_base64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    })

    await supabaseAdmin
      .from('laporan_insiden')
      .update({ emel_dihantar_pada: new Date().toISOString(), emel_bil_penerima: penerima.length })
      .eq('id', insiden.id)

    return json({ bil: penerima.length })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

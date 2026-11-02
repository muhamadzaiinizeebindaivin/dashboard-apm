// Supabase Edge Function: emel-insiden
// Sends an incident poster (PDF attached) to every active PKON account of the state. PKOP only.
//   jenis 'awal'   (default): Laporan Insiden  → "Makluman Awal Insiden"   (body: insiden_id)
//   jenis 'semasa'          : Laporan Semasa   → "Maklumat Semasa Insiden" (body: laporan_id + maklumat,
//                             the poster values as checked in the app; the state is read from the report)
//
// Deploy:  supabase functions deploy emel-insiden
// Secrets: supabase secrets set GMAIL_USER=apmlabuan@civildefence.gov.my GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
// (Gmail on port 465: Supabase blocks outgoing ports 25 and 587.)

import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'
import { corsHeaders } from '../_shared/cors.ts'

type Maklumat = {
  tarikh_masa: string
  ringkasan: string
  tempat: string
  daerah: string
}

type Body = {
  jenis?: 'awal' | 'semasa'
  insiden_id?: string
  laporan_id?: string
  maklumat?: Maklumat
  pdf_base64: string
  nama_fail: string
}

// Kuala Lumpur, Putrajaya and Labuan: one PKON group "Wilayah Persekutuan" (same rule as kumpulan_negeri())
const ANGGOTA_WP = ['Kuala Lumpur', 'Putrajaya', 'Labuan']
const SAIZ_PDF_MAKS = 7_000_000 // base64 characters ≈ 5 MB

const TAJUK = {
  awal: { tajuk: 'Makluman Awal Insiden', warna: '#d7262e', fail: 'Makluman_Awal_Insiden.pdf' },
  semasa: { tajuk: 'Maklumat Semasa Insiden', warna: '#d7262e', fail: 'Maklumat_Semasa_Insiden.pdf' },
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

// Text sent by the app: string, trimmed, length-capped
const teks = (v: unknown, maks = 2000) => (typeof v === 'string' ? v.trim().slice(0, maks) : '')

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

    const body: Body = await req.json()
    const jenis = body.jenis === 'semasa' ? 'semasa' : 'awal'
    const { pdf_base64, nama_fail } = body
    if (!pdf_base64) return json({ error: 'pdf_base64 diperlukan' }, 400)
    if (pdf_base64.length > SAIZ_PDF_MAKS) return json({ error: 'Fail PDF terlalu besar' }, 400)

    // What goes in the e-mail + the row to stamp afterwards
    let negeri: string
    let isi: Maklumat
    let jadual: 'laporan_insiden' | 'laporan_bencana'
    let id: string

    if (jenis === 'awal') {
      if (!body.insiden_id) return json({ error: 'insiden_id diperlukan' }, 400)
      const { data: insiden, error: insidenErr } = await supabaseAdmin
        .from('laporan_insiden')
        .select('id, tarikh_masa, ringkasan, tempat, daerah, negeri')
        .eq('id', body.insiden_id)
        .single()
      if (insidenErr || !insiden) return json({ error: 'Laporan insiden tidak dijumpai' }, 404)
      negeri = insiden.negeri
      isi = insiden
      jadual = 'laporan_insiden'
      id = insiden.id
    } else {
      if (!body.laporan_id) return json({ error: 'laporan_id diperlukan' }, 400)
      const { data: laporan, error: laporanErr } = await supabaseAdmin
        .from('laporan_bencana')
        .select('id, negeri, jenis_laporan')
        .eq('id', body.laporan_id)
        .single()
      if (laporanErr || !laporan || laporan.jenis_laporan !== 'semasa') {
        return json({ error: 'Laporan Semasa tidak dijumpai' }, 404)
      }
      if (!laporan.negeri) return json({ error: 'Laporan ini tiada negeri' }, 400)
      const m = body.maklumat
      isi = {
        tarikh_masa: teks(m?.tarikh_masa, 40),
        ringkasan: teks(m?.ringkasan),
        tempat: teks(m?.tempat, 300),
        daerah: teks(m?.daerah, 200),
      }
      if (!isi.ringkasan || !isi.tempat || !isi.daerah || Number.isNaN(new Date(isi.tarikh_masa).getTime())) {
        return json({ error: 'Maklumat poster tidak lengkap' }, 400)
      }
      negeri = laporan.negeri
      jadual = 'laporan_bencana'
      id = laporan.id
    }

    // Recipients: active PKON of that state (or of Wilayah Persekutuan for KL / Putrajaya / Labuan)
    const kumpulan = ANGGOTA_WP.includes(negeri) ? 'Wilayah Persekutuan' : negeri
    const { data: pkon, error: pkonErr } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('role', 'pkon')
      .eq('status', 'aktif')
      .in('negeri', [...new Set([negeri, kumpulan])])
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
    const masa = new Date(isi.tarikh_masa).toLocaleString('ms-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const t = TAJUK[jenis]
    const baris = [
      ['Tarikh / Masa', masa],
      ['Insiden', isi.ringkasan],
      ['Lokasi', isi.tempat],
      ['Daerah / Negeri', `${isi.daerah} / ${negeri}`],
    ]

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#0f1b33;max-width:600px">
        <h2 style="margin:0 0 4px;color:${t.warna}">${t.tajuk}</h2>
        <p style="margin:0 0 16px;color:#555">Angkatan Pertahanan Awam Malaysia</p>
        <table style="border-collapse:collapse;width:100%">
          ${baris
            .map(
              ([k, v]) =>
                `<tr><td style="padding:8px;border:1px solid #dde3ee;background:#f4f7fc;width:35%"><b>${esc(k)}</b></td>` +
                `<td style="padding:8px;border:1px solid #dde3ee;white-space:pre-wrap">${esc(v)}</td></tr>`,
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
      t.tajuk.toUpperCase(),
      'Angkatan Pertahanan Awam Malaysia',
      '',
      ...baris.map(([k, v]) => `${k}: ${v}`),
      '',
      'Poster makluman dilampirkan (PDF).',
    ].join('\n')

    // Subject on one line, kept short
    const ringkasSubjek = isi.ringkasan.replace(/\s+/g, ' ').slice(0, 120)

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    })

    await transporter.sendMail({
      from: `"Makluman Insiden APM" <${user}>`,
      to: penerima,
      subject: `${t.tajuk}: ${ringkasSubjek} — ${isi.daerah}, ${negeri}`,
      text,
      html,
      attachments: [
        {
          filename: (nama_fail || t.fail).replace(/[^\w.-]/g, '_'),
          content: pdf_base64,
          encoding: 'base64',
          contentType: 'application/pdf',
        },
      ],
    })

    await supabaseAdmin
      .from(jadual)
      .update({ emel_dihantar_pada: new Date().toISOString(), emel_bil_penerima: penerima.length })
      .eq('id', id)

    return json({ bil: penerima.length })
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})

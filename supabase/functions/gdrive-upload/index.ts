// Supabase Edge Function: gdrive-upload
// Deploy with: supabase functions deploy gdrive-upload
// Requires secrets: GOOGLE_SERVICE_ACCOUNT_KEY (the full JSON key, as one string)
//                   GOOGLE_DRIVE_FOLDER_ID (the folder ID from step 3)

import { corsHeaders } from '../_shared/cors.ts'

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const raw = atob(b64)
  const buffer = new ArrayBuffer(raw.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i)
  return buffer
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function getAccessToken(): Promise<string> {
  const keyJson = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')!)
  const now = Math.floor(Date.now() / 1000)

  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: keyJson.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(keyJson.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  )

  const jwt = `${unsigned}.${base64url(signature)}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenRes.ok) throw new Error('Gagal dapatkan token Google: ' + JSON.stringify(tokenData))
  return tokenData.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return new Response(JSON.stringify({ error: 'Tiada fail dihantar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getAccessToken()
    const folderId = Deno.env.get('GOOGLE_DRIVE_FOLDER_ID')!

    const metadata = { name: file.name, parents: [folderId] }
    const fileBuffer = await file.arrayBuffer()

    const boundary = 'apmupload' + crypto.randomUUID()
    const encoder = new TextEncoder()

    const bodyParts: Uint8Array[] = [
      encoder.encode(
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      ),
      encoder.encode(
        `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
      ),
      new Uint8Array(fileBuffer),
      encoder.encode(`\r\n--${boundary}--`),
    ]
    const bodyLength = bodyParts.reduce((sum, part) => sum + part.length, 0)
    const body = new Uint8Array(bodyLength)
    let offset = 0
    for (const part of bodyParts) {
      body.set(part, offset)
      offset += part.length
    }

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    )

    const uploaded = await uploadRes.json()
    if (!uploadRes.ok) {
      throw new Error('Gagal muat naik ke Drive: ' + JSON.stringify(uploaded))
    }

    // Make the file viewable by anyone with the link, so staff can open
    // it directly without needing individual Google Drive access.
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploaded.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    })

    return new Response(
      JSON.stringify({ id: uploaded.id, link: uploaded.webViewLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

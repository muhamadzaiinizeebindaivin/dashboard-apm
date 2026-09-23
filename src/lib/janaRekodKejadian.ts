import { supabase } from './supabase'
import apmLogo from '../assets/apm-logo.png'
import type { LaporanBencanaRow } from './laporanBencana'

async function muatGambar(src: string): Promise<string | null> {
  try {
    const res = await fetch(src)
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

type PpsRingkas = { negeri: string | null; daerah: string | null; pps: string; mangsa: number; keluarga: number }

export async function janaRekodKejadian(
  rows: LaporanBencanaRow[],
  jenis: 'awal' | 'semasa',
  label: string,
  tapisNegeri: string,
) {
  const { default: JsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const logo = await muatGambar(apmLogo)

  // For Semasa reports, pull each report's own PPS entries (not carried
  // forward from earlier reports) — this is a log of what each submission
  // itself contained, not a "current status" view.
  const ppsMap: Record<string, PpsRingkas> = {}
  if (jenis === 'semasa' && rows.length > 0) {
    const { data } = await supabase
      .from('laporan_pps')
      .select('laporan_id, negeri, daerah, pps, jumlah_mangsa, jumlah_keluarga')
      .in(
        'laporan_id',
        rows.map((r) => r.id),
      )
    for (const p of data ?? []) {
      const sedia = ppsMap[p.laporan_id] ?? { negeri: p.negeri, daerah: p.daerah, pps: '', mangsa: 0, keluarga: 0 }
      sedia.pps = [sedia.pps, p.pps].filter(Boolean).join('\n')
      sedia.mangsa += p.jumlah_mangsa ?? 0
      sedia.keluarga += p.jumlah_keluarga ?? 0
      ppsMap[p.laporan_id] = sedia
    }
  }

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const lebar = doc.internal.pageSize.getWidth()
  const margin = 14
  const sekarang = new Date()
  const tarikh = sekarang.toLocaleDateString('ms-MY', { day: '2-digit', month: 'long', year: 'numeric' })
  const masa = sekarang.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })

  if (logo) doc.addImage(logo, 'PNG', lebar / 2 - 10, 10, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(`REKOD KEJADIAN - ${label.toUpperCase()}`, lebar / 2, 37, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Angkatan Pertahanan Awam Malaysia', lebar / 2, 43, { align: 'center' })
  doc.text(`Dijana pada: ${tarikh}, ${masa}`, lebar / 2, 48, { align: 'center' })
  if (tapisNegeri) {
    doc.text(`Negeri: ${tapisNegeri}`, lebar / 2, 53, { align: 'center' })
  }

  const badan = rows.map((r, i) => {
    const p = ppsMap[r.id]
    const kawasan =
      jenis === 'awal' ? r.alamat || '—' : [r.negeri, p?.daerah].filter(Boolean).join(', ') || '—'
    const disahkan = !!r.perhatian_nama
    return [
      String(i + 1),
      new Date(r.created_at).toLocaleDateString('ms-MY'),
      r.jenis_bencana || '—',
      kawasan,
      p ? String(p.keluarga) : '—',
      p ? String(p.mangsa) : '—',
      p?.pps || '—',
      disahkan ? 'Disahkan' : 'Belum Disahkan',
      disahkan && r.perhatian_masa ? new Date(r.perhatian_masa).toLocaleDateString('ms-MY') : '—',
    ]
  })

  autoTable(doc, {
    startY: tapisNegeri ? 60 : 56,
    head: [['#', 'Tarikh', 'Jenis Bencana', 'Kawasan Terjejas', 'Jumlah Keluarga', 'Jumlah Mangsa', 'PPS', 'Status', 'Tarikh Pengesahan']],
    body: badan,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: '#0b2a5c', textColor: '#ffffff' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  })

  const stamp = `${sekarang.getFullYear()}-${pad(sekarang.getMonth() + 1)}-${pad(sekarang.getDate())}-${pad(sekarang.getHours())}${pad(sekarang.getMinutes())}`
  doc.save(`rekod-kejadian-${jenis}-${stamp}.pdf`)
}

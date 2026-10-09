import apmLogo from '../assets/apm-logo.png'
import { formatTarikh } from './titikBencana'
import type { KategoriBencana, TitikBencana } from './titikBencana'

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

export async function janaRingkasanBencana(
  rows: TitikBencana[],
  kategori: Record<string, KategoriBencana>,
  ringkasanTapisan: string,
) {
  const { default: JsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const logo = await muatGambar(apmLogo)

  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const lebar = doc.internal.pageSize.getWidth()
  const tinggi = doc.internal.pageSize.getHeight()
  const margin = 14
  const sekarang = new Date()

  if (logo) doc.addImage(logo, 'PNG', lebar / 2 - 10, 10, 20, 20)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('RINGKASAN BENCANA', lebar / 2, 37, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Bahagian Pengurusan Bencana Operasi — Angkatan Pertahanan Awam Malaysia', lebar / 2, 43, { align: 'center' })
  doc.text(`Dijana pada: ${formatTarikh(sekarang.toISOString())}  ·  ${rows.length} kejadian`, lebar / 2, 48, {
    align: 'center',
  })
  if (ringkasanTapisan) doc.text(ringkasanTapisan, lebar / 2, 53, { align: 'center' })

  const jumlah = (f: (r: TitikBencana) => number | null) => rows.reduce((n, r) => n + (f(r) ?? 0), 0)

  autoTable(doc, {
    startY: ringkasanTapisan ? 59 : 55,
    head: [['#', 'Kategori', 'Negeri', 'Daerah', 'Kawasan Terjejas', 'Tarikh Mula', 'Tarikh Tamat', 'KIR', 'Mangsa', 'Rumah', 'PPS']],
    body: rows.map((r, i) => [
      String(i + 1),
      kategori[r.kategori]?.label ?? r.kategori,
      r.negeri,
      r.daerah ?? '—',
      r.lokasi ?? '—',
      formatTarikh(r.tarikh_mula),
      formatTarikh(r.tarikh_selesai),
      r.jumlah_kir ?? '—',
      r.jumlah_mangsa ?? '—',
      r.jumlah_rumah_terjejas ?? '—',
      r.pps ?? '—',
    ]),
    foot: [
      [
        '',
        'JUMLAH',
        '',
        '',
        '',
        '',
        '',
        String(jumlah((r) => r.jumlah_kir)),
        String(jumlah((r) => r.jumlah_mangsa)),
        String(jumlah((r) => r.jumlah_rumah_terjejas)),
        '',
      ],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, valign: 'middle' },
    headStyles: { fillColor: '#0b2a5c', textColor: '#ffffff' },
    footStyles: { fillColor: '#111827', textColor: '#ffffff', fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      7: { halign: 'center' },
      8: { halign: 'center' },
      9: { halign: 'center' },
    },
    margin: { left: margin, right: margin },
  })

  const jumlahHalaman = doc.getNumberOfPages()
  for (let p = 1; p <= jumlahHalaman; p++) {
    doc.setPage(p)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Halaman ${p} / ${jumlahHalaman}`, lebar / 2, tinggi - 6, { align: 'center' })
  }

  const stamp = `${sekarang.getFullYear()}-${pad(sekarang.getMonth() + 1)}-${pad(sekarang.getDate())}-${pad(sekarang.getHours())}${pad(sekarang.getMinutes())}`
  doc.save(`ringkasan-bencana-${stamp}.pdf`)
}
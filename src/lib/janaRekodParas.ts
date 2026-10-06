import apmLogo from '../assets/apm-logo.png'
import {
  formatMasa,
  formatTempoh,
  statusRekod,
  STATUS_REKOD_LABEL,
  teksLog,
  teksTamat,
} from './rekodParas'
import type { LogKeadaan, RekodParas, TapisRekodParas } from './rekodParas'

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

function ringkasanTapisan(t: TapisRekodParas) {
  const bahagian: string[] = []
  if (t.carian) bahagian.push(`Carian: "${t.carian}"`)
  if (t.negeri) bahagian.push(`Negeri: ${t.negeri}`)
  if (t.status) bahagian.push(`Status: ${t.status === 'aktif' ? 'Aktif' : 'Tamat'}`)
  if (t.keadaan) bahagian.push(`Pernah ${t.keadaan === 'kecemasan' ? 'Kecemasan' : 'Rehat'}`)
  if (t.dari || t.hingga) bahagian.push(`Tarikh: ${t.dari || '…'} hingga ${t.hingga || '…'}`)
  return bahagian.join('  ·  ')
}

export async function janaRekodParas(
  rows: RekodParas[],
  log: Record<string, LogKeadaan[]>,
  tapis: TapisRekodParas,
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
  doc.text('REKOD PARAS', lebar / 2, 37, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Pasukan Respon Sokongan Bencana — Angkatan Pertahanan Awam Malaysia', lebar / 2, 43, { align: 'center' })
  doc.text(`Dijana pada: ${formatMasa(sekarang.toISOString())}  ·  ${rows.length} rekod`, lebar / 2, 48, {
    align: 'center',
  })

  const tapisan = ringkasanTapisan(tapis)
  if (tapisan) doc.text(tapisan, lebar / 2, 53, { align: 'center' })

  autoTable(doc, {
    startY: tapisan ? 59 : 55,
    head: [['#', 'Nama', 'Pangkat', 'No. Tel', 'Negeri', 'Mula', 'Tamat', 'Tempoh', 'Status', 'Sejarah Keadaan']],
    body: rows.map((r, i) => [
      String(i + 1),
      r.nama || '—',
      r.pangkat || '—',
      r.no_tel || '—',
      r.negeri,
      formatMasa(r.mula_masa),
      teksTamat(r),
      formatTempoh(r),
      STATUS_REKOD_LABEL[statusRekod(r)].label,
      teksLog(log[r.id]),
    ]),
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, valign: 'middle' },
    headStyles: { fillColor: '#0b2a5c', textColor: '#ffffff' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      7: { halign: 'center' },
      8: { halign: 'center' },
    },
    // Highlight the history cell of any session that had an emergency
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 9 && String(data.cell.raw).includes('Kecemasan')) {
        data.cell.styles.textColor = [220, 38, 38]
        data.cell.styles.fontStyle = 'bold'
      }
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
  doc.save(`rekod-paras-${stamp}.pdf`)
}
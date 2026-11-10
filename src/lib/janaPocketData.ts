import type { jsPDF } from 'jspdf'
import apmLogo from '../assets/apm-logo.png'
import { SENARAI_POKET, labelSkop, notaSkop, peratus } from './pocketData'
import type { DataPoket, Kiraan, PoketBantuan, PoketBencana, PoketId, PoketLogistik } from './pocketData'

// Pocket Data PDF (A4 portrait): page 1 = summary of the chosen pockets,
// then one section per pocket (tables continue on new pages with the same header).

type RGB = [number, number, number]
const NAVY: RGB = [11, 42, 92]
const OREN: RGB = [249, 115, 22]
const HIJAU: RGB = [22, 163, 74]
const KUNING: RGB = [217, 119, 6]
const MERAH: RGB = [220, 38, 38]
const UNGU: RGB = [124, 58, 237]
const BIRU: RGB = [2, 132, 199]
const KELABU: RGB = [100, 116, 139]
const GARIS: RGB = [226, 232, 240]
const TEKS: RGB = [30, 41, 59]
const LATAR: RGB = [248, 250, 252]
const LATAR_KAKI: RGB = [241, 245, 249]
const PUTIH: RGB = [255, 255, 255]

const WARNA_POKET: Record<PoketId, RGB> = { bencana: OREN, personel: UNGU, logistik: HIJAU, bantuan: BIRU }

const W = 210
const H = 297
const M = 12
const ATAS = 46 // content starts below the header
const BAWAH = 280 // content ends above the footer

type AutoTable = typeof import('jspdf-autotable').default
type Konteks = { doc: jsPDF; autoTable: AutoTable; logo: string | null; skop: string; setakat: string; tajuk: string; y: number }
type Sel = string | number

const pad = (n: number) => String(n).padStart(2, '0')
const nombor = (n: number) => n.toLocaleString('ms-MY')
const denganPeratus = (n: number, jumlah: number) => `${nombor(n)} (${peratus(n, jumlah)}%)`

function tarikhMasa(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

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

// --- Page frame ---

function lukisHeader(k: Konteks) {
  const { doc } = k
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 36, 'F')
  doc.setFillColor(...OREN)
  doc.rect(0, 36, W, 2, 'F')

  let xTeks = M
  if (k.logo) {
    const p = doc.getImageProperties(k.logo)
    const tinggi = 26
    const lebar = (p.width / p.height) * tinggi
    doc.addImage(k.logo, 'PNG', M, 5, lebar, tinggi)
    xTeks = M + lebar + 5
  }

  doc.setTextColor(...PUTIH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('ANGKATAN PERTAHANAN AWAM MALAYSIA', xTeks, 12)
  doc.setFontSize(18)
  doc.text('POCKET DATA', xTeks, 21)
  doc.setFontSize(10)
  doc.setTextColor(...OREN)
  doc.text(k.tajuk, xTeks, 28)

  doc.setTextColor(...PUTIH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  const baris = doc.splitTextToSize(k.skop, 72) as string[]
  doc.text(baris, W - M, 13, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Setakat ${k.setakat}`, W - M, 13 + baris.length * 4.2 + 1, { align: 'right' })
}

function lukisFooter(doc: jsPDF, oleh: string, setakat: string) {
  const n = doc.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFillColor(...NAVY)
    doc.rect(0, H - 11, W, 11, 'F')
    doc.setFillColor(...OREN)
    doc.rect(0, H - 11, W, 0.8, 'F')
    doc.setTextColor(...PUTIH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('SENTIASA SIAP · PANTAS · BERINTEGRITI', M, H - 4)
    doc.setFont('helvetica', 'normal')
    doc.text(`Dijana oleh ${oleh} · ${setakat}`, W / 2, H - 4, { align: 'center' })
    doc.text(`${i} / ${n}`, W - M, H - 4, { align: 'right' })
  }
}

function halamanBaru(k: Konteks, tajuk: string) {
  k.doc.addPage()
  k.tajuk = tajuk
  lukisHeader(k)
  k.y = ATAS
}

function pastikanRuang(k: Konteks, perlu: number) {
  if (k.y + perlu <= BAWAH) return
  k.doc.addPage()
  lukisHeader(k)
  k.y = ATAS
}

// --- Building blocks ---

function tajukSeksyen(k: Konteks, teks: string) {
  pastikanRuang(k, 24)
  const { doc } = k
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(teks.toUpperCase(), M, k.y + 4)
  doc.setDrawColor(...OREN)
  doc.setLineWidth(0.7)
  doc.line(M, k.y + 6.2, M + 20, k.y + 6.2)
  k.y += 11
}

function teksKosong(k: Konteks, teks: string) {
  pastikanRuang(k, 10)
  const { doc } = k
  doc.setTextColor(...KELABU)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(9)
  const baris = doc.splitTextToSize(teks, W - 2 * M) as string[]
  doc.text(baris, M, k.y + 3)
  k.y += baris.length * 4.5 + 5
}

function kad(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, nilai: string, warna: RGB, sub?: string) {
  doc.setFillColor(...PUTIH)
  doc.setDrawColor(...GARIS)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD')
  doc.setFillColor(...warna)
  doc.roundedRect(x, y, 2.2, h, 1, 1, 'F')

  doc.setTextColor(...KELABU)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text(label.toUpperCase(), x + 5.5, y + 6)
  doc.setTextColor(...warna)
  doc.setFontSize(16)
  doc.text(nilai, x + 5.5, y + 15)
  if (sub) {
    doc.setTextColor(...KELABU)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(sub, x + 5.5, y + h - 3.5)
  }
}

function barisKad(k: Konteks, senarai: [string, string, RGB, string?][], h = 24) {
  pastikanRuang(k, h)
  const gap = 4
  const w = (W - 2 * M - gap * (senarai.length - 1)) / senarai.length
  senarai.forEach(([label, nilai, warna, sub], i) => kad(k.doc, M + i * (w + gap), k.y, w, h, label, nilai, warna, sub))
  k.y += h + 6
}

// Stacked bar Baik / Selenggara / Rosak
function barKeadaan(doc: jsPDF, x: number, y: number, w: number, h: number, c: Kiraan) {
  if (!c.jumlah) {
    doc.setFillColor(...GARIS)
    doc.rect(x, y, w, h, 'F')
    return
  }
  const bahagian: [number, RGB][] = [
    [c.baik, HIJAU],
    [c.selenggara, KUNING],
    [c.rosak, MERAH],
  ]
  let cx = x
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  for (const [n, warna] of bahagian) {
    if (!n) continue
    const bw = (w * n) / c.jumlah
    doc.setFillColor(...warna)
    doc.rect(cx, y, bw, h, 'F')
    const label = `${n} (${Math.round((n / c.jumlah) * 100)}%)`
    if (doc.getTextWidth(label) + 2 < bw) {
      doc.setTextColor(...PUTIH)
      doc.text(label, cx + bw / 2, y + h / 2 + 1.2, { align: 'center' })
    }
    cx += bw
  }
}

function legenda(k: Konteks) {
  const { doc } = k
  let x = M
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  for (const [label, warna] of [
    ['Baik', HIJAU],
    ['Selenggara', KUNING],
    ['Rosak', MERAH],
  ] as [string, RGB][]) {
    doc.setFillColor(...warna)
    doc.rect(x, k.y, 3, 3, 'F')
    doc.setTextColor(...TEKS)
    doc.text(label, x + 4.5, k.y + 2.6)
    x += doc.getTextWidth(label) + 12
  }
  k.y += 7
}

function jadual(
  k: Konteks,
  head: string[],
  body: Sel[][],
  opsyen: { foot?: Sel[]; kanan?: number[]; warnaSel?: (baris: number, kolum: number) => RGB | undefined } = {},
) {
  const kolum: Record<number, { halign: 'right' }> = {}
  for (const i of opsyen.kanan ?? []) kolum[i] = { halign: 'right' }

  k.autoTable(k.doc, {
    startY: k.y,
    head: [head],
    body: body.map((r) => r.map(String)),
    foot: opsyen.foot ? [opsyen.foot.map(String)] : undefined,
    showFoot: 'lastPage',
    theme: 'grid',
    margin: { left: M, right: M, top: ATAS, bottom: H - BAWAH },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.8, lineColor: GARIS, lineWidth: 0.2, textColor: TEKS },
    headStyles: { fillColor: NAVY, textColor: PUTIH, fontStyle: 'bold' },
    footStyles: { fillColor: LATAR_KAKI, textColor: NAVY, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LATAR },
    columnStyles: kolum,
    didParseCell: (c) => {
      if (c.section !== 'body' || !opsyen.warnaSel) return
      const warna = opsyen.warnaSel(c.row.index, c.column.index)
      if (warna) {
        c.cell.styles.textColor = warna
        c.cell.styles.fontStyle = 'bold'
      }
    },
    didDrawPage: () => lukisHeader(k),
  })
  k.y = (k.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
}

// --- Page 1: summary ---

function isiPanel(id: PoketId, d: DataPoket): { baris: [string, string][] | string; kiraan?: Kiraan } {
  switch (id) {
    case 'bencana': {
      const b = d.bencana!
      return {
        baris: [
          ['Bencana aktif', nombor(b.bencanaAktif)],
          ['PPS dibuka', nombor(b.pps)],
          ['Mangsa', nombor(b.mangsa)],
          ['Keluarga', nombor(b.keluarga)],
          ['Daerah terjejas', nombor(b.daerahTerjejas)],
        ],
      }
    }
    case 'personel':
      return { baris: 'Akan datang: bilangan anggota Aktif dan Simpanan yang boleh dikerahkan.' }
    case 'logistik': {
      const j = d.logistik!.jumlah
      return {
        baris: [
          ['Jumlah aset', nombor(j.jumlah)],
          ['Baik', denganPeratus(j.baik, j.jumlah)],
          ['Selenggara', denganPeratus(j.selenggara, j.jumlah)],
          ['Rosak', denganPeratus(j.rosak, j.jumlah)],
        ],
        kiraan: j,
      }
    }
    case 'bantuan': {
      const b = d.bantuan
      if (!b) return { baris: 'Data bantuan tidak dapat dibaca untuk akaun ini.' }
      return {
        baris: [
          ['Jumlah sumbangan', nombor(b.jumlah)],
          ['Diterima', nombor(b.ikutStatus.TERIMA)],
          ['Dalam proses', nombor(b.ikutStatus.DALAM_PROSES)],
          ['Pendaftaran NGO', nombor(b.jumlahNgo)],
        ],
      }
    }
  }
}

function panel(
  k: Konteks,
  x: number,
  y: number,
  w: number,
  h: number,
  tajuk: string,
  huraian: string,
  warna: RGB,
  isi: { baris: [string, string][] | string; kiraan?: Kiraan },
) {
  const { doc } = k
  doc.setFillColor(...PUTIH)
  doc.setDrawColor(...GARIS)
  doc.setLineWidth(0.3)
  doc.roundedRect(x, y, w, h, 3, 3, 'FD')
  doc.setFillColor(...warna)
  doc.roundedRect(x, y, w, 11, 3, 3, 'F')
  doc.rect(x, y + 6, w, 5, 'F')

  doc.setTextColor(...PUTIH)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.text(tajuk, x + 4, y + 7.3)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(huraian, x + w - 4, y + 7.3, { align: 'right' })

  if (typeof isi.baris === 'string') {
    doc.setTextColor(...KELABU)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text(doc.splitTextToSize(isi.baris, w - 8) as string[], x + 4, y + 20)
  } else {
    isi.baris.forEach(([label, nilai], i) => {
      const by = y + 19 + i * 7.5
      doc.setTextColor(...KELABU)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.text(label, x + 4, by)
      doc.setTextColor(...NAVY)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(nilai, x + w - 4, by, { align: 'right' })
      doc.setDrawColor(...GARIS)
      doc.setLineWidth(0.2)
      doc.line(x + 4, by + 2.4, x + w - 4, by + 2.4)
    })
  }
  if (isi.kiraan) barKeadaan(doc, x + 4, y + h - 10, w - 8, 5.5, isi.kiraan)
}

function halamanRingkasan(k: Konteks, d: DataPoket) {
  lukisHeader(k)
  const { doc } = k
  const dipilih = SENARAI_POKET.filter((p) => d.tapisan.poket.includes(p.id))
  const gap = 6
  const pw = (W - 2 * M - gap) / 2
  const ph = 66

  dipilih.forEach((p, i) => {
    const x = M + (i % 2) * (pw + gap)
    const y = ATAS + Math.floor(i / 2) * (ph + gap)
    panel(k, x, y, pw, ph, p.label.toUpperCase(), p.huraian, WARNA_POKET[p.id], isiPanel(p.id, d))
  })
  k.y = ATAS + Math.ceil(dipilih.length / 2) * (ph + gap) + 2

  const nota = notaSkop(d.tapisan)
  doc.setFontSize(8)
  const baris = nota.flatMap((n) => doc.splitTextToSize(`- ${n}`, W - 2 * M - 8) as string[])
  const tinggi = 10 + baris.length * 4
  doc.setFillColor(...LATAR)
  doc.setDrawColor(...GARIS)
  doc.roundedRect(M, k.y, W - 2 * M, tinggi, 2.5, 2.5, 'FD')
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('CATATAN', M + 4, k.y + 5.5)
  doc.setTextColor(...KELABU)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(baris, M + 4, k.y + 10.5, { lineHeightFactor: 1.4 })
}

// --- Pocket pages ---

function halamanBencana(k: Konteks, b: PoketBencana) {
  halamanBaru(k, 'BENCANA · STATUS SEMASA & PPS')
  barisKad(k, [
    ['Bencana Aktif', nombor(b.bencanaAktif), OREN],
    ['PPS Dibuka', nombor(b.pps), NAVY],
    ['Mangsa', nombor(b.mangsa), MERAH],
    ['Keluarga', nombor(b.keluarga), BIRU],
    ['Daerah Terjejas', nombor(b.daerahTerjejas), KELABU],
  ])
  if (b.korban) {
    barisKad(
      k,
      [
        ['Kematian', nombor(b.korban.kematian), MERAH],
        ['Cedera', nombor(b.korban.kecederaan), KUNING],
        ['Hilang', nombor(b.korban.hilang), UNGU],
      ],
      20,
    )
  }

  tajukSeksyen(k, 'Senarai Bencana Aktif')
  if (b.senaraiBencana.length === 0) {
    teksKosong(k, 'Tiada bencana aktif dalam skop ini.')
  } else {
    jadual(
      k,
      ['Bil', 'Nama Bencana', 'Jenis', 'Negeri', 'PPS', 'Mangsa', 'Keluarga'],
      b.senaraiBencana.map((x, i) => [i + 1, x.nama, x.jenis, x.negeri, nombor(x.pps), nombor(x.mangsa), nombor(x.keluarga)]),
      { foot: ['', 'JUMLAH', '', '', nombor(b.pps), nombor(b.mangsa), nombor(b.keluarga)], kanan: [4, 5, 6] },
    )
  }

  tajukSeksyen(k, 'PPS Dibuka Mengikut Daerah')
  if (b.ikutDaerah.length === 0) {
    teksKosong(k, 'Tiada PPS dibuka dalam skop ini.')
  } else {
    jadual(
      k,
      ['Bil', 'Negeri', 'Daerah', 'PPS', 'Mangsa', 'Keluarga'],
      b.ikutDaerah.map((x, i) => [i + 1, x.negeri, x.daerah, nombor(x.pps), nombor(x.mangsa), nombor(x.keluarga)]),
      { kanan: [3, 4, 5] },
    )
  }
}

function halamanLogistik(k: Konteks, l: PoketLogistik) {
  halamanBaru(k, 'LOGISTIK · STATUS KENDERAAN')
  const j = l.jumlah
  barisKad(k, [
    ['Jumlah Aset', nombor(j.jumlah), NAVY, `${peratus(j.baik, j.jumlah)}% sedia digunakan`],
    ['Baik', nombor(j.baik), HIJAU, `${peratus(j.baik, j.jumlah)}%`],
    ['Selenggara', nombor(j.selenggara), KUNING, `${peratus(j.selenggara, j.jumlah)}%`],
    ['Rosak', nombor(j.rosak), MERAH, `${peratus(j.rosak, j.jumlah)}%`],
  ])

  if (j.jumlah === 0) {
    teksKosong(k, 'Tiada kenderaan direkodkan dalam skop ini.')
    return
  }

  const { doc } = k
  tajukSeksyen(k, 'Mengikut Jenis Kenderaan')
  legenda(k)
  for (const jenis of l.ikutJenis) {
    pastikanRuang(k, 9)
    doc.setTextColor(...NAVY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(jenis.nama, M, k.y + 4.3)
    barKeadaan(doc, M + 32, k.y, W - 2 * M - 32 - 22, 6, jenis)
    doc.setTextColor(...KELABU)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`${nombor(jenis.jumlah)} unit`, W - M, k.y + 4.3, { align: 'right' })
    k.y += 9
  }
  k.y += 4

  tajukSeksyen(k, `Mengikut ${l.tajukKawasan}`)
  jadual(
    k,
    [l.tajukKawasan, 'Baik', 'Selenggara', 'Rosak', 'Jumlah', '% Sedia'],
    l.ikutKawasan.map((x) => [x.nama, nombor(x.baik), nombor(x.selenggara), nombor(x.rosak), nombor(x.jumlah), `${peratus(x.baik, x.jumlah)}%`]),
    {
      foot: ['JUMLAH', nombor(j.baik), nombor(j.selenggara), nombor(j.rosak), nombor(j.jumlah), `${peratus(j.baik, j.jumlah)}%`],
      kanan: [1, 2, 3, 4, 5],
    },
  )

  if (!l.tidakSedia) {
    teksKosong(k, 'Senarai aset Selenggara / Rosak dipaparkan apabila satu negeri dipilih.')
    return
  }
  tajukSeksyen(k, 'Aset Selenggara / Rosak')
  if (l.tidakSedia.length === 0) {
    teksKosong(k, 'Semua aset dalam keadaan baik.')
    return
  }
  jadual(
    k,
    ['Bil', 'No. Plat', 'Kenderaan', 'Jenis', 'Daerah', 'Keadaan', 'Catatan'],
    l.tidakSedia.map((x, i) => [i + 1, x.plat, x.nama, x.jenis, x.daerah, x.keadaan === 'rosak' ? 'ROSAK' : 'SELENGGARA', x.catatan || '-']),
    { warnaSel: (baris, kolum) => (kolum === 5 ? (l.tidakSedia![baris].keadaan === 'rosak' ? MERAH : KUNING) : undefined) },
  )
}

function halamanBantuan(k: Konteks, b: PoketBantuan | null) {
  halamanBaru(k, 'BANTUAN · NGO, CDA & LAIN-LAIN')
  if (!b) {
    teksKosong(k, 'Data bantuan tidak dapat dibaca untuk akaun ini.')
    return
  }
  barisKad(k, [
    ['Jumlah Sumbangan', nombor(b.jumlah), NAVY],
    ['Diterima', nombor(b.ikutStatus.TERIMA), HIJAU],
    ['Dalam Proses', nombor(b.ikutStatus.DALAM_PROSES), KUNING],
    ['Batal', nombor(b.ikutStatus.BATAL), MERAH],
    ['Pendaftaran NGO', nombor(b.jumlahNgo), BIRU],
  ])
  if (b.jumlah === 0) {
    teksKosong(k, 'Tiada sumbangan direkodkan dalam skop ini.')
    return
  }

  tajukSeksyen(k, 'Mengikut Jenis Kumpulan')
  jadual(
    k,
    ['Jenis Kumpulan', 'Jumlah', 'Diterima'],
    b.ikutKumpulan.map((x) => [x.nama, nombor(x.jumlah), nombor(x.terima)]),
    { kanan: [1, 2] },
  )

  tajukSeksyen(k, 'Mengikut Jenis Sumbangan')
  jadual(k, ['Jenis Sumbangan', 'Jumlah'], b.ikutJenis.map((x) => [x.nama, nombor(x.jumlah)]), { kanan: [1] })

  if (b.ikutNegeri) {
    tajukSeksyen(k, 'Mengikut Negeri')
    jadual(
      k,
      ['Negeri', 'Jumlah', 'Diterima'],
      b.ikutNegeri.map((x) => [x.nama, nombor(x.jumlah), nombor(x.terima)]),
      { kanan: [1, 2] },
    )
  }
}

function namaFail(d: DataPoket) {
  const t = new Date(d.dijanaPada)
  const skop = [d.tapisan.negeri || 'Nasional', d.tapisan.daerah].filter(Boolean).join('_').replace(/\s+/g, '_')
  const masa = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}-${pad(t.getHours())}${pad(t.getMinutes())}`
  return `Pocket_Data_${skop}_${masa}.pdf`
}

export async function janaPocketDataPdf(d: DataPoket, dijanaOleh: string) {
  const { default: JsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const k: Konteks = {
    doc,
    autoTable,
    logo: await muatGambar(apmLogo),
    skop: labelSkop(d.tapisan),
    setakat: tarikhMasa(d.dijanaPada),
    tajuk: 'RINGKASAN KESELURUHAN',
    y: ATAS,
  }

  halamanRingkasan(k, d)
  if (d.bencana) halamanBencana(k, d.bencana)
  if (d.logistik) halamanLogistik(k, d.logistik)
  if (d.tapisan.poket.includes('bantuan')) halamanBantuan(k, d.bantuan ?? null)

  lukisFooter(doc, dijanaOleh, k.setakat)
  doc.save(namaFail(d))
}
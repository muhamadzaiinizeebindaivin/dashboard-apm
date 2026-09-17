export type SumbanganStatus = 'DALAM_PROSES' | 'TERIMA' | 'BATAL'

export const STATUS_LIST: SumbanganStatus[] = ['DALAM_PROSES', 'TERIMA', 'BATAL']

export const STATUS_LABEL: Record<SumbanganStatus, string> = {
  DALAM_PROSES: 'Dalam Proses',
  TERIMA: 'Terima',
  BATAL: 'Batal',
}

export const STATUS_BADGE_CLASS: Record<SumbanganStatus, string> = {
  DALAM_PROSES: 'bg-orange-100 text-orange-700',
  TERIMA: 'bg-emerald-100 text-emerald-700',
  BATAL: 'bg-red-100 text-red-700',
}
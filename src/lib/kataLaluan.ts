// Password strength rules (same as the Daftar and Set Password pages)
export const SYARAT_KATA_LALUAN: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'Sekurang-kurangnya 8 aksara', test: (pw) => pw.length >= 8 },
  { label: 'Satu huruf besar (A-Z)', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Satu huruf kecil (a-z)', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Satu nombor (0-9)', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Satu aksara khas (!@#$...)', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
]

export const kataLaluanKukuh = (pw: string) => SYARAT_KATA_LALUAN.every((s) => s.test(pw))
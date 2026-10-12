// mammoth ships a browser bundle without its own type declarations
declare module 'mammoth/mammoth.browser' {
  type Hasil = { value: string; messages: unknown[] }
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<Hasil>
  const mammoth: { convertToHtml: typeof convertToHtml }
  export default mammoth
}
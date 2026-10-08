import type { PDFPage, RGB } from 'pdf-lib'

// Code 128 (character set B) barcodes for prescription numbers, drawn as plain rectangles so no image is needed. Any
// scanner reads them; set B covers printable ASCII, which is all a prescription number ("RX0000000001") uses.

// Bar and space widths (in modules) for each symbol value 0–106: bar, space, bar, space, bar, space (stop has 7).
const PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]
const START_B = 104
const STOP = 106

/** The barcode as a string of modules: "1" is a bar, "0" a space (quiet zones not included). */
export function code128B(text: string): string {
  const values = Array.from(text).map((ch) => {
    const code = ch.charCodeAt(0)
    if (code < 32 || code > 126) throw new Error(`Code 128 B can't encode ${JSON.stringify(ch)}`)
    return code - 32
  })
  const checksum = values.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103
  return [START_B, ...values, checksum, STOP]
    .map((v) =>
      Array.from(PATTERNS[v])
        .map((w, i) => (i % 2 === 0 ? '1' : '0').repeat(Number(w)))
        .join(''),
    )
    .join('')
}

/** Draws the barcode with its bottom-left corner at (x, y), `width` wide and `height` tall. */
export function drawBarcode(page: PDFPage, text: string, x: number, y: number, width: number, height: number, color: RGB) {
  const modules = code128B(text)
  const unit = width / modules.length
  let run = 0
  for (let i = 0; i <= modules.length; i++) {
    if (modules[i] === '1') {
      run++
      continue
    }
    if (run) page.drawRectangle({ x: x + (i - run) * unit, y, width: run * unit, height, color })
    run = 0
  }
}

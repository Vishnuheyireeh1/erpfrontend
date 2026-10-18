// How a unit is named on screen: fabric in metres, garments in pieces …
const words: Record<string, string> = { m: 'Metres', mtr: 'Metres', pc: 'Pieces', pcs: 'Pieces', set: 'Sets', kg: 'Kg', g: 'Grams' }

export const unitWord = (code: string) => words[code.toLowerCase()] ?? code

// Items measured in parts (metre, kg …) start empty so staff type the exact amount; pieces start at 1.
export const startQty = (allowDecimal: boolean) => (allowDecimal ? '' : '1')

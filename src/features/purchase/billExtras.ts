// Bottom-of-bill fields on the purchase form (cash discount, packing + GST, freight paid separately).
// freightMode: how the transporter was paid now ('' = not paid yet → "Pay freight" on the bill later).
export type ExtrasForm = { discountMode: '%' | '₹'; discount: string; other: string; chargesGst: string; freight: string; freightMode: string; freightNote: string }
export const emptyExtras: ExtrasForm = { discountMode: '%', discount: '', other: '', chargesGst: '0', freight: '', freightMode: 'CASH', freightNote: '' }

// Form strings → numbers for the API / live preview.
export const extrasInput = (x: ExtrasForm) => ({
  billDiscountPct: x.discountMode === '%' ? Number(x.discount) || 0 : 0,
  billDiscount: x.discountMode === '₹' ? Number(x.discount) || 0 : 0,
  otherCharges: Number(x.other) || 0,
  chargesGstRate: Number(x.chargesGst) || 0,
  freightSeparate: Number(x.freight) || 0,
  freightMode: Number(x.freight) > 0 && x.freightMode ? x.freightMode : null,
})

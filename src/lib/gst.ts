// GST state codes (first 2 digits of a GSTIN). Mirrors backend/src/utils/gst.ts.
export const gstStates: Record<string, string> = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka',
  '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
}

export const stateOptions = Object.entries(gstStates)
  .map(([value, name]) => ({ value, label: `${name} (${value})` }))
  .sort((a, b) => a.label.localeCompare(b.label))

export type BusinessProfile = {
  shopName: string
  legalName: string
  gstRegistered: boolean
  gstin: string
  stateCode: string
  addressLine1: string
  addressLine2: string
  city: string
  pincode: string
  phone: string
  email: string
  billPrefix: string
}

// Same state → CGST + SGST; different state → IGST.
export const taxModeFor = (businessState: string, partyState?: string | null) =>
  !partyState || partyState === businessState ? 'INTRA' : 'INTER'

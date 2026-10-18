import { customerApi } from './api/sales.api'
import type { Customer } from './types'

// Customers are not added on a separate screen: staff type the name + phone on the bill / job, and the customer
// is saved when the bill is saved. Same phone again → the same customer (no duplicates).

export const phoneDigits = (p: string | null | undefined) => (p ?? '').replace(/\D/g, '')
// Last 10 digits: "+91 98470 12345" and "9847012345" are the same number.
const key = (p: string | null | undefined) => phoneDigits(p).slice(-10)

export function quickCustomerError(name: string, phone: string, phoneNeeded = true): string | null {
  if (!name.trim()) return 'Enter the customer name'
  const d = phoneDigits(phone)
  if (!d && phoneNeeded) return 'Enter the customer phone number (needed for stitching)'
  if (d && (d.length < 10 || d.length > 12)) return 'Phone number should be 10 digits'
  return null
}

// The saved customer with this phone, or a new one (name + phone; a shop-only buyer may have no phone).
export async function ensureCustomer(name: string, phone: string): Promise<Customer> {
  if (!phoneDigits(phone)) {
    const c = await customerApi.create({ name: name.trim() })
    return { ...c, balance: Number(c.openingBalance) }
  }
  const k = key(phone)
  const found = (await customerApi.list({ search: k, status: 'all', pageSize: 20 })).items.find((c) => key(c.phone) === k)
  if (found) {
    if (!found.isActive) throw new Error(`${phone} belongs to ${found.name} (${found.code}), who is inactive — make them active on the Customers page`)
    return found
  }
  const c = await customerApi.create({ name: name.trim(), phone: phoneDigits(phone) })
  return { ...c, balance: Number(c.openingBalance) }
}

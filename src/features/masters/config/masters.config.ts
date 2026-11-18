import {
  IconCategory,
  IconPackages,
  IconPalette,
  IconReceiptTax,
  IconRuler,
  IconShirt,
  IconTool,
  type Icon,
} from '@tabler/icons-react'
import type { FieldDef, MasterKey } from '../types'

export type MasterMeta = {
  key: MasterKey
  label: string // tab label (plural)
  singular: string // "brand" — used in buttons and messages
  icon: Icon
  description: string
  fields: FieldDef[]
}

const active: FieldDef = {
  name: 'isActive',
  label: 'Active',
  type: 'switch',
  hint: 'Inactive entries are hidden from dropdowns but kept in old records.',
}

// One entry per tab on the Masters page (order = tab order).
export const masters: MasterMeta[] = [
  {
    key: 'productTypes',
    label: 'Product types',
    singular: 'product type',
    icon: IconPackages,
    description: 'Kinds of products (Ready-made, Saree, Kids wear …) and how each one works.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Kids wear' },
      { name: 'kind', label: 'How it works', type: 'kind', required: true, hint: "Service = no stock. Own-made = made in the shop. Can't change once products use it." },
      active,
    ],
  },
  {
    key: 'categories',
    label: 'Categories',
    singular: 'category',
    icon: IconCategory,
    description: 'Main categories and their subcategories (2 levels).',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Silk sarees' },
      { name: 'parentId', label: 'Main category', type: 'parent', hint: 'Leave empty to make this a main category.' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional notes' },
      active,
    ],
  },
  {
    key: 'units',
    label: 'Units',
    singular: 'unit',
    icon: IconRuler,
    description: 'How items are counted or measured when bought and sold.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Metre' },
      { name: 'code', label: 'Short code', type: 'text', required: true, placeholder: 'm', hint: 'Shown on bills, e.g. 2.5 m' },
      { name: 'allowDecimal', label: 'Allow decimals', type: 'switch', hint: 'On for metre / kg (2.5 m). Off for piece / set.' },
      active,
    ],
  },
  {
    key: 'sizes',
    label: 'Sizes',
    singular: 'size',
    icon: IconShirt,
    description: 'Garment sizes, in the order they should appear.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'XL' },
      { name: 'sortOrder', label: 'Sort order', type: 'number', placeholder: '10', hint: 'Smaller numbers show first.' },
      active,
    ],
  },
  {
    key: 'colours',
    label: 'Colours',
    singular: 'colour',
    icon: IconPalette,
    description: 'Colours used for products and fabrics.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Maroon' },
      { name: 'hexCode', label: 'Colour swatch', type: 'colour', hint: 'Optional — leave empty for Multicolour.' },
      active,
    ],
  },
  {
    key: 'taxRates',
    label: 'GST rates',
    singular: 'GST rate',
    icon: IconReceiptTax,
    description: 'GST slabs applied on purchases and bills.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'GST 5%' },
      { name: 'rate', label: 'Rate (%)', type: 'number', required: true, placeholder: '5' },
      active,
    ],
  },
  {
    key: 'workCharges',
    label: 'Work charges',
    singular: 'work charge',
    icon: IconTool,
    description: 'Work on brand orders without a garment (Saree bleeding, Fall & pico …) with its usual amounts.',
    fields: [
      { name: 'name', label: 'Work', type: 'text', required: true, placeholder: 'Saree bleeding' },
      { name: 'rate', label: 'Amount to brand ₹', type: 'number', placeholder: '150', hint: 'Filled in when the work is picked on an order' },
      { name: 'labourRate', label: 'Pay to worker ₹', type: 'number', placeholder: '60', hint: 'Per piece, for per-piece workers' },
      active,
    ],
  },
]

export const masterByKey = Object.fromEntries(masters.map((m) => [m.key, m])) as Record<
  MasterKey,
  MasterMeta
>

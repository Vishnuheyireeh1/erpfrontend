import {
  IconBarcode,
  IconBook2,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconCash,
  IconFileInvoice,
  IconChartBar,
  IconHome,
  IconId,
  IconLayoutDashboard,
  IconListDetails,
  IconNeedleThread,
  IconPackage,
  IconReceipt,
  IconReportMoney,
  IconSchool,
  IconScissors,
  IconSettings,
  IconTag,
  IconTruck,
  IconUsers,
  type Icon,
} from '@tabler/icons-react'

export type NavItem = { label: string; path: string; icon: Icon }
export type NavGroup = { title: string; items: NavItem[] }

// Sidebar / drawer navigation — one entry per ERP module (SRS sections).
export const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/', icon: IconLayoutDashboard }],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Billing', path: '/billing', icon: IconReceipt },
      { label: 'Sales bills', path: '/sales', icon: IconFileInvoice },
      { label: 'Customers', path: '/customers', icon: IconUsers },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { label: 'Products', path: '/products', icon: IconPackage },
      { label: 'Stock', path: '/stock', icon: IconBuildingWarehouse },
      { label: 'Barcode labels', path: '/labels', icon: IconBarcode },
      { label: 'Purchase', path: '/purchase', icon: IconTruck },
      { label: 'Suppliers', path: '/suppliers', icon: IconBuildingStore },
    ],
  },
  {
    title: 'Workshop',
    items: [
      { label: 'Stitching jobs', path: '/jobs', icon: IconNeedleThread },
      { label: 'Job work', path: '/tailors', icon: IconScissors },
      { label: 'Brand orders', path: '/brand-orders', icon: IconTag },
    ],
  },
  {
    title: 'Institute and people',
    items: [
      { label: 'Training', path: '/training', icon: IconSchool },
      { label: 'Staff & salary', path: '/employees', icon: IconId },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Expenses', path: '/expenses', icon: IconReportMoney },
      { label: 'Cash & day book', path: '/finance', icon: IconCash },
      { label: 'Accounts (books)', path: '/accounts', icon: IconBook2 },
      { label: 'Reports', path: '/reports', icon: IconChartBar },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Masters', path: '/masters', icon: IconListDetails },
      { label: 'Settings', path: '/settings', icon: IconSettings },
    ],
  },
]

// Phone bottom bar (4 shortcuts + "More" which opens the drawer).
export const bottomNavItems: NavItem[] = [
  { label: 'Home', path: '/', icon: IconHome },
  { label: 'Bill', path: '/billing', icon: IconReceipt },
  { label: 'Jobs', path: '/jobs', icon: IconNeedleThread },
  { label: 'Stock', path: '/stock', icon: IconBuildingWarehouse },
]

export const allNavItems = navGroups.flatMap((group) => group.items)

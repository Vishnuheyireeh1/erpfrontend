import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { SalesByCategoryView, SalesByCustomerView } from '../components/CategoryCustomerReports'
import { GstRegisterView, HsnView } from '../components/GstRegisterView'
import { GstSummaryView } from '../components/GstSummaryView'
import { ItemProfitView } from '../components/ItemProfitView'
import { PurchaseReportView } from '../components/PurchaseReportView'
import { SalesByTypeView } from '../components/SalesByTypeView'
import { ItemsSoldView, SalesByDayView } from '../components/SalesReports'
import { StockReportView, WhoOwesView } from '../components/StockOwesReports'

const tabs = [
  { key: 'sales', label: 'Sales by day' },
  { key: 'types', label: 'Sales by type' },
  { key: 'items', label: 'Items sold' },
  { key: 'item-profit', label: 'Profit by item' },
  { key: 'category', label: 'By category' },
  { key: 'customer', label: 'By customer' },
  { key: 'owes', label: 'Who owes' },
  { key: 'stock', label: 'Stock value' },
  { key: 'slow', label: 'Slow-moving' },
  { key: 'purchases', label: 'Purchases' },
  { key: 'gst', label: 'GST summary' },
  { key: 'gst-sales', label: 'GST sales' },
  { key: 'hsn', label: 'HSN summary' },
  { key: 'gst-purchases', label: 'GST purchases' },
] as const
type Tab = (typeof tabs)[number]['key']

const others = [
  { to: '/accounts', label: 'Accounts (balance sheet, trial balance)' },
  { to: '/finance?tab=profit', label: 'Profit & loss' },
  { to: '/finance', label: 'Day book' },
  { to: '/workshop-reports', label: 'Tailor work & job profit' },
  { to: '/stock', label: 'Stock & value' },
]

// /reports — sales and GST reports (every one downloads to Excel for the accountant).
export function ReportsPage() {
  const [params, setParams] = useSearchParams()
  const tab = (tabs.some((t) => t.key === params.get('tab')) ? params.get('tab') : 'sales') as Tab
  return (
    <>
      <PageHeader title="Reports" subtitle="Sales and GST — choose the dates, then download Excel for the accountant." />
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span className="text-muted">Also:</span>
        {others.map((o) => <Link key={o.to} to={o.to} className="font-medium text-brand hover:underline">{o.label}</Link>)}
      </div>
      <div className="mb-4">
        <Tabs tabs={[...tabs]} active={tab} onChange={(t) => setParams(t === 'sales' ? {} : { tab: t })} />
      </div>
      {tab === 'sales' && <SalesByDayView />}
      {tab === 'types' && <SalesByTypeView />}
      {tab === 'items' && <ItemsSoldView />}
      {tab === 'item-profit' && <ItemProfitView />}
      {tab === 'category' && <SalesByCategoryView />}
      {tab === 'customer' && <SalesByCustomerView />}
      {tab === 'owes' && <WhoOwesView />}
      {tab === 'stock' && <StockReportView key="stock" slow={false} />}
      {tab === 'slow' && <StockReportView key="slow" slow />}
      {tab === 'purchases' && <PurchaseReportView />}
      {tab === 'gst' && <GstSummaryView />}
      {tab === 'gst-sales' && <GstRegisterView key="sales" kind="sales" />}
      {tab === 'hsn' && <HsnView />}
      {tab === 'gst-purchases' && <GstRegisterView key="purchases" kind="purchases" />}
    </>
  )
}

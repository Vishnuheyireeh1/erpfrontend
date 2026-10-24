import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { allNavItems } from '@/config/navigation'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { NotFoundPage } from '@/features/common/pages/NotFoundPage'
import { PlaceholderPage } from '@/features/common/pages/PlaceholderPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { MastersPage } from '@/features/masters/pages/MastersPage'
import { ProductFormPage } from '@/features/products/pages/ProductFormPage'
import { ProductImportPage } from '@/features/products/pages/ProductImportPage'
import { ProductsRoute } from '@/features/products/pages/ProductsRoute'
import { OpeningImportPage } from '@/features/inventory/pages/OpeningImportPage'
import { StockDocumentPage } from '@/features/inventory/pages/StockDocumentPage'
import { StockDocumentsPage } from '@/features/inventory/pages/StockDocumentsPage'
import { StockEntryRoute } from '@/features/inventory/pages/StockEntryRoute'
import { StockLedgerPage } from '@/features/inventory/pages/StockLedgerPage'
import { StockPage } from '@/features/inventory/pages/StockPage'
import { ExpensesPage } from '@/features/finance/pages/ExpensesPage'
import { StaffPage } from '@/features/staff/pages/StaffPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { StudentPage } from '@/features/training/pages/StudentPage'
import { TrainingPage } from '@/features/training/pages/TrainingPage'
import { ProductionViewPage } from '@/features/production/pages/ProductionViewPage'
import { AccountsPage } from '@/features/accounts/pages/AccountsPage'
import { ActivityPage } from '@/features/settings/pages/ActivityPage'
import { FinancePage } from '@/features/finance/pages/FinancePage'
import { JobFormPage } from '@/features/jobs/pages/JobFormPage'
import { JobsListPage } from '@/features/jobs/pages/JobsListPage'
import { JobViewPage } from '@/features/jobs/pages/JobViewPage'
import { LabelsPage } from '@/features/labels/pages/LabelsPage'
import { PaymentViewPage } from '@/features/purchase/pages/PaymentViewPage'
import { PurchaseFormPage } from '@/features/purchase/pages/PurchaseFormPage'
import { PurchaseListPage } from '@/features/purchase/pages/PurchaseListPage'
import { PurchaseViewPage } from '@/features/purchase/pages/PurchaseViewPage'
import { ReturnViewPage } from '@/features/purchase/pages/ReturnViewPage'
import { SupplierPage } from '@/features/purchase/pages/SupplierPage'
import { SuppliersPage } from '@/features/purchase/pages/SuppliersPage'
import { BrandOrderFormPage } from '@/features/brands/pages/BrandOrderFormPage'
import { BrandOrdersPage } from '@/features/brands/pages/BrandOrdersPage'
import { BrandOrderViewPage } from '@/features/brands/pages/BrandOrderViewPage'
import { BrandsPage } from '@/features/brands/pages/BrandsPage'
import { BrandBillPage } from '@/features/brands/pages/BrandBillPage'
import { BrandPage } from '@/features/brands/pages/BrandPage'
import { BrandReportsPage } from '@/features/brands/pages/BrandReportsPage'
import { BillingPage } from '@/features/sales/pages/BillingPage'
import { FastBillPage } from '@/features/sales/fast/FastBillPage'
import { CustomerPage } from '@/features/sales/pages/CustomerPage'
import { CustomersPage } from '@/features/sales/pages/CustomersPage'
import { ReceiptViewPage } from '@/features/sales/pages/ReceiptViewPage'
import { SaleViewPage } from '@/features/sales/pages/SaleViewPage'
import { SalesListPage } from '@/features/sales/pages/SalesListPage'
import { SalesReturnViewPage } from '@/features/sales/pages/SalesReturnViewPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { TailorPage } from '@/features/workshop/pages/TailorPage'
import { TailorsPage } from '@/features/workshop/pages/TailorsPage'
import { WorkshopReportsPage } from '@/features/workshop/pages/WorkshopReportsPage'
import { UiKitPage } from '@/features/ui-kit/pages/UiKitPage'

// Modules that are built. Add each new module's page here.
const builtRoutes = [
  { path: 'masters', element: <MastersPage /> },
  { path: 'products', element: <ProductsRoute /> },
  { path: 'products/new', element: <ProductFormPage /> },
  { path: 'products/import', element: <ProductImportPage /> },
  { path: 'products/:id', element: <ProductFormPage /> },
  { path: 'stock', element: <StockPage /> },
  { path: 'stock/new', element: <StockEntryRoute /> },
  { path: 'stock/items/:id', element: <StockLedgerPage /> },
  { path: 'stock/documents', element: <StockDocumentsPage /> },
  { path: 'stock/documents/:id', element: <StockDocumentPage /> },
  { path: 'stock/opening/import', element: <OpeningImportPage /> },
  { path: 'labels', element: <LabelsPage /> },
  { path: 'purchase', element: <PurchaseListPage /> },
  { path: 'purchase/new', element: <PurchaseFormPage /> },
  { path: 'purchase/payments/:id', element: <PaymentViewPage /> },
  { path: 'purchase/returns/:id', element: <ReturnViewPage /> },
  { path: 'purchase/:id', element: <PurchaseViewPage /> },
  { path: 'suppliers', element: <SuppliersPage /> },
  { path: 'suppliers/:id', element: <SupplierPage /> },
  { path: 'billing', element: <BillingPage /> },
  { path: 'billing/fast', element: <FastBillPage /> },
  { path: 'sales', element: <SalesListPage /> },
  { path: 'sales/receipts/:id', element: <ReceiptViewPage /> },
  { path: 'sales/returns/:id', element: <SalesReturnViewPage /> },
  { path: 'sales/:id', element: <SaleViewPage /> },
  { path: 'customers', element: <CustomersPage /> },
  { path: 'customers/:id', element: <CustomerPage /> },
  { path: 'tailors', element: <TailorsPage /> },
  { path: 'tailors/:id', element: <TailorPage /> },
  { path: 'brands', element: <BrandsPage /> },
  { path: 'brands/:id', element: <BrandPage /> },
  { path: 'brand-bills/:id', element: <BrandBillPage /> },
  { path: 'brand-reports', element: <BrandReportsPage /> },
  { path: 'brand-orders', element: <BrandOrdersPage /> },
  { path: 'brand-orders/new', element: <BrandOrderFormPage /> },
  { path: 'brand-orders/:id', element: <BrandOrderViewPage /> },
  { path: 'brand-orders/:id/edit', element: <BrandOrderFormPage /> },
  { path: 'workshop-reports', element: <WorkshopReportsPage /> },
  { path: 'jobs', element: <JobsListPage /> },
  { path: 'jobs/new', element: <JobFormPage /> },
  { path: 'jobs/:id/edit', element: <JobFormPage /> },
  { path: 'jobs/:id', element: <JobViewPage /> },
  { path: 'expenses', element: <ExpensesPage /> },
  { path: 'employees', element: <StaffPage /> },
  { path: 'reports', element: <ReportsPage /> },
  { path: 'training', element: <TrainingPage /> },
  { path: 'training/students/:id', element: <StudentPage /> },
  { path: 'own-made', element: <Navigate to="/products?type=FINISHED" replace /> }, // old link → Products, Own-made filter
  { path: 'production/:id', element: <ProductionViewPage /> },
  { path: 'finance', element: <FinancePage /> },
  { path: 'accounts', element: <AccountsPage /> },
  { path: 'settings', element: <SettingsPage /> },
  { path: 'settings/activity', element: <ActivityPage /> },
]

// Every other menu entry gets the "coming soon" placeholder for now.
const builtPaths = new Set(builtRoutes.map((r) => `/${r.path}`))
const placeholderRoutes = allNavItems
  .filter((item) => item.path !== '/' && !builtPaths.has(item.path))
  .map((item) => ({ path: item.path.slice(1), element: <PlaceholderPage /> }))

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    // Everything inside needs the admin login.
    element: <RequireAuth />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          ...builtRoutes,
          ...placeholderRoutes,
          { path: 'ui-kit', element: <UiKitPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])

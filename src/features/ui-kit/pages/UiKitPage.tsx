import { IconBarcode, IconDownload, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast-context'
import { formatINR } from '@/lib/format'

type Product = { sku: string; name: string; type: string; stock: number; price: number }

const TYPES = ['Raw material', 'Ready-made', 'Accessory']
const PAGE_SIZE = 8

// 57 fake products to demo server-style paging.
const demoProducts: Product[] = Array.from({ length: 57 }, (_, i) => ({
  sku: `SKU-${String(i + 1).padStart(5, '0')}`,
  name: ['Cotton silk fabric', 'Designer kurti', 'Gold button set', 'Lining cloth'][i % 4],
  type: TYPES[i % 3],
  stock: (i * 7) % 40,
  price: 150 + ((i * 37) % 1400),
}))

const productColumns: Column<Product>[] = [
  { key: 'sku', header: 'SKU', mobile: 'title' },
  { key: 'name', header: 'Name', mobile: 'subtitle' },
  { key: 'type', header: 'Type' },
  {
    key: 'stock',
    header: 'Stock',
    mobile: 'badge',
    render: (p) => <Badge tone={p.stock < 8 ? 'warn' : 'success'}>{p.stock} in stock</Badge>,
  },
  { key: 'price', header: 'Price', align: 'right', render: (p) => formatINR(p.price) },
]

// Dev-only showcase of every shared component (open /ui-kit). Not in the menu.
export function UiKitPage() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [page, setPage] = useState(1)
  const rows = useMemo(() => demoProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page])

  return (
    <>
      <PageHeader
        title="UI kit"
        subtitle="Every shared component in one place — check on phone, tablet and desktop."
        actions={
          <>
            <Button icon={IconDownload}>Export</Button>
            <Button variant="primary" icon={IconPlus} onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Buttons">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button>Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" icon={IconTrash}>
              Delete
            </Button>
            <Button loading>Saving</Button>
            <Button size="sm">Small</Button>
            <Button size="lg" variant="primary">
              Large
            </Button>
          </div>
        </Card>

        <Card title="Badges and toasts">
          <div className="flex flex-wrap gap-2">
            <Badge>Draft</Badge>
            <Badge tone="brand">Brand</Badge>
            <Badge tone="pending">Stitching</Badge>
            <Badge tone="info">Cutting</Badge>
            <Badge tone="success">Completed</Badge>
            <Badge tone="warn">Delayed</Badge>
            <Badge tone="danger">Cancelled</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => toast.success('Product saved')}>
              Success toast
            </Button>
            <Button size="sm" onClick={() => toast.error("Couldn't save. Try again.")}>
              Error toast
            </Button>
            <Button size="sm" onClick={() => toast.show('Stock updated')}>
              Info toast
            </Button>
          </div>
        </Card>

        <Card title="Form controls" className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Product name" placeholder="Cotton silk fabric" required />
            <Input label="Barcode" icon={IconBarcode} placeholder="Scan or type" hint="Scanner input works here" />
            <Select
              label="Product type"
              placeholder="Choose type"
              options={TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Input label="Selling price" type="number" defaultValue="-5" error="Price can't be negative" />
            <Input label="Search" icon={IconSearch} placeholder="Name or SKU" />
            <Input label="Disabled" value="Read-only value" disabled />
            <Textarea label="Notes" placeholder="Stitching instructions" className="sm:col-span-2 lg:col-span-3" />
          </div>
        </Card>
      </div>

      <Card title="Data table (cards on phone)" bodyClassName="p-0" className="mt-5">
        <DataTable
          startIndex={(page - 1) * PAGE_SIZE + 1}
          columns={productColumns}
          rows={rows}
          rowKey={(p) => p.sku}
          onRowClick={(p) => toast.show(`Clicked ${p.sku}`)}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={demoProducts.length} onPageChange={setPage} />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add product"
        description="Bottom sheet on phone, dialog on tablet and desktop."
        footer={
          <>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                setModalOpen(false)
                toast.success('Product saved')
              }}
            >
              Save product
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Product name" placeholder="Designer kurti" required />
          <Select label="Type" options={TYPES.map((t) => ({ value: t, label: t }))} />
          <Input label="Purchase price" type="number" placeholder="0" />
          <Input label="Selling price" type="number" placeholder="0" />
        </div>
      </Modal>
    </>
  )
}

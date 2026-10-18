import { useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { LabelWorkbench } from '../components/LabelWorkbench'
import { useLabelSeed } from '../hooks/useLabelSeed'

// /labels — barcode labels for products / stock. ?doc= ?product= ?variant= pre-fill the list.
export function LabelsPage() {
  const { search } = useLocation()
  const seed = useLabelSeed()

  return (
    <>
      <PageHeader title="Barcode labels" subtitle="Print price stickers with barcodes for the label printer or A4 sticker sheets." />
      {seed.loading ? (
        <div className="flex justify-center py-16"><Spinner size={28} /></div>
      ) : seed.error ? (
        <Card><EmptyState title="Couldn't load the items" description={seed.error} action={<Button onClick={() => window.location.reload()}>Try again</Button>} /></Card>
      ) : (
        // key → a new ?doc= / ?product= link starts a fresh list
        <LabelWorkbench key={search} initial={seed.entries} />
      )}
    </>
  )
}

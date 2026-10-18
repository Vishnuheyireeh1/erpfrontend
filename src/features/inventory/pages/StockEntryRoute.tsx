import { useSearchParams } from 'react-router-dom'
import { StockEntryPage } from './StockEntryPage'

// Fresh form when switching between ?kind=opening and ?kind=adjustment.
export function StockEntryRoute() {
  const [params] = useSearchParams()
  return <StockEntryPage key={params.get('kind') ?? 'adjustment'} />
}

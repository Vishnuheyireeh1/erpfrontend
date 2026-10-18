import { useLocation } from 'react-router-dom'
import { ProductListPage } from './ProductListPage'

// Remounts the list when ?search= changes (e.g. searching again from the top bar).
export function ProductsRoute() {
  const { search } = useLocation()
  return <ProductListPage key={search} />
}

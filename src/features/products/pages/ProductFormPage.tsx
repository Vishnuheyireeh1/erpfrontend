import { IconArrowLeft, IconBarcode, IconTrash } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState, Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast-context'
import { productionApi } from '@/features/production/api/production.api'
import { ApiError } from '@/lib/api'
import { productsApi } from '../api/products.api'
import { BasicInfoCard } from '../components/form/BasicInfoCard'
import { ImageCard } from '../components/form/ImageCard'
import { MakingCard } from '../components/form/MakingCard'
import { MakingHistoryCard } from '../components/form/MakingHistoryCard'
import { VariantOptionsCard } from '../components/form/VariantOptionsCard'
import { VariantTable } from '../components/form/VariantTable'
import { useProductOptions } from '../hooks/useProductOptions'
import { emptyMaking, makingError, makingInput, makingUsed, type MakingState } from '../form/making'
import { emptyForm, fromProduct, syncVariants, toPayload, validateForm, type FormErrors, type ProductFormState, type VariantRow } from '../form/productForm'
import type { Product } from '../types'

// /products/new and /products/:id — one page for add and edit.
export function ProductFormPage() {
  const { id } = useParams()
  // Opened from Products → Own-made: back goes to that filter, and a new product starts as Own-made.
  const [query] = useSearchParams()
  const fromOwnMade = query.get('from') === 'own-made'
  const back = fromOwnMade ? '/products?type=FINISHED' : '/products'
  const backLabel = 'Products'
  const isEdit = id !== undefined && id !== 'new'
  const navigate = useNavigate()
  const toast = useToast()
  const { options, ready } = useProductOptions()

  const [product, setProduct] = useState<Product | null>(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState<ProductFormState>(() => ({ ...emptyForm(), type: query.get('type') === 'FINISHED' ? 'FINISHED' : '' }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [image, setImage] = useState<{ file: File | null; removed: boolean; error?: string }>({ file: null, removed: false })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Kept when a new product saved but its making didn't (we move to the product's own page to retry).
  const kept = (useLocation().state as { making?: MakingState } | null)?.making
  const [making, setMaking] = useState<MakingState>(() => kept ?? emptyMaking())

  useEffect(() => {
    if (!isEdit) return
    productsApi
      .get(Number(id))
      .then((p) => {
        setProduct(p)
        setForm(fromProduct(p))
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not load the product'))
  }, [id, isEdit])

  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const setHasVariants = (on: boolean) =>
    setForm((f) => {
      const next = { ...f, hasVariants: on }
      return { ...next, variants: syncVariants(next) }
    })

  // Add / remove one size or colour from the LATEST state, kept in master order (S, M, L …).
  const toggleOption = (kind: 'sizeIds' | 'colourIds', optionId: number) =>
    setForm((f) => {
      const order = (kind === 'sizeIds' ? options.sizes : options.colours).map((o) => o.id)
      const list = f[kind].includes(optionId) ? f[kind].filter((v) => v !== optionId) : [...f[kind], optionId]
      const next = { ...f, [kind]: list.sort((a, b) => order.indexOf(a) - order.indexOf(b)) }
      return { ...next, variants: syncVariants(next) }
    })

  const changeRow = (key: string, patch: Partial<VariantRow>) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v) => (v.key === key ? { ...v, ...patch } : v)) }))

  const applyAll = (patch: Partial<VariantRow>) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v) => ({ ...v, ...patch })) }))

  const save = async () => {
    const found = validateForm(form)
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) {
      setFormError('Please fix the highlighted fields.')
      return
    }
    const unitOf = options.units.find((u) => String(u.id) === form.unitId)
    const makes = form.type === 'FINISHED' && makingUsed(making, form.variants)
    const makeProblem = makes ? makingError(making, form.variants, !unitOf?.allowDecimal) : null
    if (makeProblem) return setFormError(makeProblem)
    setSaving(true)
    try {
      const body = toPayload(form)
      const saved = isEdit ? await productsApi.update(Number(id), body) : await productsApi.create(body)
      // Photo after the product exists. A photo failure doesn't lose the product.
      try {
        if (image.file) await productsApi.uploadImage(saved.id, image.file)
        else if (image.removed && saved.imagePath) await productsApi.removeImage(saved.id)
      } catch (err) {
        toast.error(err instanceof ApiError ? `Saved, but photo failed: ${err.message}` : 'Saved, but photo failed')
      }
      // Made in the shop → one making entry: materials out of stock, pieces in at cost.
      if (makes) {
        try {
          const made = await productionApi.create(makingInput(making, form.variants, saved))
          toast.success(`${saved.code} saved · ${made.docNo}: ${Number(made.pieces)} pieces added to stock`)
        } catch (err) {
          // The product IS saved — stay on its page with the making still filled in, to fix and save again.
          const msg = `Product saved, but the making was not: ${err instanceof ApiError ? err.message : (err as Error).message}`
          toast.error(msg)
          setFormError(msg)
          setSaving(false)
          if (!isEdit) navigate(`/products/${saved.id}${fromOwnMade ? '?from=own-made' : ''}`, { replace: true, state: { making } })
          else { setProduct(saved); setForm(fromProduct(saved)) }
          return
        }
      } else toast.success(isEdit ? 'Product updated' : `Product ${saved.code} added`)
      navigate(back)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong')
      setSaving(false)
    }
  }

  const remove = async () => {
    setDeleting(true)
    try {
      await productsApi.remove(Number(id))
      toast.success('Product deleted')
      navigate(back)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not delete')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (loadError) {
    return (
      <Card>
        <EmptyState title="Couldn't open this product" description={loadError} action={<Button onClick={() => navigate(back)}>Back</Button>} />
      </Card>
    )
  }
  if (!ready || (isEdit && !product)) {
    return <div className="flex justify-center py-16"><Spinner size={28} /></div>
  }

  const unit = options.units.find((u) => String(u.id) === form.unitId)
  const actions = (
    <>
      {isEdit && <Button variant="danger" icon={IconTrash} onClick={() => setConfirmDelete(true)}>Delete</Button>}
      {isEdit && product!.type !== 'SERVICE' && <Button icon={IconBarcode} onClick={() => navigate(`/labels?product=${id}`)}>Print labels</Button>}
      <Button onClick={() => navigate(back)}>Cancel</Button>
      <Button variant="primary" loading={saving} onClick={save}>{isEdit ? 'Save changes' : 'Save product'}</Button>
    </>
  )

  return (
    <>
      <button type="button" onClick={() => navigate(back)} className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <IconArrowLeft size={16} /> {backLabel}
      </button>
      <PageHeader title={isEdit ? product!.name : 'Add product'} subtitle={isEdit ? product!.code : 'Fill in the details, then set prices per variant.'} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="flex min-w-0 flex-col gap-5">
          <BasicInfoCard form={form} errors={errors} options={options} set={set} />
          <VariantOptionsCard
            form={form}
            options={options}
            error={errors.variants}
            onHasVariants={setHasVariants}
            onToggle={toggleOption}
          />
          <VariantTable
            rows={form.variants}
            sizes={options.sizes}
            colours={options.colours}
            errors={errors}
            decimalStock={Boolean(unit?.allowDecimal)}
            onRowChange={changeRow}
            onApplyAll={applyAll}
          />
          {isEdit && product!.type === 'FINISHED' && <MakingHistoryCard productId={product!.id} />}
          {form.type === 'FINISHED' && (
            <MakingCard making={making} onChange={(m) => { setMaking(m); setFormError('') }} rows={form.variants} sizes={options.sizes} colours={options.colours} unit={unit} isEdit={isEdit} />
          )}
        </div>
        <div className="lg:order-none -order-1">
          <ImageCard
            savedPath={product?.imagePath ?? null}
            pending={image.file}
            removed={image.removed}
            error={image.error}
            onPick={(file, error) => setImage({ file, removed: false, error })}
            onRemove={() => setImage({ file: null, removed: true })}
          />
        </div>
      </div>

      {formError && <p role="alert" className="mt-5 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">{formError}</p>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product?"
        message={`"${product?.name}" and all its variants will be permanently deleted. This can't be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  )
}

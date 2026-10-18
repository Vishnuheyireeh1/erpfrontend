import { IconAlertTriangle, IconDatabaseExport, IconDownload } from '@tabler/icons-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/toast-context'
import { ApiError } from '@/lib/api'
import { useApiQuery } from '@/lib/useApiQuery'
import { backupKindLabels, fileSize, systemApi } from '../api/system.api'

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

// Settings → Backups: automatic daily backup, "Back up now", download a copy (pen drive / email to yourself).
export function BackupCard({ onChanged }: { onChanged?: () => void }) {
  const toast = useToast()
  const q = useApiQuery('backups', () => systemApi.backups())
  const [busy, setBusy] = useState(false)
  const [all, setAll] = useState(false)
  const b = q.data ?? q.lastData
  const shown = all ? b?.items ?? [] : (b?.items ?? []).slice(0, 5)

  const backupNow = async () => {
    setBusy(true)
    try {
      const r = await systemApi.backupNow()
      toast.success(`Backup saved — ${r.name}`)
      q.reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Backup failed')
      q.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="Backups" actions={<Button size="sm" variant="primary" icon={IconDatabaseExport} loading={busy || !!b?.running} onClick={backupNow}>Back up now</Button>}>
      <p className="text-sm text-ink-soft">
        All data is backed up automatically once a day. Keep a copy outside this PC too — download one to a pen drive every week{b?.copyFolder ? '' : ', or set a copy folder (OneDrive / Google Drive) in the setup'}.
      </p>
      {b?.lastError && (
        <p role="alert" className="mt-3 flex gap-2 rounded-control bg-danger-tint px-3 py-2 text-sm text-danger">
          <IconAlertTriangle size={18} className="shrink-0" aria-hidden /> Last backup failed: {b.lastError.message}
        </p>
      )}
      {b?.lastCopyError && <p className="mt-3 rounded-control bg-warn-tint px-3 py-2 text-sm text-warn">{b.lastCopyError}</p>}
      {!b ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : b.items.length === 0 ? (
        <p className="mt-3 rounded-control bg-warn-tint px-3 py-2 text-sm text-warn">No backup yet — press "Back up now".</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-card border border-line">
          {shown.map((x) => (
            <li key={x.name} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-ink">{when(x.createdAt)}</span>
                <span className="block truncate text-xs text-muted">{fileSize(x.size)} · {x.name}</span>
              </span>
              <Badge tone={x.kind === 'auto' ? 'neutral' : x.kind === 'manual' ? 'info' : 'warn'}>{backupKindLabels[x.kind]}</Badge>
              <a href={`/api/system/backups/${encodeURIComponent(x.name)}`} download className="rounded-control p-1.5 text-muted hover:bg-page hover:text-brand" aria-label={`Download ${x.name}`} title="Download">
                <IconDownload size={18} aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
      {b && b.items.length > 5 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-sm font-medium text-brand hover:underline">{all ? 'Show fewer' : `Show all ${b.items.length}`}</button>
      )}
      {b && (
        <p className="mt-3 text-xs text-muted [overflow-wrap:anywhere]">
          Saved in {b.folder}{b.copyFolder ? ` · copied to ${b.copyFolder}` : ''}. Last {b.keep} daily backups are kept. To put a backup back, see README → "Restore".
        </p>
      )}
    </Card>
  )
}

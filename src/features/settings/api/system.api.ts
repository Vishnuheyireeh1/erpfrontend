import { api } from '@/lib/api'

export type BackupKind = 'auto' | 'manual' | 'before-reset' | 'before-restore'
export type Backup = { name: string; kind: BackupKind; day: string; createdAt: string; size: number }
export type BackupList = {
  items: Backup[]
  folder: string
  copyFolder: string | null
  keep: number
  running: boolean
  lastError: { at: string; message: string } | null
  lastCopyError: string | null
}
export type ChecklistItem = { key: string; title: string; status: 'done' | 'todo' | 'info'; detail: string; link?: string }
export type Activity = { id: number; at: string; actor: string; action: string; entity: string; entityId: string; summary: string }

const qs = (p: Record<string, string | number | undefined>) => new URLSearchParams(Object.entries(p).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '').map(([k, v]) => [k, String(v)])).toString()

export const systemApi = {
  backups: () => api.get<BackupList>('/system/backups'),
  backupNow: () => api.post<{ name: string }>('/system/backups', {}),
  checklist: () => api.get<{ items: ChecklistItem[]; done: number; todo: number }>('/system/checklist'),
  activity: (p: { search?: string; entity?: string; from?: string; to?: string; page: number }) =>
    api.get<{ items: Activity[]; total: number; entities: string[] }>(`/system/activity?${qs({ ...p, pageSize: 50 })}`),
}

export const backupKindLabels: Record<BackupKind, string> = { auto: 'Daily', manual: 'Manual', 'before-reset': 'Before reset', 'before-restore': 'Before restore' }
export const fileSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

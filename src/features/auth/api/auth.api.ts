import { api } from '@/lib/api'

export type Admin = { id: number; username: string; lastLoginAt: string | null }

type AdminResponse = { success: boolean; admin: Admin }

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AdminResponse>('/auth/login', { username, password }).then((r) => r.admin),

  me: () => api.get<AdminResponse>('/auth/me').then((r) => r.admin),

  logout: () => api.post<{ success: boolean }>('/auth/logout'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put<{ success: boolean; message: string }>('/auth/password', {
      currentPassword,
      newPassword,
    }),
}

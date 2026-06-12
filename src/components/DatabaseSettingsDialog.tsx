'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Save, Server, TestTube2, XCircle } from 'lucide-react'
import Modal from './Modal'
import {
  getDatabaseConfigStatus,
  saveDatabaseConfig,
  testDatabaseConnection,
  type DatabaseConfig,
  type DatabaseConfigStatus,
} from '@/services/settings-service'
import { getErrorMessage } from '@/services/http-client'

interface DatabaseSettingsDialogProps {
  open: boolean
  onClose: () => void
}

type FeedbackKind = 'success' | 'error' | 'info'

interface Feedback {
  kind: FeedbackKind
  message: string
}

const defaultForm: DatabaseConfig = {
  host: '',
  port: 5432,
  database: '',
  username: '',
  password: '',
  sslMode: 'prefer',
}

function statusToForm(status: DatabaseConfigStatus | null): DatabaseConfig {
  if (!status?.configured) return defaultForm

  return {
    host: status.host ?? '',
    port: status.port ?? 5432,
    database: status.database ?? '',
    username: status.username ?? '',
    password: '',
    sslMode: status.sslMode ?? 'prefer',
  }
}

export default function DatabaseSettingsDialog({ open, onClose }: DatabaseSettingsDialogProps) {
  const [status, setStatus] = useState<DatabaseConfigStatus | null>(null)
  const [form, setForm] = useState<DatabaseConfig>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const passwordPlaceholder = useMemo(
    () => status?.configured ? '留空则继续使用已保存密码' : '请输入数据库密码',
    [status?.configured],
  )

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setFeedback(null)

    getDatabaseConfigStatus()
      .then((data) => {
        if (cancelled) return
        setStatus(data)
        setForm(statusToForm(data))
      })
      .catch((error) => {
        if (cancelled) return
        setStatus(null)
        setForm(defaultForm)
        setFeedback({
          kind: 'error',
          message: getErrorMessage(error, '读取数据库配置失败'),
        })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  function updateForm<K extends keyof DatabaseConfig>(key: K, value: DatabaseConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFeedback(null)
  }

  async function handleTestConnection() {
    setTesting(true)
    setFeedback(null)

    try {
      const result = await testDatabaseConnection(form)
      setFeedback({
        kind: result.success ? 'success' : 'error',
        message: result.message || (result.success ? '数据库连接可用' : '数据库连接失败'),
      })
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, '数据库连接失败，请检查主机、端口、账号、密码和网络连接'),
      })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setFeedback(null)

    try {
      await saveDatabaseConfig(form)
      const nextStatus = await getDatabaseConfigStatus()
      setStatus(nextStatus)
      setForm(statusToForm(nextStatus))
      setFeedback({ kind: 'success', message: '数据库配置已保存' })
    } catch (error) {
      setFeedback({
        kind: 'error',
        message: getErrorMessage(error, '保存数据库配置失败'),
      })
    } finally {
      setSaving(false)
    }
  }

  const busy = loading || testing || saving

  return (
    <Modal open={open} title="数据库设置" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-500 shadow-sm">
            <Server size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {status?.configured ? '已保存数据库配置' : '尚未配置数据库'}
            </p>
            <p className="text-xs text-slate-500">
              {status?.configured
                ? `${status.username ?? ''}@${status.host ?? ''}:${status.port ?? 5432}/${status.database ?? ''}`
                : 'Desktop 端需要 PostgreSQL 连接信息才能直接访问数据'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">主机</span>
            <input
              type="text"
              value={form.host}
              disabled={loading}
              onChange={(e) => updateForm('host', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">端口</span>
            <input
              type="number"
              min={1}
              max={65535}
              value={form.port}
              disabled={loading}
              onChange={(e) => updateForm('port', Number(e.target.value) || 5432)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">数据库名</span>
            <input
              type="text"
              value={form.database}
              disabled={loading}
              onChange={(e) => updateForm('database', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">用户名</span>
            <input
              type="text"
              value={form.username}
              disabled={loading}
              onChange={(e) => updateForm('username', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">密码</span>
            <input
              type="password"
              value={form.password ?? ''}
              disabled={loading}
              placeholder={passwordPlaceholder}
              onChange={(e) => updateForm('password', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">SSL 模式</span>
            <select
              value={form.sslMode ?? 'prefer'}
              disabled={loading}
              onChange={(e) => updateForm('sslMode', e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
            >
              <option value="disable">disable</option>
              <option value="prefer">prefer</option>
              <option value="require">require</option>
            </select>
          </label>
        </div>

        {feedback && (
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${
            feedback.kind === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : feedback.kind === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
          }`}>
            {feedback.kind === 'success' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-1">
          <button
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={handleTestConnection}
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <TestTube2 size={16} />}
            <span>测试连接</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={handleSave}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>保存</span>
          </button>
        </div>
      </div>
    </Modal>
  )
}

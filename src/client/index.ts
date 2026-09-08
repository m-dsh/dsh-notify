import React from 'react'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

// ── 事件字段定义 ────────────────────────────────────────────────────────

const EVENT_FIELDS = [
  { key: 'turnCompleted', label: '回合完成通知' },
  { key: 'turnBlocked', label: '回合被阻塞通知' },
  { key: 'turnMaxTokens', label: 'Token 上限截断通知' },
  { key: 'turnAborted', label: '回合被中止通知' },
  { key: 'turnErrored', label: '回合异常终止通知' },
  { key: 'permissionAsked', label: '权限申请通知' },
  { key: 'permissionDenied', label: '权限被拒 / 取消通知' },
  { key: 'questionAsked', label: '模型提问通知 (ask_user_question)' },
] as const

type EventsConfig = Record<string, boolean>

// ── 插件导出 ────────────────────────────────────────────────────────────

export const name = 'dsh-notify-client'
export const inject = ['slots', 'settingsScope'] as const

export function apply(ctx: ClientContext): void {
  const scope = ctx.settingsScope.bind<EventsConfig>({ namespace: 'dsh-notify' })

  ctx.slots.inject('settings.section', () => {
    return ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-notify',
        order: 800,
        label: '通知设置',
        inject: () => ({ scope }),
      },
      NotifySettingsSection,
    )
  })
}

// ── 设置面板组件 ────────────────────────────────────────────────────────

interface NotifyProps {
  scope: SettingsScope<EventsConfig>
  close: () => void
}

const NotifySettingsSection: React.FC<Record<string, unknown>> = function NotifySettingsSection(props) {
  const scope = (props as unknown as NotifyProps).scope
  const [snap, setSnap] = React.useState<SettingsScopeSnapshot<EventsConfig>>(
    () => scope.getSnapshot(),
  )

  React.useEffect(() => {
    return scope.subscribe(() => setSnap(scope.getSnapshot()))
  }, [scope])

  const values = (snap.value ?? {}) as EventsConfig
  const writable = snap.writable && snap.status === 'ready'

  if (snap.status === 'loading') {
    return React.createElement('div', { style: { padding: 16, color: 'var(--dsw-alias-label-secondary)' } }, '加载中…')
  }

  if (snap.status === 'unavailable') {
    return React.createElement('div', { style: { padding: 16, color: 'var(--dsw-alias-label-secondary)' } }, '通知设置暂不可用（请确认 DSH 配置中已启用 dsh-notify 插件）')
  }

  return React.createElement(
    'div',
    { style: { display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0' } },
    ...EVENT_FIELDS.map(({ key, label }) => {
      const checked = values[key] === true
      return React.createElement(
        'label',
        {
          key,
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            cursor: writable ? 'pointer' : 'not-allowed',
            opacity: writable ? 1 : 0.5,
            borderRadius: 8,
            transition: 'background 0.12s',
          },
          onMouseEnter: writable
            ? (e: React.MouseEvent<HTMLLabelElement>) => {
                ;(e.currentTarget as HTMLLabelElement).style.background = 'var(--dsw-alias-bg-layer-2)'
              }
            : undefined,
          onMouseLeave: writable
            ? (e: React.MouseEvent<HTMLLabelElement>) => {
                ;(e.currentTarget as HTMLLabelElement).style.background = ''
              }
            : undefined,
        },
        React.createElement(
          'span',
          { style: { fontSize: 14, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } },
          label,
        ),
        React.createElement(ToggleSwitch, {
          checked,
          disabled: !writable,
          onChange: () => scope.set(key, !checked),
        }),
      )
    }),
  )
}

// ── 切换开关组件 ────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  onChange: () => void
}): React.ReactElement {
  return React.createElement(
    'button',
    {
      role: 'switch',
      'aria-checked': checked,
      disabled,
      onClick: onChange,
      style: {
        border: checked
          ? '1px solid var(--dsw-alias-brand-primary, #2b7cd9)'
          : '1px solid var(--dsw-alias-border-l3, #cbd5e1)',
        background: checked
          ? 'var(--dsw-alias-brand-primary, #2b7cd9)'
          : 'var(--dsw-alias-bg-layer-3, #e2e8f0)',
        cursor: 'pointer',
        borderRadius: 999,
        flexShrink: 0,
        alignItems: 'center',
        width: 40,
        height: 22,
        padding: 2,
        transition: 'background .12s, border-color .12s',
        display: 'inline-flex',
        position: 'relative',
      },
    },
    React.createElement('span', {
      style: {
        background: 'var(--dsw-alias-label-primary-foreground, #fff)',
        width: 18,
        height: 18,
        boxShadow: '0 0 0 1px var(--dsw-alias-border-l4, #0f172a1f)',
        borderRadius: '50%',
        transition: 'transform .12s',
        display: 'block',
        transform: checked ? 'translate(18px)' : 'translate(0)',
      },
    }),
  )
}

// ── 客户端上下文类型 ──────────────────────────────────────────────────────

interface ClientContext {
  slots: {
    inject(key: string, factory: () => unknown): () => void
    register(
      opts: {
        name: string
        id: string
        order?: number
        label?: string
        inject?: () => Record<string, unknown>
      },
      comp: React.FC<Record<string, unknown>>,
    ): () => void
  }
  settingsScope: {
    bind<T>(spec: { namespace: string }): SettingsScope<T>
  }
}
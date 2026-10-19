import React from 'react'
import type { ConfigForm, ConfigFormSnapshot } from '@deepseek-ai/dsh-client-ui-settings/client'

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

interface NotifyConfig {
  events: EventsConfig
}

// ── 设置卡片样式（对齐 dsh-web-search 设置卡片）─────────────────────────

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  border: '1px solid var(--dsw-alias-border-l2)',
  borderRadius: 12,
  background: 'var(--dsw-alias-bg-layer-3)',
  overflow: 'hidden',
  padding: '4px 0',
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--dsw-alias-label-secondary)',
  padding: '8px 16px 4px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
} as React.CSSProperties

const switchCss = [
  '.dsh_notify_card .dsh_notify_toggle{box-sizing:border-box;appearance:none;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;margin:0;border:0;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l3);cursor:pointer}',
  '.dsh_notify_card .dsh_notify_toggle[aria-checked=true]{background:var(--dsw-alias-brand-primary)}',
  '.dsh_notify_card .dsh_notify_toggle:disabled{cursor:default;opacity:.5}',
  '.dsh_notify_card .dsh_notify_toggle:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}',
  '.dsh_notify_card .dsh_notify_thumb{display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-label-primary-foreground);transition:transform 120ms ease}',
  '.dsh_notify_card .dsh_notify_toggle[aria-checked=false] .dsh_notify_thumb{background:var(--dsw-alias-switch-thumb)}',
  '.dsh_notify_card .dsh_notify_toggle[aria-checked=true] .dsh_notify_thumb{transform:translateX(16px)}',
].join('')

// ── 插件导出 ────────────────────────────────────────────────────────────

export const name = 'dsh-notify-client'
export const inject = ['slots', 'configForms'] as const

export function apply(ctx: ClientContext): void {
  const scope = ctx.configForms.get<NotifyConfig>('dsh-notify')

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
  scope: ConfigForm<NotifyConfig>
  close: () => void
}

const NotifySettingsSection: React.FC<Record<string, unknown>> = function NotifySettingsSection(props) {
  const scope = (props as unknown as NotifyProps).scope
  const [snap, setSnap] = React.useState<ConfigFormSnapshot<NotifyConfig>>(
    () => scope.getSnapshot(),
  )

  React.useEffect(() => {
    return scope.subscribe(() => setSnap(scope.getSnapshot()))
  }, [scope])

  const values = snap.value?.events ?? {}
  const writable = snap.writable && snap.status === 'ready'

  if (snap.status === 'loading') {
    return React.createElement('div', { style: { padding: 16, color: 'var(--dsw-alias-label-secondary)' } }, '加载中…')
  }

  if (snap.status === 'unavailable') {
    return React.createElement('div', { style: { padding: 16, color: 'var(--dsw-alias-label-secondary)' } }, '通知设置暂不可用（请确认 DSH 配置中已启用 dsh-notify 插件）')
  }

  return React.createElement(
    'div',
    { className: 'dsh_notify_card', style: cardStyle },
    React.createElement('style', null, switchCss),
    React.createElement('div', { style: sectionTitleStyle }, '通知事件'),
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
          label,
          onChange: () => scope.set('events', { ...values, [key]: !checked }),
        }),
      )
    }),
  )
}

// ── 切换开关组件 ────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  label: string
  onChange: () => void
}): React.ReactElement {
  return React.createElement(
    'button',
    {
      type: 'button',
      role: 'switch',
      'aria-checked': checked,
      'aria-label': label,
      disabled,
      onClick: onChange,
      className: 'dsh_notify_toggle',
    },
    React.createElement('span', {
      className: 'dsh_notify_thumb',
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
  configForms: {
    get<T>(entryId: string): ConfigForm<T>
  }
}

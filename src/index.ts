/**
 * dsh-notify — macOS 桌面通知插件。
 *
 * 监听 DSH session 事件，在 Agent 回合完成或权限申请时通过系统通知提醒。
 * 优先使用 terminal-notifier，未安装时降级到 osascript。
 *
 * 仅支持 macOS。
 */

import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { spawnSync } from 'node:child_process'
import { basename, dirname, join } from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// 声明 DSH 内置事件类型，避免 TS 报错
declare module '@deepseek-ai/cordis' {
  interface Events {
    'session/event': (
      session: { header?: { cwd?: string } },
      event: { type: string; data?: Record<string, unknown> },
    ) => void
  }
}

export const name = 'dsh-notify'

export interface TurnEventsConfig {
  /** 回合正常完成 */
  turnCompleted: boolean
  /** 回合被阻塞 */
  turnBlocked: boolean
  /** 输出达 token 上限被截断 */
  turnMaxTokens: boolean
  /** 回合被中止 */
  turnAborted: boolean
  /** 回合异常终止 */
  turnErrored: boolean
  /** 权限申请（等待确认） */
  permissionAsked: boolean
  /** 权限被拒 / 取消 / 不可用 */
  permissionDenied: boolean
}

export interface Config {
  /** 是否启用通知，默认 true */
  enabled: boolean
  /** 回合完成通知音效 */
  soundComplete: string
  /** 权限申请通知音效 */
  soundPermission: string
  /** terminal-notifier 绝对路径（留空自动查找） */
  notifierPath: string
  /** 通知图标路径（留空使用内置 DSH 图标） */
  iconPath: string
  /** 点击通知时激活的应用 bundle ID（留空自动检测终端；'none' 禁用） */
  activate: string
  /** 每类通知的开关，默认全开 */
  events: TurnEventsConfig
}

const ALL_EVENTS_DEFAULT: TurnEventsConfig = {
  turnCompleted: true,
  turnBlocked: true,
  turnMaxTokens: true,
  turnAborted: true,
  turnErrored: true,
  permissionAsked: true,
  permissionDenied: true,
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().default(true),
  soundComplete: Schema.string().default('Glass'),
  soundPermission: Schema.string().default('Submarine'),
  notifierPath: Schema.string().default(''),
  iconPath: Schema.string().default(''),
  activate: Schema.string().default(''),
  events: Schema.object({
    turnCompleted: Schema.boolean().default(true),
    turnBlocked: Schema.boolean().default(true),
    turnMaxTokens: Schema.boolean().default(true),
    turnAborted: Schema.boolean().default(true),
    turnErrored: Schema.boolean().default(true),
    permissionAsked: Schema.boolean().default(true),
    permissionDenied: Schema.boolean().default(true),
  }).default(ALL_EVENTS_DEFAULT),
})

// ── 图标解析 ──────────────────────────────────────────────────────────

/** 解析插件自带的 assets/dsh.png 绝对路径 */
function builtinIconPath(): string {
  try {
    const moduleDir = dirname(fileURLToPath(import.meta.url))
    // lib/index.js → 上级是包根目录
    const candidate = join(moduleDir, '..', 'assets', 'dsh.png')
    return existsSync(candidate) ? candidate : ''
  } catch {
    return ''
  }
}

/** 解析最终使用的通知图标路径 */
function resolveIconPath(configPath: string): string {
  if (configPath) return configPath
  return builtinIconPath()
}

// ── 终端激活 ──────────────────────────────────────────────────────────

/** 已知终端应用的 Bundle ID 映射，用于点击通知时激活终端 */
const TERMINAL_BUNDLE_IDS: Record<string, string> = {
  'Apple_Terminal': 'com.apple.Terminal',
  'iTerm.app': 'com.googlecode.iterm2',
  'iTerm2': 'com.googlecode.iterm2',
  'vscode': 'com.microsoft.VSCode',
  'WarpTerminal': 'dev.warp.Warp-Stable',
  'cursor': 'com.todesktop.230313mzl4w4u92',
  'ghostty': 'com.mitchellh.ghostty',
}

/** 自动检测当前终端应用的 Bundle ID */
function detectTerminalBundleId(): string | null {
  const termProgram = process.env.TERM_PROGRAM
  if (termProgram && TERMINAL_BUNDLE_IDS[termProgram]) {
    return TERMINAL_BUNDLE_IDS[termProgram]
  }
  return null
}

/** 解析点击通知时要激活的应用 Bundle ID */
function resolveActivate(configActivate: string): string | null {
  if (configActivate === 'none') return null
  if (configActivate) return configActivate
  return detectTerminalBundleId()
}

// ── 通知发送器 ────────────────────────────────────────────────────────

interface NotificationContent {
  title: string
  subtitle: string
  message: string
  sound: string
  group: string
  permissionGroup: string
}

function findTerminalNotifier(configPath: string): string | null {
  if (configPath) {
    try {
      const result = spawnSync(configPath, ['-version'], { timeout: 2000 })
      if (result.status === 0) return configPath
    } catch {
      // 配置路径不可执行
    }
    return null
  }

  // 自动查找
  const candidates = [
    '/opt/homebrew/bin/terminal-notifier',
    '/usr/local/bin/terminal-notifier',
  ]
  for (const candidate of candidates) {
    try {
      const result = spawnSync(candidate, ['-version'], { timeout: 2000 })
      if (result.status === 0) return candidate
    } catch {
      continue
    }
  }
  return null
}

function projectName(cwd: string): string {
  try {
    return basename(cwd) || cwd
  } catch {
    return cwd
  }
}

function compactText(value: unknown, limit = 180): string {
  if (typeof value !== 'string') return ''
  const text = value.replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return text.slice(0, limit - 1).trimEnd() + '…'
}

function projectHashOf(cwd: string): string {
  return createHash('sha256')
    .update(cwd)
    .digest('hex')
    .slice(0, 16)
}

/** turn/end 事件的 reason 结构 */
interface TurnEndReason {
  kind?: string
  reason?: unknown
  error?: { message?: unknown }
}

function turnReasonOf(data: Record<string, unknown>): TurnEndReason | undefined {
  return (data.reason as TurnEndReason | undefined) ?? undefined
}

function abortMessage(data: Record<string, unknown>): string {
  const reason = turnReasonOf(data)?.reason
  if (typeof reason === 'string' && reason.trim()) return compactText(reason, 120)
  if (reason && typeof (reason as { message?: unknown })?.message === 'string' && (reason as { message: string }).message.trim()) {
    return compactText((reason as { message: string }).message, 120)
  }
  return '回合已被中止'
}

function errorMessage(data: Record<string, unknown>): string {
  const failure = turnReasonOf(data)?.error
  const message = failure && typeof failure.message === 'string' && failure.message.trim() ? failure.message : ''
  if (message) return compactText(`发生异常：${message}`, 160)
  return '发生异常，回合终止'
}

function buildTurnNotification(
  kind: string,
  data: Record<string, unknown>,
  cwd: string,
  config: Config,
): NotificationContent {
  const project = projectName(cwd)
  const projectHash = projectHashOf(cwd)
  const group = `dsh-notify:${projectHash}:complete`
  const base = { subtitle: project, group, permissionGroup: `dsh-notify:${projectHash}:permission` }
  switch (kind) {
    case 'blocked':
      return { ...base, title: 'DSH·回合被阻塞', message: '回合被阻塞，等待继续', sound: config.soundComplete }
    case 'max-tokens':
      return { ...base, title: 'DSH·回复被截断', message: '输出达到 token 上限，回复被截断', sound: config.soundComplete }
    case 'aborted':
      return { ...base, title: 'DSH·回复已中止', message: abortMessage(data), sound: config.soundComplete }
    case 'error':
      return { ...base, title: 'DSH·回复异常终止', message: errorMessage(data), sound: config.soundComplete }
    default:
      return { ...base, title: 'DSH·回复完成', message: '当前回合已结束', sound: config.soundComplete }
  }
}

function buildPermissionNotification(
  kind: 'asked' | 'rejected' | 'cancelled' | 'unavailable',
  data: Record<string, unknown>,
  cwd: string,
  config: Config,
): NotificationContent {
  const project = projectName(cwd)
  const projectHash = projectHashOf(cwd)
  const group = `dsh-notify:${projectHash}:permission`
  const base = { title: 'DSH·需要授权', sound: config.soundPermission, group, permissionGroup: group }
  switch (kind) {
    case 'asked': {
      const toolName = compactText(data.toolName, 60) || '未知工具'
      return { ...base, subtitle: project, message: `${toolName} 正在等待你的确认` }
    }
    case 'rejected':
      return { ...base, title: 'DSH·权限被拒绝', subtitle: project, message: '权限请求已被拒绝' }
    case 'cancelled':
      return { ...base, title: 'DSH·授权已取消', subtitle: project, message: '授权请求已取消' }
    case 'unavailable':
      return { ...base, title: 'DSH·权限不可用', subtitle: project, message: '当前权限策略无法批准该请求（如策略 never（' }
  }
}

function shouldNotifyTurn(kind: string, events: TurnEventsConfig): boolean {
  switch (kind) {
    case 'completed': return events.turnCompleted
    case 'blocked': return events.turnBlocked
    case 'max-tokens': return events.turnMaxTokens
    case 'aborted': return events.turnAborted
    case 'error': return events.turnErrored
    default: return events.turnErrored
  }
}

function sendWithTerminalNotifier(
  notifier: string,
  content: NotificationContent,
  icon?: string,
  activate?: string | null,
): boolean {
  const args = [
    '-title', content.title,
    '-subtitle', content.subtitle,
    '-message', content.message,
    '-sound', content.sound,
    '-group', content.group,
  ]
  if (icon) {
    args.push('-appIcon', icon, '-contentImage', icon)
  }
  if (activate) {
    args.push('-activate', activate)
  }
  try {
    const result = spawnSync(notifier, args, {
      timeout: 5000,
      stdio: 'ignore',
    })
    return result.status === 0
  } catch {
    return false
  }
}

function sendWithOsascript(content: NotificationContent): boolean {
  const script = `
on run argv
  set messageText to item 1 of argv
  set titleText to item 2 of argv
  set subtitleText to item 3 of argv
  set soundName to item 4 of argv
  display notification messageText with title titleText subtitle subtitleText sound name soundName
end run
`
  try {
    const result = spawnSync(
      '/usr/bin/osascript',
      ['-e', script, content.message, content.title, content.subtitle, content.sound],
      { timeout: 5000, stdio: 'ignore' },
    )
    return result.status === 0
  } catch {
    return false
  }
}

function sendNotification(
  notifier: string | null,
  content: NotificationContent,
  isPermission: boolean,
  icon: string,
  activate: string | null,
): void {
  if (notifier) {
    // 回合完成时清除同项目的权限通知
    if (!isPermission) {
      spawnSync(notifier, ['-remove', content.permissionGroup], {
        timeout: 3000,
        stdio: 'ignore',
      })
    }
    if (sendWithTerminalNotifier(notifier, content, icon, activate)) return
  }
  // 降级到 osascript
  sendWithOsascript(content)
}

// ── DSH 插件入口 ──────────────────────────────────────────────────────

export function apply(ctx: Context, config: Config): void {
  if (process.platform !== 'darwin') {
    // 仅在 macOS 上启用通知
    return
  }

  if (!config.enabled) return

  const notifier = findTerminalNotifier(config.notifierPath)
  const icon = resolveIconPath(config.iconPath)
  const activate = resolveActivate(config.activate)
  const events = config.events ?? ALL_EVENTS_DEFAULT

  // 监听所有 session 事件
  ctx.on('session/event', (session, event) => {
    const eventType = event.type
    const data = (event.data ?? {}) as Record<string, unknown>
    if (!eventType) return

    const cwd: string = session.header?.cwd ?? process.cwd()

    try {
      if (eventType === 'turn/end') {
        const kind = turnReasonOf(data)?.kind ?? 'completed'
        if (!shouldNotifyTurn(kind, events)) return
        const content = buildTurnNotification(kind, data, cwd, config)

        sendNotification(notifier, content, false, icon, activate)
        return
      }

      if (eventType === 'approval/asked') {
        if (!events.permissionAsked) return
        const content = buildPermissionNotification('asked', data, cwd, config)
        sendNotification(notifier, content, true, icon, activate)
        return
      }

      if (eventType === 'approval/decided') {
        const outcome = typeof data.outcome === 'string' ? data.outcome : ''
        const kind: 'rejected' | 'cancelled' | 'unavailable' | null =
          outcome === 'rejected' ? 'rejected' :
          outcome === 'cancelled' ? 'cancelled' :
          outcome === 'unavailable' ? 'unavailable' : null
        if (!kind || !events.permissionDenied) return
        const content = buildPermissionNotification(kind, data, cwd, config)
        sendNotification(notifier, content, true, icon, activate)
        return
      }
    } catch (err) {
      // 静默失败，不影响 DSH 正常运行
      console.error('[dsh-notify] 发送通知失败:', err)
    }
  })
}

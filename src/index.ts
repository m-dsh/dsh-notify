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
}

export const Config: Schema<Config> = Schema.object({
  enabled: Schema.boolean().default(true),
  soundComplete: Schema.string().default('Glass'),
  soundPermission: Schema.string().default('Submarine'),
  notifierPath: Schema.string().default(''),
  iconPath: Schema.string().default(''),
  activate: Schema.string().default(''),
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

function buildNotification(
  eventType: string,
  eventData: Record<string, unknown>,
  cwd: string,
  config: Config,
): NotificationContent {
  const project = projectName(cwd)
  const projectHash = createHash('sha256')
    .update(cwd)
    .digest('hex')
    .slice(0, 16)

  if (eventType === 'approval/asked') {
    const toolName = compactText(eventData.toolName, 60) || '未知工具'
    return {
      title: 'DSH · 需要授权',
      subtitle: project,
      message: `${toolName} 正在等待你的确认`,
      sound: config.soundPermission,
      group: `dsh-notify:${projectHash}:permission`,
      permissionGroup: `dsh-notify:${projectHash}:permission`,
    }
  }

  // turn/end — 回合完成
  return {
    title: 'DSH · 回复完成',
    subtitle: project,
    message: '当前回合已结束',
    sound: config.soundComplete,
    group: `dsh-notify:${projectHash}:complete`,
    permissionGroup: `dsh-notify:${projectHash}:permission`,
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

  // 监听所有 session 事件
  ctx.on('session/event', (session, event) => {
    const eventType = event.type
    if (!eventType) return

    // 回合完成：turn/end
    // 权限申请：approval/asked
    if (eventType !== 'turn/end' && eventType !== 'approval/asked') return

    const cwd: string = session.header?.cwd ?? process.cwd()

    try {
      const content = buildNotification(
        eventType,
        event.data ?? {},
        cwd,
        config,
      )
      sendNotification(notifier, content, eventType === 'approval/asked', icon, activate)
    } catch (err) {
      // 静默失败，不影响 DSH 正常运行
      console.error('[dsh-notify] 发送通知失败:', err)
    }
  })
}
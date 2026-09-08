import Schema from "@deepseek-ai/schemastery";
import * as _deepseek_ai_dsh_settings0 from "@deepseek-ai/dsh-settings";
import { Context } from "@deepseek-ai/cordis";

//#region src/index.d.ts

declare module '@deepseek-ai/cordis' {
  interface Events {
    'session/event': (session: {
      header?: {
        cwd?: string;
      };
    }, event: {
      type: string;
      data?: Record<string, unknown>;
    }) => void;
  }
}
declare const name = "dsh-notify";
declare const inject: string[];
interface TurnEventsConfig {
  /** 回合正常完成 */
  turnCompleted: boolean;
  /** 回合被阻塞 */
  turnBlocked: boolean;
  /** 输出达 token 上限被截断 */
  turnMaxTokens: boolean;
  /** 回合被中止 */
  turnAborted: boolean;
  /** 回合异常终止 */
  turnErrored: boolean;
  /** 权限申请（等待确认） */
  permissionAsked: boolean;
  /** 权限被拒 / 取消 / 不可用 */
  permissionDenied: boolean;
  /** 模型提问（ask_user_question） */
  questionAsked: boolean;
}
interface Config {
  /** 是否启用通知，默认 true */
  enabled: boolean;
  /** 回合完成通知音效 */
  soundComplete: string;
  /** 权限申请通知音效 */
  soundPermission: string;
  /** terminal-notifier 绝对路径（留空自动查找） */
  notifierPath: string;
  /** 通知图标路径（留空使用内置 DSH 图标） */
  iconPath: string;
  /** 点击通知时激活的应用 bundle ID（留空自动检测终端；'none' 禁用） */
  activate: string;
  /** 每类通知的开关，默认全开 */
  events: TurnEventsConfig;
}
/** 通知事件字段的 Settings 命名空间 */
declare const NOTIFY_SETTINGS_NS: _deepseek_ai_dsh_settings0.SettingsNamespace;
declare const Config: Schema<Config>;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, NOTIFY_SETTINGS_NS, TurnEventsConfig, apply, inject, name };
/**
 * dsh-notify — macOS 桌面通知插件。
 *
 * 监听 DSH session 事件，在 Agent 回合完成或权限申请时通过系统通知提醒。
 * 优先使用 terminal-notifier，未安装时降级到 osascript。
 *
 * 仅支持 macOS。
 */
import type { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
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
export declare const name = "dsh-notify";
export interface TurnEventsConfig {
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
}
export interface Config {
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
export declare const Config: Schema<Config>;
export declare function apply(ctx: Context, config: Config): void;

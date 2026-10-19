import Schema from "@deepseek-ai/schemastery";
import { Context, Volatile } from "@deepseek-ai/cordis";

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
  events: Volatile<TurnEventsConfig>;
}
declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
  enabled: Schema<boolean, boolean, "defined">;
  soundComplete: Schema<string, string, "defined">;
  soundPermission: Schema<string, string, "defined">;
  notifierPath: Schema<string, string, "defined">;
  iconPath: Schema<string, string, "defined">;
  activate: Schema<string, string, "defined">;
  events: Schema<NoInfer<Schemastery.ObjectS<NoInfer<{
    turnCompleted: Schema<boolean, boolean, "defined">;
    turnBlocked: Schema<boolean, boolean, "defined">;
    turnMaxTokens: Schema<boolean, boolean, "defined">;
    turnAborted: Schema<boolean, boolean, "defined">;
    turnErrored: Schema<boolean, boolean, "defined">;
    permissionAsked: Schema<boolean, boolean, "defined">;
    permissionDenied: Schema<boolean, boolean, "defined">;
    questionAsked: Schema<boolean, boolean, "defined">;
  }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
    turnCompleted: Schema<boolean, boolean, "defined">;
    turnBlocked: Schema<boolean, boolean, "defined">;
    turnMaxTokens: Schema<boolean, boolean, "defined">;
    turnAborted: Schema<boolean, boolean, "defined">;
    turnErrored: Schema<boolean, boolean, "defined">;
    permissionAsked: Schema<boolean, boolean, "defined">;
    permissionDenied: Schema<boolean, boolean, "defined">;
    questionAsked: Schema<boolean, boolean, "defined">;
  }>>>, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
  enabled: Schema<boolean, boolean, "defined">;
  soundComplete: Schema<string, string, "defined">;
  soundPermission: Schema<string, string, "defined">;
  notifierPath: Schema<string, string, "defined">;
  iconPath: Schema<string, string, "defined">;
  activate: Schema<string, string, "defined">;
  events: Schema<NoInfer<Schemastery.ObjectS<NoInfer<{
    turnCompleted: Schema<boolean, boolean, "defined">;
    turnBlocked: Schema<boolean, boolean, "defined">;
    turnMaxTokens: Schema<boolean, boolean, "defined">;
    turnAborted: Schema<boolean, boolean, "defined">;
    turnErrored: Schema<boolean, boolean, "defined">;
    permissionAsked: Schema<boolean, boolean, "defined">;
    permissionDenied: Schema<boolean, boolean, "defined">;
    questionAsked: Schema<boolean, boolean, "defined">;
  }>>>, NoInfer<Schemastery.ObjectT<NoInfer<{
    turnCompleted: Schema<boolean, boolean, "defined">;
    turnBlocked: Schema<boolean, boolean, "defined">;
    turnMaxTokens: Schema<boolean, boolean, "defined">;
    turnAborted: Schema<boolean, boolean, "defined">;
    turnErrored: Schema<boolean, boolean, "defined">;
    permissionAsked: Schema<boolean, boolean, "defined">;
    permissionDenied: Schema<boolean, boolean, "defined">;
    questionAsked: Schema<boolean, boolean, "defined">;
  }>>>, "volatile-defined">;
}>>, "plain">;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, TurnEventsConfig, apply, name };
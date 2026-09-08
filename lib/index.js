import Schema from "@deepseek-ai/schemastery";
import { spawnSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";

//#region src/index.ts
const name = "dsh-notify";
const inject = ["settings"];
const ALL_EVENTS_DEFAULT = {
	turnCompleted: true,
	turnBlocked: true,
	turnMaxTokens: true,
	turnAborted: true,
	turnErrored: true,
	permissionAsked: true,
	permissionDenied: true,
	questionAsked: true
};
/** 通知事件字段的 Settings 命名空间 */
const NOTIFY_SETTINGS_NS = settingsNamespace("dsh-notify");
/** Settings 注册用的 events schema（独立于 Config，供 settings scope 读写） */
const EVENTS_SETTINGS_SCHEMA = Schema.object({
	turnCompleted: Schema.boolean().default(true),
	turnBlocked: Schema.boolean().default(true),
	turnMaxTokens: Schema.boolean().default(true),
	turnAborted: Schema.boolean().default(true),
	turnErrored: Schema.boolean().default(true),
	permissionAsked: Schema.boolean().default(true),
	permissionDenied: Schema.boolean().default(true),
	questionAsked: Schema.boolean().default(true)
});
const Config = Schema.object({
	enabled: Schema.boolean().default(true),
	soundComplete: Schema.string().default("Glass"),
	soundPermission: Schema.string().default("Submarine"),
	notifierPath: Schema.string().default(""),
	iconPath: Schema.string().default(""),
	activate: Schema.string().default(""),
	events: Schema.object({
		turnCompleted: Schema.boolean().default(true),
		turnBlocked: Schema.boolean().default(true),
		turnMaxTokens: Schema.boolean().default(true),
		turnAborted: Schema.boolean().default(true),
		turnErrored: Schema.boolean().default(true),
		permissionAsked: Schema.boolean().default(true),
		permissionDenied: Schema.boolean().default(true),
		questionAsked: Schema.boolean().default(true)
	}).default(ALL_EVENTS_DEFAULT)
});
/** 解析插件自带的 assets/dsh.png 绝对路径 */
function builtinIconPath() {
	try {
		const candidate = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "dsh.png");
		return existsSync(candidate) ? candidate : "";
	} catch {
		return "";
	}
}
/** 解析最终使用的通知图标路径 */
function resolveIconPath(configPath) {
	if (configPath) return configPath;
	return builtinIconPath();
}
/** 已知终端应用的 Bundle ID 映射，用于点击通知时激活终端 */
const TERMINAL_BUNDLE_IDS = {
	"Apple_Terminal": "com.apple.Terminal",
	"iTerm.app": "com.googlecode.iterm2",
	"iTerm2": "com.googlecode.iterm2",
	"vscode": "com.microsoft.VSCode",
	"WarpTerminal": "dev.warp.Warp-Stable",
	"cursor": "com.todesktop.230313mzl4w4u92",
	"ghostty": "com.mitchellh.ghostty"
};
/** 自动检测当前终端应用的 Bundle ID */
function detectTerminalBundleId() {
	const termProgram = process.env.TERM_PROGRAM;
	if (termProgram && TERMINAL_BUNDLE_IDS[termProgram]) return TERMINAL_BUNDLE_IDS[termProgram];
	return null;
}
/** 解析点击通知时要激活的应用 Bundle ID */
function resolveActivate(configActivate) {
	if (configActivate === "none") return null;
	if (configActivate) return configActivate;
	return detectTerminalBundleId();
}
function findTerminalNotifier(configPath) {
	if (configPath) {
		try {
			if (spawnSync(configPath, ["-version"], { timeout: 2e3 }).status === 0) return configPath;
		} catch {}
		return null;
	}
	for (const candidate of ["/opt/homebrew/bin/terminal-notifier", "/usr/local/bin/terminal-notifier"]) try {
		if (spawnSync(candidate, ["-version"], { timeout: 2e3 }).status === 0) return candidate;
	} catch {
		continue;
	}
	return null;
}
function projectName(cwd) {
	try {
		return basename(cwd) || cwd;
	} catch {
		return cwd;
	}
}
function compactText(value, limit = 180) {
	if (typeof value !== "string") return "";
	const text = value.replace(/\s+/g, " ").trim();
	if (text.length <= limit) return text;
	return text.slice(0, limit - 1).trimEnd() + "…";
}
function projectHashOf(cwd) {
	return createHash("sha256").update(cwd).digest("hex").slice(0, 16);
}
function turnReasonOf(data) {
	return data.reason ?? void 0;
}
function abortMessage(data) {
	const reason = turnReasonOf(data)?.reason;
	if (typeof reason === "string" && reason.trim()) return compactText(reason, 120);
	if (reason && typeof reason?.message === "string" && reason.message.trim()) return compactText(reason.message, 120);
	return "回合已被中止";
}
function errorMessage(data) {
	const failure = turnReasonOf(data)?.error;
	const message = failure && typeof failure.message === "string" && failure.message.trim() ? failure.message : "";
	if (message) return compactText(`发生异常：${message}`, 160);
	return "发生异常，回合终止";
}
function buildTurnNotification(kind, data, cwd, config) {
	const project = projectName(cwd);
	const projectHash = projectHashOf(cwd);
	const base = {
		subtitle: project,
		group: `dsh-notify:${projectHash}:complete`,
		permissionGroup: `dsh-notify:${projectHash}:permission`
	};
	switch (kind) {
		case "blocked": return {
			...base,
			title: "DSH·回合被阻塞",
			message: "回合被阻塞，等待继续",
			sound: config.soundComplete
		};
		case "max-tokens": return {
			...base,
			title: "DSH·回复被截断",
			message: "输出达到 token 上限，回复被截断",
			sound: config.soundComplete
		};
		case "aborted": return {
			...base,
			title: "DSH·回复已中止",
			message: abortMessage(data),
			sound: config.soundComplete
		};
		case "error": return {
			...base,
			title: "DSH·回复异常终止",
			message: errorMessage(data),
			sound: config.soundComplete
		};
		default: return {
			...base,
			title: "DSH·回复完成",
			message: "当前回合已结束",
			sound: config.soundComplete
		};
	}
}
function buildPermissionNotification(kind, data, cwd, config) {
	const project = projectName(cwd);
	const group = `dsh-notify:${projectHashOf(cwd)}:permission`;
	const base = {
		title: "DSH·需要授权",
		sound: config.soundPermission,
		group,
		permissionGroup: group
	};
	switch (kind) {
		case "asked": {
			const toolName = compactText(data.toolName, 60) || "未知工具";
			return {
				...base,
				subtitle: project,
				message: `${toolName} 正在等待你的确认`
			};
		}
		case "rejected": return {
			...base,
			title: "DSH·权限被拒绝",
			subtitle: project,
			message: "权限请求已被拒绝"
		};
		case "cancelled": return {
			...base,
			title: "DSH·授权已取消",
			subtitle: project,
			message: "授权请求已取消"
		};
		case "unavailable": return {
			...base,
			title: "DSH·权限不可用",
			subtitle: project,
			message: "当前权限策略无法批准该请求（如策略 never（"
		};
	}
}
function shouldNotifyTurn(kind, events) {
	switch (kind) {
		case "completed": return events.turnCompleted;
		case "blocked": return events.turnBlocked;
		case "max-tokens": return events.turnMaxTokens;
		case "aborted": return events.turnAborted;
		case "error": return events.turnErrored;
		default: return events.turnErrored;
	}
}
function sendWithTerminalNotifier(notifier, content, icon, activate) {
	const args = [
		"-title",
		content.title,
		"-subtitle",
		content.subtitle,
		"-message",
		content.message,
		"-sound",
		content.sound,
		"-group",
		content.group
	];
	if (icon) args.push("-appIcon", icon, "-contentImage", icon);
	if (activate) args.push("-activate", activate);
	try {
		return spawnSync(notifier, args, {
			timeout: 5e3,
			stdio: "ignore"
		}).status === 0;
	} catch {
		return false;
	}
}
function sendWithOsascript(content) {
	const script = `
on run argv
  set messageText to item 1 of argv
  set titleText to item 2 of argv
  set subtitleText to item 3 of argv
  set soundName to item 4 of argv
  display notification messageText with title titleText subtitle subtitleText sound name soundName
end run
`;
	try {
		return spawnSync("/usr/bin/osascript", [
			"-e",
			script,
			content.message,
			content.title,
			content.subtitle,
			content.sound
		], {
			timeout: 5e3,
			stdio: "ignore"
		}).status === 0;
	} catch {
		return false;
	}
}
function sendNotification(notifier, content, isPermission, icon, activate) {
	if (notifier) {
		if (!isPermission) spawnSync(notifier, ["-remove", content.permissionGroup], {
			timeout: 3e3,
			stdio: "ignore"
		});
		if (sendWithTerminalNotifier(notifier, content, icon, activate)) return;
	}
	sendWithOsascript(content);
}
function apply(ctx, config) {
	if (process.platform !== "darwin") return;
	const eventsScope = ctx.settings.register(NOTIFY_SETTINGS_NS, EVENTS_SETTINGS_SCHEMA, {
		base: ALL_EVENTS_DEFAULT,
		applies: "live"
	});
	if (config.events) {
		const overrides = {};
		for (const key of Object.keys(ALL_EVENTS_DEFAULT)) if (config.events[key] !== void 0 && config.events[key] !== ALL_EVENTS_DEFAULT[key]) overrides[key] = config.events[key];
		if (Object.keys(overrides).length > 0) eventsScope.update(overrides);
	}
	let liveEvents = eventsScope.get();
	eventsScope.watch((next) => {
		liveEvents = next;
	});
	if (!config.enabled) return;
	const notifier = findTerminalNotifier(config.notifierPath);
	const icon = resolveIconPath(config.iconPath);
	const activate = resolveActivate(config.activate);
	ctx.on("session/event", (session, event) => {
		const eventType = event.type;
		const data = event.data ?? {};
		if (!eventType) return;
		const cwd = session.header?.cwd ?? process.cwd();
		try {
			const events = liveEvents;
			if (eventType === "tool/call" && typeof data.name === "string" && data.name === "ask_user_question") {
				if (!events.questionAsked) return;
				const project = projectName(cwd);
				const projectHash = projectHashOf(cwd);
				sendNotification(notifier, {
					title: "DSH·请回答问题",
					subtitle: project,
					message: "模型正在向你提问，请返回 DSH 查看",
					sound: config.soundPermission,
					group: `dsh-notify:${projectHash}:question`,
					permissionGroup: `dsh-notify:${projectHash}:permission`
				}, true, icon, activate);
				return;
			}
			if (eventType === "turn/end") {
				const kind = turnReasonOf(data)?.kind ?? "completed";
				if (!shouldNotifyTurn(kind, events)) return;
				sendNotification(notifier, buildTurnNotification(kind, data, cwd, config), false, icon, activate);
				return;
			}
			if (eventType === "approval/asked") {
				if (!events.permissionAsked) return;
				sendNotification(notifier, buildPermissionNotification("asked", data, cwd, config), true, icon, activate);
				return;
			}
			if (eventType === "approval/decided") {
				const outcome = typeof data.outcome === "string" ? data.outcome : "";
				const kind = outcome === "rejected" ? "rejected" : outcome === "cancelled" ? "cancelled" : outcome === "unavailable" ? "unavailable" : null;
				if (!kind || !events.permissionDenied) return;
				sendNotification(notifier, buildPermissionNotification(kind, data, cwd, config), true, icon, activate);
				return;
			}
		} catch (err) {
			console.error("[dsh-notify] 发送通知失败:", err);
		}
	});
}

//#endregion
export { Config, NOTIFY_SETTINGS_NS, apply, inject, name };
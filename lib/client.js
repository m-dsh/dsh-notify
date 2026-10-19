window.__ModuleLoader__.load({ id: "dsh-notify", factory: (require) => {
var module={exports:{}}; var exports=module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
let react = require("react");
react = __toESM(react);

//#region src/client/index.ts
const EVENT_FIELDS = [
	{
		key: "turnCompleted",
		label: "回合完成通知"
	},
	{
		key: "turnBlocked",
		label: "回合被阻塞通知"
	},
	{
		key: "turnMaxTokens",
		label: "Token 上限截断通知"
	},
	{
		key: "turnAborted",
		label: "回合被中止通知"
	},
	{
		key: "turnErrored",
		label: "回合异常终止通知"
	},
	{
		key: "permissionAsked",
		label: "权限申请通知"
	},
	{
		key: "permissionDenied",
		label: "权限被拒 / 取消通知"
	},
	{
		key: "questionAsked",
		label: "模型提问通知 (ask_user_question)"
	}
];
const cardStyle = {
	display: "flex",
	flexDirection: "column",
	gap: 2,
	border: "1px solid var(--dsw-alias-border-l2)",
	borderRadius: 12,
	background: "var(--dsw-alias-bg-layer-3)",
	overflow: "hidden",
	padding: "4px 0"
};
const sectionTitleStyle = {
	fontSize: 12,
	fontWeight: 600,
	color: "var(--dsw-alias-label-secondary)",
	padding: "8px 16px 4px",
	textTransform: "uppercase",
	letterSpacing: "0.5px"
};
const switchCss = [
	".dsh_notify_card .dsh_notify_toggle{box-sizing:border-box;appearance:none;position:relative;flex:0 0 auto;width:36px;height:20px;padding:2px;margin:0;border:0;border-radius:999px;corner-shape:round;background:var(--dsw-alias-border-l3);cursor:pointer}",
	".dsh_notify_card .dsh_notify_toggle[aria-checked=true]{background:var(--dsw-alias-brand-primary)}",
	".dsh_notify_card .dsh_notify_toggle:disabled{cursor:default;opacity:.5}",
	".dsh_notify_card .dsh_notify_toggle:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:2px}",
	".dsh_notify_card .dsh_notify_thumb{display:block;width:16px;height:16px;border-radius:50%;corner-shape:round;background:var(--dsw-alias-label-primary-foreground);transition:transform 120ms ease}",
	".dsh_notify_card .dsh_notify_toggle[aria-checked=false] .dsh_notify_thumb{background:var(--dsw-alias-switch-thumb)}",
	".dsh_notify_card .dsh_notify_toggle[aria-checked=true] .dsh_notify_thumb{transform:translateX(16px)}"
].join("");
const name = "dsh-notify-client";
const inject = ["slots", "configForms"];
function apply(ctx) {
	const scope = ctx.configForms.get("dsh-notify");
	ctx.slots.inject("settings.section", () => {
		return ctx.slots.register({
			name: "settings.section",
			id: "dsh-notify",
			order: 800,
			label: "通知设置",
			inject: () => ({ scope })
		}, NotifySettingsSection);
	});
}
const NotifySettingsSection = function NotifySettingsSection$1(props) {
	const scope = props.scope;
	const [snap, setSnap] = react.default.useState(() => scope.getSnapshot());
	react.default.useEffect(() => {
		return scope.subscribe(() => setSnap(scope.getSnapshot()));
	}, [scope]);
	const values = snap.value?.events ?? {};
	const writable = snap.writable && snap.status === "ready";
	if (snap.status === "loading") return react.default.createElement("div", { style: {
		padding: 16,
		color: "var(--dsw-alias-label-secondary)"
	} }, "加载中…");
	if (snap.status === "unavailable") return react.default.createElement("div", { style: {
		padding: 16,
		color: "var(--dsw-alias-label-secondary)"
	} }, "通知设置暂不可用（请确认 DSH 配置中已启用 dsh-notify 插件）");
	return react.default.createElement("div", {
		className: "dsh_notify_card",
		style: cardStyle
	}, react.default.createElement("style", null, switchCss), react.default.createElement("div", { style: sectionTitleStyle }, "通知事件"), ...EVENT_FIELDS.map(({ key, label }) => {
		const checked = values[key] === true;
		return react.default.createElement("label", {
			key,
			style: {
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				padding: "10px 16px",
				cursor: writable ? "pointer" : "not-allowed",
				opacity: writable ? 1 : .5,
				borderRadius: 8,
				transition: "background 0.12s"
			},
			onMouseEnter: writable ? (e) => {
				e.currentTarget.style.background = "var(--dsw-alias-bg-layer-2)";
			} : void 0,
			onMouseLeave: writable ? (e) => {
				e.currentTarget.style.background = "";
			} : void 0
		}, react.default.createElement("span", { style: {
			fontSize: 14,
			fontWeight: 500,
			color: "var(--dsw-alias-label-primary)"
		} }, label), react.default.createElement(ToggleSwitch, {
			checked,
			disabled: !writable,
			label,
			onChange: () => scope.set("events", {
				...values,
				[key]: !checked
			})
		}));
	}));
};
function ToggleSwitch({ checked, disabled, label, onChange }) {
	return react.default.createElement("button", {
		type: "button",
		role: "switch",
		"aria-checked": checked,
		"aria-label": label,
		disabled,
		onClick: onChange,
		className: "dsh_notify_toggle"
	}, react.default.createElement("span", { className: "dsh_notify_thumb" }));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
exports.name = name;
return module.exports; } });
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
	}
];
const name = "dsh-notify-client";
const inject = ["slots", "settingsScope"];
function apply(ctx) {
	const scope = ctx.settingsScope.bind({ namespace: "dsh-notify" });
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
	const values = snap.value ?? {};
	const writable = snap.writable && snap.status === "ready";
	if (snap.status === "loading") return react.default.createElement("div", { style: {
		padding: 16,
		color: "var(--dsw-alias-label-secondary)"
	} }, "加载中…");
	if (snap.status === "unavailable") return react.default.createElement("div", { style: {
		padding: 16,
		color: "var(--dsw-alias-label-secondary)"
	} }, "通知设置暂不可用（请确认 DSH 配置中已启用 dsh-notify 插件）");
	return react.default.createElement("div", { style: {
		display: "flex",
		flexDirection: "column",
		gap: 2,
		padding: "8px 0"
	} }, ...EVENT_FIELDS.map(({ key, label }) => {
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
			onChange: () => scope.set(key, !checked)
		}));
	}));
};
function ToggleSwitch({ checked, disabled, onChange }) {
	return react.default.createElement("button", {
		role: "switch",
		"aria-checked": checked,
		disabled,
		onClick: onChange,
		style: {
			border: checked ? "1px solid var(--dsw-alias-brand-primary, #2b7cd9)" : "1px solid var(--dsw-alias-border-l3, #cbd5e1)",
			background: checked ? "var(--dsw-alias-brand-primary, #2b7cd9)" : "var(--dsw-alias-bg-layer-3, #e2e8f0)",
			cursor: "pointer",
			borderRadius: 999,
			flexShrink: 0,
			alignItems: "center",
			width: 40,
			height: 22,
			padding: 2,
			transition: "background .12s, border-color .12s",
			display: "inline-flex",
			position: "relative"
		}
	}, react.default.createElement("span", { style: {
		background: "var(--dsw-alias-label-primary-foreground, #fff)",
		width: 18,
		height: 18,
		boxShadow: "0 0 0 1px var(--dsw-alias-border-l4, #0f172a1f)",
		borderRadius: "50%",
		transition: "transform .12s",
		display: "block",
		transform: checked ? "translate(18px)" : "translate(0)"
	} }));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
exports.name = name;
return module.exports; } });
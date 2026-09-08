# dsh-notify

macOS 桌面通知插件，在 DSH Agent 回合完成或权限申请时通过系统通知中心提醒。

## 效果

- **回合完成**：监听 `session/event` 中的 `turn/end` 事件
- **权限申请**：监听 `session/event` 中的 `approval/asked` 事件
- 通知按项目路径分组，新通知替换旧通知
- 优先使用 `terminal-notifier`，未安装时降级到 `osascript`

仅支持 macOS。

## 前置依赖

```bash
brew install terminal-notifier
```

未安装 `terminal-notifier` 时插件会降级到 AppleScript，但没有 `-activate` 能力，点击通知不会激活终端。

## 安装

在 DSH profile 中添加：

```yaml
plugins:
  dsh-notify:
    enabled: true
```

## 配置

| 配置项 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `enabled` | boolean | `true` | 是否启用通知 |
| `soundComplete` | string | `"Glass"` | 回合完成通知音效 |
| `soundPermission` | string | `"Submarine"` | 权限申请通知音效 |
| `notifierPath` | string | `""` | terminal-notifier 绝对路径（留空自动查找） |
| `iconPath` | string | `""` | 通知图标路径（留空使用内置 DSH 鲸鱼图标） |
| `activate` | string | `""` | 点击通知时激活应用的 Bundle ID（留空自动检测终端；`"none"` 禁用） |

## 故障排查

- **没有通知弹出**：确认 `brew list terminal-notifier` 存在
- **macOS 通知权限**：在「系统设置 → 通知 → terminal-notifier」中开启「允许通知」

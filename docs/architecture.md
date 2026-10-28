# 架构与边界

## 目录

```text
src/
  core/
    engine.ts                 生命周期、主题发现协调、设置应用
    theme-manager/            Manifest 类型与主题应用／恢复
    layout-manager/           布局变量、功能 Slot 排序
    settings/                 版本化偏好存储
    compatibility/            官方 DOM 适配与语义颜色变量映射
    injector/                 可撤除的客户端内存增强层
  features/
    usage-monitor/            真实／缓存／不可用状态、读取周期
    status-panel/             与主题无关的额度呈现
    startup-animation/        页面加载后的可跳过覆盖层
  components/                 通用图标、声明式品牌图形与文字组件
  main.ts                     独立演示管理器
  styles.css                  预览通用结构和交互样式
scripts/
  catalog.ts                  本地目录扫描、资源与 CSS 校验
  cdp.ts                      固定回环 HTTP、WebSocket 与监听绑定验证
  client.ts                   probe / apply / restore
  doctor.ps1                  显示名称、包名与启动项的只读检测
  find-client.ps1             从包 Manifest 定位程序与 App ID
  activate-client.ps1         Windows Store 应用激活接口
  test-client.ps1             等待正常退出、启动与实机验证
  serve.ts                    生产演示本地服务
  run.mjs                     编译并执行 TypeScript 工具
themes/
  default/                    简洁主题
  nerv/                       NERV 主题及其内部配色变体
tests/                        模块测试与浏览器测试
```

## 数据流

本地目录 → `discoverThemes()` → 校验后的主题目录清单 → `CoreEngine` → `ThemeManager` / 布局插槽 / 功能模块。

Manifest 声明资源位置，Tokens 定义语义化视觉值，布局定义宽度与 Slot 顺序。引擎按数据加载，不按主题名称分支。当前默认选中的主题 ID 属于初始用户偏好；删除该主题后会选择仍可用的主题，没有主题时移除增强样式。

预览与客户端都复用 `ThemeManager`、`UsageMonitor`、额度渲染和兼容适配。官方 DOM 只在适配器中识别，不把官方选择器写入主题；主题只接触稳定的 `data-cte-region` 和引擎拥有的组件。会话区分 active、suspended、disabled、blocked：设置等不支持页面只暂停附着，返回已知聊天结构后自动检查并绑定新节点；主动关闭或确认稳定的可读性失败则停止会话。不会强行修改官方节点可见性来伪造恢复。

可读性报告另有 `pending` 状态：有限、运行中的原生透明度动画按过渡帧处理，不结束或移除该动画，也不撤回主题；已知 JS 流式渐入有 2 秒宽限，避免把尚未显示的文字误判成永久故障。页面在后台时的部分透明文字等待可见后复核，恢复前台会重置渐入宽限并触发检查。前台未稳定时每 250ms 自动复查；真正故障需连续两次稳定测量失败后才关闭。启动检查会如实返回 `pending=true`、`checksPassed=false`、`compatible=true`，表示主题已启用但尚待动画后的审计。暂停、无限或静态低透明度不会获得永久豁免，动画结束后仍不可读也会触发关闭。

桌面聊天初次识别需要可见的唯一 textbox、原生 composer、导航和布局。已识别聊天的存续与输入就绪状态分离：原 main、导航、布局可见且唯一原生 composer 容器仍存在时，编辑器暂时隐藏、inert、失去 role 或被移除不会卸载主题，正文仍参与可读性审计。main 隐藏／inert、容器移除或结构歧义仍暂停；若已出现可识别的新聊天，则在 MutationObserver 回调中立即绑定。此逻辑同时覆盖节点替换和隐藏旧页、显示缓存页，避免 150ms 防抖使新页面先绘制原生配色。引擎不修改 contenteditable、隐藏状态或原生禁用，不接管提交事件。独立文档编辑器仍不会被识别为聊天输入区。

## 恢复策略

引擎只增加自有 style、aside 和 `data-cte-*` 标记。应用前记录原有属性值，撤除时恢复。不会替换官方导航、移动输入框、覆盖官方事件处理器、写入原有内联样式或访问聊天正文。

每次安装先撤除上一次增强；错误路径同样清理。路由暂停会停止额度读取、移除装饰并恢复布局，保留被动结构监听；返回聊天时沿用主题、变体与折叠状态。主动关闭或可读性失败会断开监听并清除计时器，后续路由变化不会重启主题。隐藏、inert 和 aria-hidden 的背景编辑器不参与匹配。注入脚本只在当前文档执行，不使用 `Page.addScriptToEvaluateOnNewDocument`，避免永久自动注入。窄于 1000px 的官方页面隐藏附加栏并取消预留空间，优先保留原有交互。

## 设置与数据

预览只读写自身 `localStorage` 键 `cte.settings.v1`，存储主题 ID、变体、增强开关、折叠和启动覆盖层偏好。不可访问存储时继续运行，并告知本次设置不能持久化。额度观察值仅保存在内存中，随增强层销毁而清除，不写入账号缓存。

额度观察只读取可见菜单中的单个带标签项目，不扫描整页聊天文本，不自动打开菜单、不抓取网络请求、不访问内部接口。菜单消失后保留最近读取时间并显式标为缓存；没有任何成功读取时为不可用。`observedAt` 代表本工具读取时间，不代表服务器刷新时间。

## 扩展范围

`FeatureModule` 提供最小 start / stop 生命周期，目前额度功能使用它。主题 Slot 排序是声明式区域编排，不承诺任意拖动官方控件。第一阶段不加载任意主题 JavaScript，不提供远程主题市场或原生托盘／安装器；这些可以在后续独立扩展。

主题 CSS 必须限定于 `[data-cte-root]`，拒绝所有 at-rule、远程 URL、转义 URL、兄弟选择器越界等。Manifest 的受控本地资源接口支持 SVG / PNG / WebP 和 TTF / WOFF2；路径经 realpath 校验并限制大小，二进制资源检查文件签名。SVG 仅作 image data URL 消费，拒绝脚本、事件与外链；font-face 只由引擎根据校验后的字体声明生成。品牌、示意图、图标与水印都由主题配置驱动，恢复时一起移除。这不是完整不可信 CSS 沙箱，安装主题仍应审查本地包内容。

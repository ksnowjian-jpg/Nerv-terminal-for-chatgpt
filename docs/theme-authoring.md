# 添加独立主题

不需要修改核心代码。复制 `themes/default/` 到 `themes/your-theme/`，修改 Manifest 的 `id` 与元数据，再改 Tokens、布局和可选 CSS。运行中的本地服务每次扫描都会读取磁盘；到主题库点击“重新扫描”，无须重新打包前端。

```text
themes/your-theme/
  manifest.json
  tokens.json
  layout.json
  theme.css
  assets/
```

## Manifest

真实示例见 [默认包](../themes/default/manifest.json) 和 [NERV 包](../themes/nerv/manifest.json)，完整且具约束的格式定义在 [schema.ts](../src/core/theme-manager/schema.ts)。未声明字段会被拒绝，不执行主题 JavaScript。

- `schemaVersion` 为 1，`engineVersion` 当前支持 `^0.1.0`。
- `id` 使用小写字母、数字和连字符，以字母开头，最多 48 字符；全局唯一。
- `name`、`version`、`author`、`description` 提供展示元数据。
- `tokens`、`layout` 指向本包中的 JSON。`css` 可省略。
- `assets.emblem` 可选，接受受限 SVG、PNG、WebP；资源经校验后作为本地 image data URL 消费，不嵌入可执行 HTML。
- `assets.images` 声明命名图像，`assets.icons` 声明 refresh / restore / status / brand / home 等受控动作图标。图像统一暴露为 `--cte-image-名称`；图标变量为 `--cte-image-icon-名称`。
- `assets.fonts` 声明字体 family、file、weight，支持本地 TTF / WOFF2。引擎校验文件签名后生成受控 font-face，不向系统安装字体，也不请求外部字体服务。
- `presentation` 可声明品牌文案、图像示意图、低透明度水印和页脚。布局与业务由通用组件管理，不需要主题 JavaScript。
- `presentation.brandImage` 可指定 `assets.images` 中的独立品牌图片，以原始色彩显示；省略时沿用 `assets.emblem` 单色遮罩。侧栏的 `navigationBadge.image` 可使用另一张图，因此左右不必重复同一 Logo。
- `presentation.brandWordmark` 可指定独立的图形字标，用图片替代普通 `brandLabel` 文本；`brandLabel` 此时作为替代文字，未声明图形字标时仍使用文字回退。资源必须出现在 images 中，加载验证会检查图像解码，缺失资源会拒绝该主题。路径化 SVG 可避免系统字体不同造成品牌字样变化。
- 只声明 brandWordmark、不声明 brandImage 时，品牌区按整幅字标展示，不再回退添加 emblem。声明两者时仍可使用图标与字标组合，尺寸由主题 CSS 控制。
- `presentation.panelText` 可覆盖面板标题、刷新／恢复／折叠按钮、读取状态、时间标签和说明等受控文案键。未提供的键使用中性默认文案；未知键会被拒绝。全部以纯文本写入，不能注入 HTML；真实百分比、缓存时间、错误原因和数据来源仍由功能模块提供。NERV 的“能量”只是官方额度的主题化名称。
- `presentation.welcomeText` 可替换新对话首页的固定欢迎语（1–80 字符），`welcomeCaption` 可提供下方的辅助小字（1–100 字符）。当前适配观察到的 `.home-composer-anchor .heading-xl`，不依赖会随路由变化的随机默认文案；候选必须是非空、短文本、无交互控件的唯一首页标题，排除消息、编辑器、独立文档和文件预览。结构不匹配或候选有歧义时跳过。保留原生文字节点，用独立纯文本元素显示主题文案，切换页面时重新绑定，退出主题时恢复原文。NERV 当前为“系统已就绪，等待指令。”，辅助小字为“NERV TERMINAL / SYSTEM ONLINE”。
- `presentation.composerPlaceholder` 可提供空输入框提示（1–100 字符）。只在编辑器外层 composer 容器标记空输入状态，通过转义后的 CSS 内容绘制提示，不向 ProseMirror 内部节点写入任何属性；保留原有 `data-placeholder` 和编辑内容，避免与原生编辑器的 DOM 观察器冲突。兼容原生提示段落及仅含空格／换行的单一普通段落。输入后移除主题提示，原生重新渲染时重新绑定，暂停或退出主题时撤销，不接管输入或发送事件。
- `presentation.watermark.render` 可选：省略或 `mask` 使用单色遮罩，`image` 保留原始图像颜色和透明通道。`opacity` 限制在 0.02–0.15。彩色暗纹可在主题 main 区域设置 `position:relative; isolation:isolate`，底层图像为 z-index -1 且不接收指针事件；尺寸和边缘淡出由主题 CSS 控制。
- `presentation.navigationBadge` 可声明 image、label、caption、可选 detail；`presentation.headerBand` 可声明 label、caption、可选 serial。只向适配器确认的纵向布局容器插入装饰，使用正常文档流，不叠盖原控件；不存在受支持容器时跳过。装饰不接收点击、不参与辅助技术导航，灯点仅作图形装饰。左侧装饰宿主通过 `data-cte-chrome-host="navigation"` 暴露给主题 CSS，品牌与识别带通过 `data-cte-chrome` 区分。
- `variants` 只覆盖语义 Tokens。它属于当前主题的配色层级；完整的 Gundam / Sakura Wars 应创建独立目录。
- `motion.durationMs` 声明通用过渡时长；`startup` 声明加载后覆盖层的开关、上限时长和文案。`sound` 当前只接受 false。

路径必须在包内，不能使用 `..`、绝对路径、符号链接逃逸或 URL。单文件最大 256 KB。没有内置在线下载或压缩包安装器，安装和卸载就是添加和移除目录。

## Tokens 与布局

`tokens.json` 包含 `background`、`surface`、`elevated`、`text`、`muted`、`accent`、`accentText`、`border`、`success`，颜色采用六位十六进制。另含 `font`、`displayFont`、可选 `headingFont` 和数值 `radius`。运行时统一转换为 `--cte-*` CSS 变量，例如 `displayFont` → `--cte-display-font`。字体可以来自受控本地资产，同时保留系统字体回退；聊天正文不必跟随装饰字体。

可选的 `chatBackground`、`chatSurface`、`chatElevated`、`chatText`、`chatMuted`、`chatAccent`、`chatAccentText`、`chatBorder` 支持对话区独立配色。主题 CSS 可在 main 区域把对应的 `--cte-chat-*` 变量映射到通用的 `--cte-background` 等变量；兼容层会在该区域重新绑定官方语义调色板。NERV 0.3 使用此方式提供紫绿对话区与橙色监控面板，EVA-00 变体可以覆盖这些 Tokens。

`userBubbleBackground` 与 `userBubbleText` 同时提供时，兼容层会把它们映射到官方用户气泡的背景与文字变量。主题不必识别原生消息 DOM；文字渲染器继续保持透明，避免出现嵌套色块。未同时提供时保留官方用户气泡配色。以上均为可选的通用颜色能力，核心不包含具体作品配色。

`layout.json` 定义 `navigationWidth`、`panelWidth`、`contentWidth`、`gap` 和 `slots`。插槽名称目前支持 `usage`、`connection`、`theme`，可排序或省略，不可重复。预览中窄屏布局会覆盖侧栏宽度；官方客户端第一阶段只保守预留右侧空间，不改变原生导航宽度或移动控件。

## CSS

```css
[data-cte-root] .panel-heading {
  letter-spacing: .08em;
  color: var(--cte-accent);
}
[data-cte-root] [data-cte-region="main"] {
  background-color: var(--cte-background);
  color: var(--cte-text);
}
```

选择器必须从 `[data-cte-root]` 开始。官方 DOM 锚点只由兼容适配器管理，主题只使用稳定的区域标记：`main`、`navigation`、`composer`。主题 CSS 仍拒绝所有 at-rule、外链／url()、转义形式、可越界兄弟选择器等。图片和字体只能通过 Manifest 的受控本地资源接口加载；主题样式可引用其 CSS 变量，例如 `mask-image: var(--cte-image-icon-refresh)`。为每项外部素材保存来源与适用许可，示例见 NERV 的 assets/SOURCES.md。

## 验证与删除

扫描后有错误的包会被跳过；主题库会显示错误，其他主题继续运行。删除主题目录后重新扫描：当前主题若已不存在，会回退到仍可用的包；所有包都删除时移除增强样式，保留基础管理界面。

提交主题前检查颜色对比度、长文阅读、窄屏、减少动态效果、变体切换和关闭增强。运行 `npm test` 检查包校验与生命周期；新增主题会改变固定内置包数量，需相应调整 UI 测试的预期数量。当前测试另用临时目录验证无需修改核心即可发现新主题。

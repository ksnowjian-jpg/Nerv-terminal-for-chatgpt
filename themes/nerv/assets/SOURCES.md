# NERV 主题资源来源

获取日期：2026-10-27。运行时所有资源从主题包本地读取，不向资源网站发送请求。

- `nerv-emblem.svg`：来自 [jangxx / nerv.svg](https://gist.github.com/jangxx/a6dbeaeb4d1ecf08358c8240e350f018)。本地处理仅保留 path 几何、去除 XML 与外部 DTD，并设置主题强调色；界面中用 CSS mask 随配色变体着色。该发布未提供单独的素材许可，不将其宣称为自由商用或官方授权素材；当前作为用户个人本地主题引用。NERV 标识相关权利仍归相应权利人。
- `fonts/ShareTechMono-Regular.ttf`：Google Fonts 的 [Share Tech Mono](https://github.com/google/fonts/tree/main/ofl/sharetechmono)，Carrois Type Design / Ralph du Carrois。SIL OFL 1.1，完整许可随文件保存在 `fonts/ShareTechMono-OFL.txt`。
- `fonts/BarlowCondensed-SemiBold.ttf`：Google Fonts 的 [Barlow Condensed](https://github.com/google/fonts/tree/main/ofl/barlowcondensed)，The Barlow Project Authors。SIL OFL 1.1，完整许可保存在 `fonts/BarlowCondensed-OFL.txt`。
- `icons/radar.svg`、`power.svg`、`cpu.svg`、`scan-line.svg`：来自 [Lucide 官方图标库](https://github.com/lucide-icons/lucide/tree/main/icons)。ISC / 部分 Feather 衍生图标 MIT，完整说明保存在 `icons/LICENSE.txt`。
- `magi.svg`：本项目绘制的主题示意图，借鉴 MAGI 三节点构图，非动画截图或真实系统遥测。画面内的 MELCHIOR / BALTHASAR / CASPER 是主题装饰，不代表实际后台服务。
- `emblem.svg`：第一阶段自绘几何 N 占位图，当前 NERV Manifest 已改用叶形标识。
- `art/unit01-mark-v1.svg`：本项目参考用户提供的初号机贴纸、紫绿设备外壳与编号徽章重新绘制的彩色矢量标识。使用独立的 01 字形路径、紫钛色边框、荧光绿编号、琥珀斜纹和珊瑚色铆钉，作为右侧品牌图；左侧仍使用 NERV 叶形标识。不是从参考图裁切或提取的官方标志。
- `art/unit01-wordmark-v1.svg`：独立的“初号機”图形字标。以本机 SimHei 字形轮廓为绘制基础，重新安排“大初＋右侧号／機叠排”，加入斜切、机械断口、紫色阴影、绿色角标和斜纹。所有字形已转成 SVG 路径，文件不包含 text 元素、不携带字体文件，也不依赖客户端字体渲染。生成源为 `scripts/create-unit-wordmark.ps1`，输出 340×190、38,799 字节。
- `art/unit01-reference-v2.webp`：0.7 当前使用的整幅品牌图。以用户本次提供的紫／白／荧绿“EVANGELION 01 / 初号機”图为编辑目标，通过内置 imagegen 处理透明背景并保留装甲质感与原有文字构图；完整提示词为 [unit01-reference-v2.prompt.txt](art/unit01-reference-v2.prompt.txt)。本地等比下采样与 WebP 压缩后为 1024×683、182,574 字节，保留透明通道。当前面板不再并排放置旧 01 小徽章与 v1 字标，避免稀释参考图的整体构图。
- `art/unit01-energy-core-v1.svg`：本项目绘制的六边形辅助电源纹样，参考用户给出的琥珀色感应线圈构图。内部 01 是主题编号，未包含虚构的实时功率或倒计时。
- `art/eva01-shadow-v1.webp`：使用内置 `imagegen` 工具，参考用户在本次会话提供的四张初号机图片生成的独立构图。完整最终提示词保存在 [eva01-shadow-v1.prompt.txt](art/eva01-shadow-v1.prompt.txt)。保留紫、绿、橙装甲和透明边缘，原始尺寸 1024×1536；只通过本地浏览器重编码为 WebP，未改变构图和尺寸，保留透明通道，最终 240,472 字节。不是动画原画截图或官方授权素材；角色相关权利归相应权利人。作为用户个人本地主题暗纹，运行时不请求图像服务。

筛选时发现部分 PNG 下载站预览把白底或棋盘格直接烘焙在像素里，这些文件没有放入交付主题。资源重新获取脚本为 `scripts/fetch-nerv-assets.ps1`；它只下载上述固定来源，随后把标识净化为本地图像，不执行下载的脚本或安装字体到系统。

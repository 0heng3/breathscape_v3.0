# BreathScape 项目上下文

> 维护规则：每次对话结束前都要同步更新本文件，记录本轮读到的项目事实、已完成改动、验证结果、遗留问题和下一步建议。

更新时间：2026-06-17

## 项目当前定位

BreathScape 是一个面向儿童情绪表达的 Web Demo。当前产品流程按 `fig/plan.png` 重构为：

1. 情绪触发。
2. 选择并进入花园。
3. 选择元素。
4. 开始绘画。
5. 对应生成/优化画面。
6. 识别画面并进行情绪解读。
7. 引导改画（语音 + 手势交互）。
8. 输出画面优化结果。
9. 整理为情绪日记。

当前应用是 Vite + React 项目，主流程集中在 `src/App.jsx`，场景视觉集中在 `src/components/GardenStage.jsx`、`src/components/ThreeBillboardGarden.jsx` 和 `src/styles/global.css`。

GitHub 远程仓库已指向：

```text
https://github.com/0heng3/breathscape_v3.0.git
```

运行代码和文档中未发现仍引用旧 GitHub 2.0 仓库路径；仅 `log_83.txt`、`log_96.txt` 这类历史日志里保留了 `E:\breathscape_v2.0\public\quickdraw-cnn` 输出记录，未改写历史日志。

## 已有核心能力

### 实时绘画与反馈

- `DrawingCanvas.jsx` 采集 pointer 笔触。
- `App.jsx` 在停笔后调用识别与规则逻辑，更新 `sceneState`。
- `GardenStage.jsx` 根据 `elementHistory` 和 `liveResponses` 渲染花园元素。
- `audioEngine.js` 已有元素声音反馈和实时声音触发能力。
- QuickDraw 模型、模板和 CNN 资源已接入，用于停笔后的绘画识别。

### 安放与姿态控制

- `BreathePage.jsx` 负责呼吸安放流程。
- `PoseSettleStage.jsx` 使用 `@mediapipe/tasks-vision` 的 Pose Landmarker 读取身体关键点。
- `applyGestureSettling` 会根据姿态更新 `calmLevel`、`windEnergy`、`sunlightWarmth`、`gestureWind`、`gestureGlow` 等场景变量。
- `GardenStage.jsx` 和 `ThreeBillboardGarden.jsx` 会使用这些变量驱动云、风、灯光、柔化、相机轻微运动和公告板植物摆动。

## 新素材目录 `fig`

源目录：`E:\breathscape_v3.0\fig`

| 文件 | 尺寸 | 观察 | 推荐用途 |
|---|---:|---|---|
| `背景1.jpg` | 1419 x 1063 | 完整水彩远景：天空、山坡、草地、边缘植物，中心留白充足 | 作为花园远景底图或 2.5D 背景层 |
| `云.png` | 1570 x 1003 | 多个云朵素材排版在白底图集上，无 alpha 通道 | 裁切为透明云 sprite 后用于天空 billboards |
| `草.png` | 1653 x 1045 | 多个草丛/小花草素材排版在白底图集上，无 alpha 通道 | 裁切为透明草丛 sprite 后插入地面层 |
| `花.png` | 1147 x 937 | 多个花朵素材排版在白底图集上，无 alpha 通道 | 裁切为透明花朵 sprite 后用于前中景 |
| `plan.png` | 659 x 677 | 流程说明图，文字为“情绪触发、选择并进入花园、选择元素、开始绘画、对应的优化画面、识别画面→情绪解读、引导改画（语音+手势交互）、画面优化结果、整理为情绪日记” | 已转化为画布页流程 HUD 的信息架构参考 |
| `贴图实现3D效果示例.mp4` | 720 x 938, 约 103 秒 | 参考效果是 2D 贴图分层、透视地面、多层 billboard、风动/漂浮，而不是复杂 3D 模型 | 作为视觉方向参考，保留在源素材目录，不放入 `public` 发布包 |

重要发现：`云.png`、`草.png`、`花.png` 是 24-bit RGB，没有透明通道。直接用 CSS 图集裁剪会露出白色矩形边界，即使用 `mix-blend-mode: multiply` 也不够干净。因此运行时使用裁切后的透明 PNG sprite。

## 参考项目 `E:\3D_v1` 技术路线分析

`E:\3D_v1` 是已实现的部分复刻项目，核心价值在于视频同款技术骨架：

- Three.js `PerspectiveCamera` + 低角度透视，形成手机端 3D 花田视角。
- `InstancedMesh` 承载大量花、草、树、云公告板。
- `onBeforeCompile` 改写顶点着色器，在视图空间展开平面，使植物始终面向镜头。
- 风摆只作用在花草顶点上，树和云不做同等幅度摆动。
- 透视棋盘格地面由 CanvasTexture 平铺生成。
- UI 是半透明玻璃面板，包含素材、摆放、设置等分区。

本项目采用“嵌入式迁移”而不是完全替换：保留现有 React 绘画识别/情绪日记流程，将 `E:\3D_v1` 的 Three.js 公告板场景压缩为 React 组件，作为花园画布动态底座。

## 本轮实现：动态 Three.js 公告板花园

目标：继续模仿 `贴图实现3D效果示例.mp4` 的动态交互效果，并按 `plan.png` 的流程重构画布页。

### 新增 Three.js 底座

新增文件：

- `src/components/ThreeBillboardGarden.jsx`

实现内容：

- 使用 `three` 创建透明 WebGL 画布，铺在 `GardenStage` 内部。
- 程序化生成水彩风透明贴图：
  - 花。
  - 草。
  - 树。
  - 云。
  - 蝴蝶。
- 用 `InstancedMesh` 建立公告板层，每个贴图一个实例层。
- 通过 `onBeforeCompile` 改写顶点投影，使贴图在视图空间展开，始终面向镜头。
- 顶点着色器根据 `uTime`、`uWind`、`uSway` 做顶部风摆。
- 透视棋盘地面使用 CanvasTexture 平铺生成。
- 相机自动缓慢环绕，同时响应画布区域 pointer 位置做轻微 parallax。
- 场景由现有 `sceneState` 驱动：
  - `grassCoverage` / `growthLevel` 增加草层密度。
  - `flowerBloom` / `flowerCount` 增加花层密度。
  - `windEnergy` / `gestureWind` 增强风摆和相机运动。
  - `sunlightWarmth` / `nightSparkle` / `brightness` 调整曝光与氛围。
  - `elementHistory` 最近元素会映射为 3D 空间中的附加花、草、云或光点。
- WebGL 层设置 `pointer-events: none`，不阻挡绘画 canvas。

### 接入现有花园

修改文件：

- `src/components/GardenStage.jsx`
  - 引入并渲染 `ThreeBillboardGarden`。
  - 保留原有 CSS `Watercolor3DLayer`，形成“水彩底图 + CSS 2.5D + Three.js 动态公告板 + 绘画 canvas”的层级。
- `src/styles/global.css`
  - 新增 `.three-billboard-garden`。
  - 新增 `.garden-flow-panel`。
  - 追加画布页视频风格布局覆盖：沉浸式画布、底部横向工具条、右侧轻玻璃反馈面板、移动端纵向堆叠。
- `src/routes/CanvasPage.jsx`
  - 重写为 UTF-8 中文。
  - 增加基于 `plan.png` 的流程 HUD：`选择元素 → 开始绘画 → 识别画面 → 引导改画 → 情绪日记`。
  - 保留原有绘画、识别、反馈、安放入口逻辑。
- `package.json` / `package-lock.json`
  - 新增运行依赖 `three`。

### 旧 2.5D 贴图层保留

上一轮已完成内容继续保留：

- `Watercolor3DLayer` 使用 `背景1.jpg` 作为远景背景。
- 通过 `scripts/extractFigSprites.ps1` 将 `云.png`、`草.png`、`花.png` 裁切为透明 PNG。
- 运行时素材位于 `public/fig/` 和 `public/fig/sprites/`。
- `贴图实现3D效果示例.mp4` 不放入 `public`，避免发布包增加约 38MB。

## 当前视觉分层

1. 远景水彩背景：`背景1.jpg`。
2. CSS 2.5D 层：云、草、花 sprite 与透视地面。
3. Three.js 动态层：透视棋盘地面、树林、花草、云、蝴蝶、自动相机环绕和风摆。
4. 绘画层：`DrawingCanvas`，保持最高可交互层。
5. 反馈层：流程 HUD、声音提示、右侧识别反馈和工具条。

## 验证记录

已运行：

```powershell
npm.cmd run build
```

结果：

- 构建通过。
- Vite 仍提示主 chunk 超过 500KB；原因是现有模型相关代码和新增 Three.js 都进入主包。当前不影响运行，后续可用动态 import 拆包。

Playwright / Chrome 视觉检查：

- `/mood-scene`
  - `.three-billboard-garden` 存在。
  - WebGL canvas 尺寸与舞台匹配。
  - 控制台无 warning / error。
  - 截图：`output/playwright/mood-scene-3d-check.png`
- `/garden` 桌面 1180 x 860
  - `.three-billboard-garden` 存在。
  - `.garden-flow-panel` 存在。
  - WebGL canvas 与绘画 canvas 同尺寸叠放。
  - 无水平溢出。
  - 控制台无 warning / error。
  - 截图：`output/playwright/garden-3d-flow-check-final.png`
- `/garden` 移动端 390 x 844
  - `.three-billboard-garden` 存在。
  - `.garden-flow-panel` 存在。
  - 无水平溢出。
  - 画布、工具条、反馈面板纵向排列，无互相遮挡。
  - 截图：`output/playwright/garden-3d-mobile-check.png`

## 素材使用方案

### `背景1.jpg`

- 当前作为 CSS 2.5D 远景背景。
- 保持低透明度，避免覆盖笔触和识别反馈。
- 后续可按 mood/day 调整滤镜：安静降饱和、晴朗增暖、雨后叠蓝绿色 haze。

### `云.png`

- 当前通过裁切后的 `public/fig/sprites/cloud-*.png` 用于 CSS 2.5D 云层。
- Three.js 层同时使用程序化云贴图，补足视频中的动态漂浮感。
- 后续可继续裁切更多云形，并绑定 `cloud` / `windLine` 工具。

### `草.png`

- 当前裁切为草丛 sprite，用于 CSS 2.5D 中前景。
- Three.js 层用程序化草贴图补充大量随风摆动的草。
- 后续应把具体 sprite 与 `grass`、`sprout`、`reed`、`moss` 等工具 ID 绑定。

### `花.png`

- 当前裁切为花朵 sprite，用于 CSS 2.5D 中前景。
- Three.js 层按 mood tone 程序化生成不同颜色花朵，并由 `flowerBloom` 驱动密度。
- 后续可将裁切花朵直接用于 Three.js texture layer，提高与原始素材一致性。

### `plan.png`

- 已作为本轮画布页重构的信息架构来源。
- 运行时不直接展示图片，而是转化为流程 HUD。

### `贴图实现3D效果示例.mp4`

- 用于复刻方向，不进入发布资源。
- 当前已复刻的要点：透视地面、公告板花草树云、相机轻微环绕、风摆、玻璃面板式 UI。

## 下一步建议

1. 将 `ThreeBillboardGarden.jsx` 内程序化 sprite 生成逻辑拆到 `src/three/` 或 `src/garden3d/`，避免单文件继续膨胀。
2. 将 `public/fig/sprites/*.png` 接入 Three.js texture loader，让真实裁切素材和程序化补充素材混合使用。
3. 建立 `src/data/figSpriteMap.js`，把 sprite、工具 ID、情绪 tone、层级、默认尺寸集中配置。
4. 增加日记花园布局：将日记条目按年月日映射到 3D 棋盘格，生成日期/月名文字贴图，靠近视频中的“日历花海”。
5. 增加轻量控制面板：日/夜、风力、视角重置、显示地面、显示网格、进入摆放模式。
6. 后续性能优化：对 Three.js 组件使用动态 import，或将 QuickDraw/MediaPipe 相关代码拆包，降低首屏主 chunk。

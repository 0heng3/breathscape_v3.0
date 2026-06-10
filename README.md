# BreathScape v2.0

BreathScape 是一个 Vite + React 的七日花园绘画 App。当前版本把绘画交互重构为 QuickDraw Dataset Element Stamp Mode：儿童先选择元素，再在画布任意绘画，系统把这笔输入转译为当前元素的 QuickDraw 风格 SVG。

## 运行

```bash
npm install
npm run dev
```

打开：

```txt
http://127.0.0.1:5173/start
```

Windows PowerShell 如果阻止 `npm.ps1`，可使用：

```bash
npm.cmd install
npm.cmd run dev
```

## 构建

```bash
npm run build
```

或：

```bash
npm.cmd run build
```

## QuickDraw 资产

本版本参考 QuickDraw Dataset 的矢量涂鸦结构和快速简笔风格。QuickDraw Dataset 不是儿童专属数据集，本项目不做心理诊断，不做绘画能力评分，也不声称基于儿童数据训练。

当前实现优先使用本地 `quickdraw_selected/*.ndjson` 中 selected 类别的少量 recognized 样本，通过离线脚本转换为透明背景、单色线描、圆角线帽、圆角连接的 SVG：

```bash
node scripts/extractQuickDrawAssets.mjs --max=20
```

输出位置：

```txt
public/quickdraw-assets/
public/quickdraw-assets/meta.json
```

运行时不会下载完整 QuickDraw 数据集，不会把 ndjson 放入 `public`，也不会上传儿童画作。若当前 selected 样本不足，App 会使用 curated QuickDraw-style 规则化 SVG 作为 fallback。

如果项目中直接使用或展示 QuickDraw 原始样本，需要遵守 QuickDraw Dataset 的 CC BY 4.0 归属要求。

## 安全边界

- 不接入登录。
- 不上传儿童画作。
- 不接入摄像头。
- 不做人脸识别。
- 不接入广告或第三方统计。
- 不做心理诊断。
- 不做绘画能力评分。


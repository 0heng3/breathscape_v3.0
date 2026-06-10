# BreathScape「息境」QuickDraw 数据集风格笔触控制重构方案 v5

## 0. 文档目的

本方案用于将 BreathScape 的儿童绘画输入从“普通 Canvas 随手线条”重构为“Quick, Draw! 数据集风格的快速线描笔触系统”。目标不是把 QuickDraw 数据集直接作为 UI 素材库，也不是训练一个大型识别模型，而是抽取 QuickDraw 数据集的关键形式特征：**时间序列笔触、快速简笔画、单线条、类别化对象、可归一化的矢量结构、非完美但可识别的轮廓**，用它来约束 BreathScape 中儿童绘画笔触的视觉风格、识别逻辑和场景转译方式。

核心原则：

> 儿童画出的线条不被要求“画得像”，而是被系统整理为 QuickDraw 式的简洁线描符号，再转译为花园场景中的风、雨、草、花、光、云、水、石、星等自然反馈。

## 1. QuickDraw 数据集信息提炼

### 1.1 数据集性质

Quick, Draw! Dataset 是 Google Creative Lab 开源的涂鸦数据集，包含约 5000 万张绘画，覆盖 345 个类别。数据来自 Quick, Draw! 游戏玩家，官方说明这些绘画以时间戳矢量形式捕获，并带有提示词、国家等元数据。

重要限制：该数据集不是“儿童绘画数据集”。因此 BreathScape 不能宣称“基于儿童真实绘画数据训练”。本项目只能借鉴其“快速涂鸦 / 简笔画 / 时间序列笔触”的形式语言，用于控制 App 内笔触视觉和交互风格。

### 1.2 原始数据格式

QuickDraw 原始数据为按类别分开的 ndjson 文件。每一条绘画包含：

```json
{
  "key_id": "5891796615823360",
  "word": "nose",
  "countrycode": "AE",
  "timestamp": "2017-03-01 20:41:36.70725 UTC",
  "recognized": true,
  "drawing": [
    [
      [x0, x1, x2, ...],
      [y0, y1, y2, ...],
      [t0, t1, t2, ...]
    ]
  ]
}
```

其中 `drawing` 是多笔画结构。每一笔是三组数组：x 坐标、y 坐标、时间戳 t。这个结构非常适合 BreathScape，因为我们原本就需要记录儿童笔触的速度、方向、持续时间、密度和停顿。

### 1.3 预处理规则可迁移点

QuickDraw simplified 数据进行了以下处理：

1. 将绘画对齐到左上角，最小值为 0。
2. 等比缩放，使最大值为 255。
3. 以 1 像素间距重采样所有笔触。
4. 使用 Ramer–Douglas–Peucker 算法进行路径简化，epsilon 为 2.0。

BreathScape 可以迁移这些规则，但不能生硬照搬 256×256 的数据框。应采用“局部元素框归一化”：每个儿童画出的元素先被归一化到一个局部 256×256 的逻辑框，系统提取其方向、曲率、密度和速度，再把它渲染回花园场景的对应区域。

### 1.4 可选 bitmap 迁移点

TensorFlow Datasets 的 quickdraw_bitmap 版本将 QuickDraw 矢量图转为 28×28 灰度图像，并保留 345 类标签。这说明 QuickDraw 风格具有高度符号化和低分辨率可识别性。

BreathScape 不建议第一版做 28×28 分类器。更稳妥做法是：保留矢量笔触结构，用规则识别和风格化渲染完成 Demo。若后续要展示 AI 识别能力，可以再将儿童笔迹 rasterize 为 28×28 灰度图，接入轻量 TensorFlow.js 分类器。

## 2. BreathScape 的新视觉判断

旧方案的问题是：儿童随手画线后，如果系统直接保留原始线条，最终画面容易混乱；如果系统直接生成漂亮插画，又会削弱儿童笔触的存在感。

新方案采用“双层笔触”策略：

1. **儿童原始笔迹层**：保留儿童真实触控痕迹，透明度 20%–35%，作为情绪表达痕迹。
2. **QuickDraw 风格转译层**：将笔迹整理为统一的单线条、圆端点、轻微抖动、类别化简笔符号。
3. **花园场景反馈层**：根据转译后的元素改变土壤、水流、风、光、植物、星空等状态。
4. **安放整理层**：呼吸收尾时降低过密线条的不适感，将多余笔迹转为云雾、叶堆、土壤纹理、星尘或柔光。

最终页面既保留儿童“我画过”的证据，又能保证画面进入统一的治愈花园风格。

## 3. QuickDraw 风格规范

### 3.1 线条形态

所有由系统生成的线描元素应遵守：

- 单线条优先，不使用复杂填色。
- 线宽 3–6px，iPad 横屏建议 4px。
- `lineCap: round`，`lineJoin: round`。
- 颜色为深灰紫、蓝灰、柔绿、暖棕，不使用纯黑。
- 轻微抖动，不能像完美图标。
- 每个元素保留 1–8 笔结构，不做过度精细插画。
- 每个元素应能在 1 秒内被儿童理解。
- 保留手绘顺序：风先出现主风线，再出现小风尾；花先出现茎，再出现花瓣；星星先点亮，再连线。

### 3.2 不允许的风格

- 不允许生成高完成度商业插画来完全覆盖儿童笔迹。
- 不允许把线条变成过度卡通表情。
- 不允许把儿童画错识别为失败。
- 不允许出现“像不像评分”。
- 不允许把 QuickDraw 类别识别结果解释成儿童情绪诊断。

### 3.3 QuickDraw 风格关键词

用于设计、生成或描述资产时，统一使用以下风格关键词：

```text
quick draw dataset inspired vector doodle style, simple timestamped stroke drawing, minimal single-line sketch, child-friendly imperfect doodle, rounded stroke caps, soft dark gray ink, slightly wobbly hand-drawn line, no realistic shading, no polished icon, no hard black outline, recognizable simple category shape, low-stimulation emotional care app, warm paper background
```

中文理解：QuickDraw 数据集式快速线描、单线条、轻微不完美、可识别、非精致图标、儿童友好、低刺激。

## 4. BreathScape 元素库重构

### 4.1 QuickDraw 类别与 App 元素对应

QuickDraw 的 345 类中，与 BreathScape 直接相关或可迁移的类别包括：

- 自然场景：`garden`, `grass`, `flower`, `bush`, `tree`, `leaf`, `cloud`, `rain`, `sun`, `moon`, `star`, `rainbow`, `river`, `pond`, `ocean`, `mountain`
- 小物与陪伴：`lantern`, `light bulb`, `house`, `house plant`, `mushroom`, `snail`, `butterfly`, `bridge`
- 笔触结构：`line`, `squiggle`, `zigzag`, `circle`
- 风的间接参考：QuickDraw 没有直接的 `wind` 类别，可用 `squiggle`, `line`, `hurricane`, `tornado`, `windmill` 的笔触语法来表达风。

这意味着 BreathScape 的元素应从“漂亮图标”改为“类别化涂鸦语法”：每个工具都有一个 QuickDraw 式笔触模板和若干可接受的变体。

### 4.2 元素映射表

| App 元素 | QuickDraw 参考类别 | 儿童输入 | QuickDraw 风格转译 | 场景变化 |
|---|---|---|---|---|
| 风线 | squiggle, line, hurricane, tornado | 长弯线、旋转线 | 2–4 条半透明波浪线 | 草、风铃、彩带摆动 |
| 雨滴 | rain, line | 点、短竖线 | 短竖线雨滴，带轻微错位 | 土壤变湿，水面波纹 |
| 草 | grass | 向上短线 | 3–7 根简短草线 | 地面绿色覆盖增加 |
| 花 | flower | 圆、弧线、点状花瓣 | 茎 + 圆瓣的简笔花 | 花朵打开，颜色变暖 |
| 阳光 | sun | 放射线、圆点 | 小圆 + 放射线 | 亮度上升，雾变薄 |
| 云 | cloud | 大弧线、闭合团 | 连续弧线云朵 | 天空柔化，风速下降 |
| 水线 | river, ocean, line | 横向长线 | 2–3 条平行水纹 | 小溪流动 |
| 涟漪 | pond, circle | 圆圈、半圆 | 扩散圆形水纹 | 水面活跃 |
| 叶子船 | leaf | 叶形线、短弧 | 一片简笔叶子 | 叶子随水漂走 |
| 小桥 | bridge | 横线、短直线 | 简笔桥板 | 路径连通 |
| 石头 | circle, potato | 圆块、点 | 圆润不规则石块 | 路径完整度增加 |
| 蘑菇 | mushroom | 半圆 + 竖线 | 简笔蘑菇 | 地面生命感增强 |
| 蜗牛线 | snail, squiggle | 慢弯线 | 银色弯曲轨迹 | 运动速度降低，画面变慢 |
| 灯笼 | lantern, light bulb | 小圆、竖线 | 悬挂小灯 | 暖光范围扩大 |
| 萤火虫 | firefly 无直接类，参考 star/light bulb | 小点 | 小光点粒子 | 夜色变柔和 |
| 月亮 | moon | 弧线 | 月牙线描 | 夜间亮度上升 |
| 星星 | star | 点、小叉 | 五角星或点星 | 星空密度增加 |
| 星座线 | line, star | 连点线 | 星点连接线 | 一周记忆连接 |
| 彩虹 | rainbow | 大弧线 | 多层简笔弧线 | 收束与回顾感增强 |

## 5. 技术架构重构

### 5.1 新增模块

建议新增以下文件：

```text
src/utils/quickdrawStyle.js
src/utils/strokeProcessing.js
src/utils/rdp.js
src/data/quickdrawElementGrammar.js
src/components/QuickDrawStrokeLayer.jsx
src/components/QuickDrawPreviewGlyph.jsx
```

### 5.2 数据结构

```ts
type StrokePoint = {
  x: number;
  y: number;
  t: number;
  pressure?: number;
};

type RawStroke = StrokePoint[];

type QuickDrawStroke = {
  x: number[];
  y: number[];
  t: number[];
};

type QuickDrawDrawing = QuickDrawStroke[];

type StrokeFeatures = {
  pointCount: number;
  strokeCount: number;
  duration: number;
  length: number;
  speedAvg: number;
  speedMax: number;
  curvatureAvg: number;
  directionMain: "up" | "down" | "left" | "right" | "loop" | "mixed";
  density: number;
  boundingBox: { x: number; y: number; width: number; height: number };
};

type QuickDrawStyleToken = {
  elementType: ElementType;
  referenceCategories: string[];
  rawDrawing: QuickDrawDrawing;
  simplifiedDrawing: QuickDrawDrawing;
  renderColor: string;
  renderWidth: number;
  opacity: number;
  jitter: number;
  sceneEffect: Partial<SceneState>;
};
```

### 5.3 核心流程

```ts
function onStrokeEnd(rawStroke: RawStroke) {
  const rawDrawing = appendToCurrentDrawing(rawStroke);
  const normalized = normalizeToQuickDrawBox(rawDrawing, 256);
  const resampled = resampleDrawing(normalized, 1);
  const simplified = simplifyDrawingRDP(resampled, 2.0);
  const features = extractStrokeFeatures(rawDrawing);
  const styleToken = mapToQuickDrawStyleToken(currentTool, simplified, features, currentDay);
  renderGhostRawStroke(rawStroke);
  renderQuickDrawGlyph(styleToken);
  updateSceneState(styleToken.sceneEffect);
  playStrokeSound(currentTool, features);
  updateFeedbackText(currentTool, features);
  applyDensitySafeguard();
}
```

### 5.4 归一化规则

BreathScape 的归一化不是为了缩小画面，而是为了让不同儿童、不同屏幕、不同画幅下的笔触都能进入统一风格。

```ts
function normalizeToQuickDrawBox(drawing, size = 256) {
  // 1. 计算所有点的 minX, minY, maxX, maxY
  // 2. 将点平移到 minX=0, minY=0
  // 3. 按最大边等比缩放到 size-1
  // 4. 保留每个点的相对时间 t
  // 5. 返回 QuickDrawDrawing: [[x[] , y[], t[]], ...]
}
```

### 5.5 RDP 简化

```ts
function simplifyStrokeRDP(points, epsilon = 2.0) {
  // 使用 Ramer–Douglas–Peucker 简化曲线
  // 保留关键转折点，去掉儿童手抖产生的过密点
  // epsilon 默认与 QuickDraw simplified 数据一致为 2.0
}
```

注意：RDP 不应把儿童线条变得过于机械。简化后再加入 0.5–1.5px 的轻微 jitter，保留手绘感。

## 6. 七日花园中的 QuickDraw 风格应用

### Day 1 种子庭院

重点参考类别：`circle`, `grass`, `flower`, `sun`, `garden`

效果要求：

- 种子由 1–2 个不完美小椭圆组成。
- 草必须是多根短竖线，不是贴图草丛。
- 花必须像 QuickDraw 中的 flower：圆形中心 + 若干弧形花瓣。
- 阳光为圆点 + 放射线，不能做成复杂光效。

### Day 2 小溪花园

重点参考类别：`river`, `pond`, `leaf`, `bridge`, `rain`

效果要求：

- 水流是多条手绘波浪线。
- 涟漪是 1–3 个不完美圆环。
- 叶子船由一片 leaf 线稿构成，沿水线移动。
- 小桥由 3–5 个短横线桥板构成。

### Day 3 风铃草坡

重点参考类别：`squiggle`, `line`, `hurricane`, `tornado`, `windmill`, `grass`

效果要求：

- 风不是写实风，而是 QuickDraw 式 squiggle。
- 风线生成后必须驱动草坡、风铃、彩带摆动。
- 风线透明度应较低，避免覆盖儿童笔迹。

### Day 4 石径安放园

重点参考类别：`circle`, `line`, `tree`, `bush`

效果要求：

- 石头不是写实石块，而是不完美圆形涂鸦。
- 路径由多个圆形/椭圆形石头逐步连通。
- 小树用 1 根主干 + 2–4 条分叉线表达。

### Day 5 雨后蘑菇园

重点参考类别：`rain`, `mushroom`, `grass`, `pond`, `snail`

效果要求：

- 蘑菇由半圆帽 + 短柄构成。
- 雨落下后必须改变 soilWetness。
- 水洼用不完美椭圆表达，并带轻微波纹。

### Day 6 萤火灯园

重点参考类别：`lantern`, `light bulb`, `moon`, `star`, `house`

效果要求：

- 灯笼是简笔悬挂小灯，不做高精度装饰。
- 萤火虫可用点状星光表达，不需要画虫身体。
- 月亮是单条或双条弧线。
- 窗光通过小屋窗户亮起表达陪伴感。

### Day 7 星光温室

重点参考类别：`star`, `line`, `rainbow`, `garden`, `house plant`

效果要求：

- 星星必须保留点线顺序，可被连成星座。
- 记忆种子点击后点亮前六天的主要元素。
- 彩虹用 3–5 条不完美弧线，不做渐变大色块。

## 7. 场景变化仍然必须明显

QuickDraw 风格不能削弱原方案的交互变化。儿童画完之后，必须有明显场景反馈：

| 儿童动作 | QuickDraw 风格笔触 | 场景必须变化 |
|---|---|---|
| 画雨 | 短竖线雨滴 | 土壤变湿，水洼扩大，草更亮 |
| 画风 | squiggle 风线 | 草、风铃、彩带或云运动 |
| 画草 | 多根短竖线 | 地面绿色覆盖增加 |
| 画光 | sun 线稿 | 亮度上升，雾层变薄 |
| 画星星 | star 点线 | 星空密度增加，星座可连接 |
| 画桥 | bridge 短横线 | 小路/小桥连通度增加 |

验收红线：如果画完后只是多了一条 QuickDraw 风格线，而花园状态没有变化，仍然视为失败。

## 8. 识别策略

### 8.1 MVP 版本：工具先验 + 规则识别

第一版不建议训练模型。每次绘画前，儿童先选工具，系统只判断该工具内的笔触特征。例如当前工具是“雨”，系统只判断点状、短竖线、密度和速度，而不是在 345 类中做全分类。

### 8.2 进阶版本：小类分类器

后续可以从 QuickDraw 数据集中挑选 16–24 个和 BreathScape 相关类别，训练一个轻量分类器：

```text
grass, flower, cloud, rain, sun, moon, star, rainbow, river, pond, leaf, bridge, mushroom, snail, lantern, tree, bush, house, light bulb, circle, line, squiggle, zigzag
```

分类器只用于“辅助确认”和“工具推荐”，不能用于评价儿童画得好坏。

## 9. 数据与版权边界

QuickDraw Dataset 使用 Creative Commons Attribution 4.0 International license。若项目中直接使用或展示 QuickDraw 原始样本，应在 README 或 About 页面中进行归属说明。

更推荐的方式是：不直接展示原始样本，只借鉴其数据结构和风格规则，生成 BreathScape 自有的简笔符号。这样可以减少数据体积、内容风险和版权归属复杂度。

此外，官方提示该集合虽然经过个体审核，但仍可能包含不适当内容。因此，若后续下载真实样本，必须只下载与 BreathScape 相关的自然类别，并进行本地筛选，不要把未审查样本直接展示给儿童。

## 10. 对 Codex 的实现要求摘要

Codex 实现时应完成：

1. 新增 QuickDraw 风格控制模块。
2. 将儿童原始笔迹转为 QuickDrawDrawing 数据结构。
3. 完成归一化、重采样、RDP 简化和轻微 jitter。
4. 每个元素使用 QuickDraw 风格线描渲染，不再使用过度精致图标。
5. 保留七日花园系统和 sceneState 变化。
6. 确保每一笔后同时出现：原始笔迹、QuickDraw 风格元素、场景变化、声音反馈、文案反馈。
7. 不接入后端，不下载完整 QuickDraw 数据集，不上传儿童画作。
8. README 写明：QuickDraw 仅作为笔触风格和数据结构参考，不声称模型基于儿童数据训练。


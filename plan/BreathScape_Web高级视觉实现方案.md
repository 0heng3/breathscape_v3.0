# BreathScape Web 高级视觉实现方案
## 从“线条堆叠 Demo”升级为“会回应的儿童情绪场景”

---

## 0. 文档目标

本文档用于指导当前 Web Demo 的下一轮技术与视觉重构。

当前问题不是“Web 技术不够”，而是实现方式仍停留在“儿童画线，页面显示线”的画板逻辑。要达到更接近已上架儿童 App 的视觉效果，需要将 Web 实现从普通 HTML 页面升级为“场景引擎 + 图层系统 + 元素生成器 + 音效映射 + 安放滤镜”的互动系统。

最终目标是：

> 儿童画下的线条不直接堆叠成最终画面，而是作为输入痕迹，被系统理解并转化为统一风格的场景回应。

核心体验应从：

```text
儿童画线 → 屏幕留下线条
```

升级为：

```text
儿童画线 → 系统识别元素与笔触特征 → 花园状态变化 → 生成雨滴 / 草芽 / 光晕 / 风痕 → 声音同步变化 → 收尾安放为今日场景日记
```

---

## 1. 当前实现的主要不足

### 1.1 画面仍是线条堆叠，不是场景回应

当前绘画页的逻辑接近普通画板：用户画什么，屏幕上就留下什么。这会导致三个问题：

1. 儿童画得不好时，画面立刻变乱。
2. 儿童画得不像时，元素无法成立。
3. 多次绘制后，画面杂乱，缺少疗愈感和儿童 App 质感。

优化方向：儿童笔迹应作为“表达痕迹层”，系统需要在其基础上生成“场景回应层”。

例如：

```text
儿童画雨点 → 系统生成雨滴粒子 → 土地变湿 → 种子周围出现水珠 → 小草开始冒出
```

而不是：

```text
儿童画雨点 → 屏幕留下几条蓝线
```

---

### 1.2 花园场景没有内部状态

当前花园更像静态背景，缺少可被儿童行为改变的内部状态。真正的互动场景必须具备状态变量，例如土壤湿度、光照强度、风力、生长值和开花值。

优化方向：建立 `GardenState` 场景状态引擎，使每个元素都能真实改变场景。

---

### 1.3 缺少统一插画资产和视觉风格控制

当前视觉多依赖 CSS 图形、简单线条和抽象色块，缺少完整的儿童绘本式资产库。因此页面容易显得“干净但空”“温和但单薄”。

优化方向：建立统一资产系统，包括背景、土地、种子、小灯、雨滴、草芽、光点、花苞、风痕等，并统一为“手绘线描 + 轻水彩 + 纸张肌理”的风格。

---

### 1.4 声音反馈仍可能停留在固定音效

如果只是点击播放固定音效，就无法支撑“声景线描”的核心概念。声音必须与儿童笔触速度、密度和停顿相关。

优化方向：引入 Web Audio API 或 Tone.js，实现笔触参数到声音节奏、密度和音色的映射。

---

### 1.5 页面结构偏 Web 信息展示，不是儿童场景体验

当前页面容易形成“标题 + 卡片 + 按钮 + 插图”的结构，更像课程原型或产品说明页，而不是儿童 App。

优化方向：减少卡片式 UI，让花园成为界面主体。儿童应直接在场景中选择、绘制和观察变化。

---

## 2. 技术路线总览

### 2.1 推荐路线

第一阶段不建议直接切换到 Swift / visionOS / 3D VR。当前最现实、效率最高的路线是继续使用 Web，但将核心交互升级为 Canvas / Pixi.js 场景引擎。

推荐技术组合：

```text
Vite / 原生 JS / React：页面组织与工程化
Canvas 2D 或 Pixi.js：花园场景渲染、图层和动画
SVG：手绘线条、柔和路径和可缩放图形
Tone.js / Web Audio API：实时音效映射
Rive / Lottie：小灯角色动效
GSAP：精细 UI 和场景动效
LocalStorage / IndexedDB：本地日记保存
规则引擎：第一阶段模拟 AI 引导和故事生成
```

### 2.2 最小可行组合

如果时间有限，第一版可以使用：

```text
HTML / CSS / JavaScript
Canvas 2D
Web Audio API 或 Tone.js
本地 JSON 配置
LocalStorage
```

无需后端，无需真实 AI 模型，无需复杂图像生成。

---

## 3. 推荐项目结构

如果使用 Vite + 原生 JS，可采用以下结构：

```text
breathscape-demo/
├─ index.html
├─ package.json
├─ src/
│  ├─ main.js
│  ├─ styles.css
│  ├─ app/
│  │  ├─ router.js
│  │  ├─ store.js
│  │  └─ constants.js
│  ├─ engine/
│  │  ├─ GardenState.js
│  │  ├─ SceneRenderer.js
│  │  ├─ LayerManager.js
│  │  ├─ StrokeAnalyzer.js
│  │  ├─ ElementGenerator.js
│  │  ├─ SoundEngine.js
│  │  ├─ StoryEngine.js
│  │  └─ DiaryStore.js
│  ├─ pages/
│  │  ├─ HomePage.js
│  │  ├─ MoodPage.js
│  │  ├─ GuidePage.js
│  │  ├─ CreatePage.js
│  │  ├─ SettlePage.js
│  │  └─ DiaryPage.js
│  ├─ components/
│  │  ├─ LampGuide.js
│  │  ├─ ElementDock.js
│  │  ├─ SceneCanvas.js
│  │  ├─ BreathingOrb.js
│  │  └─ DiaryCard.js
│  ├─ data/
│  │  ├─ moodMap.js
│  │  ├─ elementMap.js
│  │  ├─ storyTemplates.js
│  │  └─ sceneConfig.js
│  └─ assets/
│     ├─ images/
│     │  ├─ scene/
│     │  ├─ elements/
│     │  ├─ character/
│     │  └─ texture/
│     ├─ sounds/
│     │  ├─ rain.mp3
│     │  ├─ wind.mp3
│     │  ├─ grass.mp3
│     │  ├─ light.mp3
│     │  └─ settle.mp3
│     └─ animations/
│        ├─ lamp_idle.json
│        ├─ lamp_glow.json
│        └─ lamp_sleep.json
```

如果使用 React，可将 `pages` 与 `components` 改为 `.jsx`，引擎层保持普通 JS 类即可。

---

## 4. 核心实现架构

### 4.1 图层系统

花园场景必须拆分为多个图层，而不是在一个画布上直接叠加所有内容。

建议图层：

| 图层 | 内容 | 作用 |
|---|---|---|
| backgroundLayer | 天空、远景、土地基础形态 | 建立世界感 |
| stateLayer | 湿土、光照、云、风环境 | 表现场景状态变化 |
| responseLayer | 雨滴、草芽、花苞、光点、风痕 | 系统回应儿童输入 |
| childTraceLayer | 儿童原始笔迹 | 保留表达痕迹 |
| softenLayer | 纸张肌理、水彩晕染、安放滤镜 | 统一风格，降低杂乱 |
| characterLayer | 小灯角色 | 情感锚点与 AI 化身 |
| uiLayer | 元素选择、提示气泡 | 交互控制 |

核心原则：

> 儿童笔迹不直接成为最终画面主体，而是作为表达痕迹，被系统转译为场景回应。

---

### 4.2 场景状态引擎 GardenState

建议定义以下状态变量：

```js
class GardenState {
  constructor() {
    this.soilMoisture = 0;   // 土壤湿度：0-100
    this.lightLevel = 20;    // 光照强度：0-100
    this.windLevel = 0;      // 风力：0-100
    this.growthLevel = 0;    // 生长程度：0-100
    this.bloomLevel = 0;     // 开花程度：0-100
    this.calmLevel = 50;     // 平静程度：0-100
    this.densityLevel = 0;   // 画面密度：0-100
    this.traceCount = 0;     // 笔触数量
    this.elements = [];      // 已添加元素记录
  }

  clamp() {
    const keys = [
      'soilMoisture',
      'lightLevel',
      'windLevel',
      'growthLevel',
      'bloomLevel',
      'calmLevel',
      'densityLevel'
    ];
    keys.forEach(k => {
      this[k] = Math.max(0, Math.min(100, this[k]));
    });
  }
}
```

每次儿童绘制完成后，根据元素类型和笔触特征更新状态：

```js
function applyElementEffect(state, type, features) {
  const speed = features.speedNorm;
  const density = features.densityNorm;

  if (type === 'rain') {
    state.soilMoisture += 12 + density * 18;
    state.growthLevel += 4 + density * 6;
    state.lightLevel -= 2;
    state.calmLevel += 3;
  }

  if (type === 'light') {
    state.lightLevel += 16 + density * 8;
    state.bloomLevel += 8;
    state.calmLevel += 4;
  }

  if (type === 'grass') {
    state.growthLevel += 12 + density * 8;
    state.densityLevel += 4;
    state.calmLevel += 3;
  }

  if (type === 'wind') {
    state.windLevel += 10 + speed * 20;
    state.calmLevel += speed > 0.65 ? -2 : 3;
  }

  if (type === 'flower') {
    state.bloomLevel += 14;
    state.lightLevel += 4;
    state.calmLevel += 5;
  }

  state.traceCount += 1;
  state.elements.push({ type, features, time: Date.now() });
  state.clamp();
}
```

场景渲染器根据状态决定画面：

```text
soilMoisture 高 → 土地颜色变深、出现水珠
lightLevel 高 → 背景变暖、光斑增加、小灯更亮
windLevel 高 → 草和云摆动、风痕出现
growthLevel 高 → 草芽增加、种子发芽
bloomLevel 高 → 花苞逐渐打开
calmLevel 高 → 动画速度放慢、声音变柔
```

---

## 5. 笔触分析模块 StrokeAnalyzer

### 5.1 记录数据

每条笔触应记录：

```js
const stroke = {
  points: [
    { x: 120, y: 300, t: 1710000000000, pressure: 0.3 },
    { x: 130, y: 305, t: 1710000000016, pressure: 0.35 }
  ],
  type: 'rain',
  area: 'sky'
};
```

### 5.2 计算特征

需要计算：

| 特征 | 说明 | 用途 |
|---|---|---|
| length | 路径长度 | 判断元素规模 |
| duration | 绘制时长 | 判断节奏 |
| avgSpeed | 平均速度 | 控制声音节奏与动画强度 |
| density | 点密度或线密度 | 控制雨滴/草芽数量 |
| curvature | 曲率 | 控制风线旋转感 |
| pressure | 压力 | 支持触控笔时控制粗细和强度 |
| area | 绘制区域 | 判断天空、土地、边缘等位置 |

示例：

```js
function analyzeStroke(points, canvasWidth, canvasHeight) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }

  const duration = Math.max(1, points[points.length - 1].t - points[0].t);
  const avgSpeed = length / duration;
  const speedNorm = Math.min(1, avgSpeed / 1.2);

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const bboxArea = (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
  const densityNorm = Math.min(1, points.length / Math.max(20, bboxArea / 500));

  const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const area = avgY < canvasHeight * 0.45 ? 'sky' : 'ground';

  return {
    length,
    duration,
    avgSpeed,
    speedNorm,
    densityNorm,
    area
  };
}
```

---

## 6. 元素生成器设计

### 6.1 雨 RainGenerator

#### 输入

儿童选择“雨”，在天空区域点画或画短线。

#### 生成反馈

```text
儿童点画 / 短线
→ 生成雨滴粒子
→ 雨滴下落
→ 接触土地时出现微小水波
→ 土地颜色逐渐加深
→ soilMoisture 增加
→ 小草生长概率增加
→ 雨声随点画密度变化
```

#### 视觉要求

雨滴不应是硬蓝线，而应为半透明水滴、细线和小光点结合。
雨后土壤应出现柔和深色渐变和少量水珠。

#### 伪代码

```js
class RainGenerator {
  constructor(scene) {
    this.scene = scene;
  }

  generate(stroke, features) {
    const count = Math.round(8 + features.densityNorm * 24);
    for (let i = 0; i < count; i++) {
      const p = stroke.points[Math.floor(Math.random() * stroke.points.length)];
      this.scene.addRainDrop({
        x: p.x + (Math.random() - 0.5) * 40,
        y: p.y,
        speed: 1.5 + features.speedNorm * 2,
        alpha: 0.35 + features.densityNorm * 0.3
      });
    }
    this.scene.gardenState.soilMoisture += 10 + features.densityNorm * 20;
  }
}
```

---

### 6.2 草 GrassGenerator

#### 输入

儿童选择“草”，从土地边缘画向上的短线。

#### 生成反馈

```text
儿童短线
→ 原始线条淡化为土地痕迹
→ 附近生成 2-5 根统一风格草芽
→ 草芽轻微摆动
→ growthLevel 增加
→ 草声音效出现
```

#### 视觉要求

草芽应使用统一的手绘线描和低饱和绿色，不直接保留杂乱硬线。草可以有轻微随机变化，但整体风格统一。

---

### 6.3 光 LightGenerator

#### 输入

儿童选择“光”，画放射线或轻点。

#### 生成反馈

```text
儿童轻点 / 放射线
→ 生成柔和光点和光晕
→ lightLevel 增加
→ 小灯变亮
→ 场景整体色温变暖
→ bloomLevel 小幅增加
→ 光点铃声出现
```

#### 视觉要求

光不应是刺眼黄色大块，而应是柔和暖色光晕、透明粒子和局部亮度提升。

---

### 6.4 风 WindGenerator

#### 输入

儿童选择“风”，画波浪线、长线或旋转线。

#### 生成反馈

```text
儿童波浪线
→ 生成半透明风痕路径
→ 云和草沿风向轻微摆动
→ windLevel 增加
→ 风声随速度变化
```

#### 视觉要求

风线应具有流动感，不应是静态硬线。可使用路径透明度渐变和流动粒子表现。

---

### 6.5 花 FlowerGenerator

#### 输入

儿童选择“花”，画弧线、圆点或花瓣形态。

#### 生成反馈

```text
儿童弧线 / 圆点
→ 在地面生成花苞
→ 根据 lightLevel 和 bloomLevel 决定开合程度
→ 花瓣轻轻展开
→ 开花音效出现
```

#### 视觉要求

花可以不追求复杂形态。第一版只做花苞、半开、开花三个状态即可。

---

## 7. 儿童笔迹层处理

儿童原始笔迹必须保留，但不能作为最终画面全部内容。

建议处理：

```text
绘制中：显示原始线条，提供即时反馈
绘制完成：原始线条透明度降至 25%-45%
系统回应：生成统一风格元素覆盖或围绕原始线条
收尾阶段：原始线条进一步柔化，变成纹理或痕迹
```

### 路径柔化

可使用简单路径平滑：

```js
function smoothPoints(points) {
  if (points.length < 3) return points;
  const smoothed = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    smoothed.push({
      x: (points[i - 1].x + points[i].x + points[i + 1].x) / 3,
      y: (points[i - 1].y + points[i].y + points[i + 1].y) / 3,
      t: points[i].t,
      pressure: points[i].pressure
    });
  }
  smoothed.push(points[points.length - 1]);
  return smoothed;
}
```

### 视觉样式

儿童笔迹建议统一为：

```css
stroke-linecap: round;
stroke-linejoin: round;
opacity: 0.35;
filter: blur(0.2px);
```

颜色不完全由儿童随意选择，而应映射到当前元素色盘，保证场景统一。

---

## 8. 声音系统 SoundEngine

### 8.1 声音映射原则

声音不是点击播放固定文件，而应由笔触参数调节。

| 输入特征 | 声音变化 |
|---|---|
| 速度快 | 节奏更密、风声更明显、雨声更急 |
| 速度慢 | 声音更柔、间隔更大 |
| 密度高 | 雨滴更多、草声更明显 |
| 停顿长 | 声音逐渐淡出 |
| 收尾阶段 | 所有音量降低，环境音变柔 |

### 8.2 安全边界

儿童产品中声音不能突然刺耳。必须设置：

1. 最大音量限制。
2. 高频削弱。
3. 音量平滑过渡。
4. 快速乱画时自动降噪。
5. 默认静音开关。

### 8.3 Tone.js 示例逻辑

```js
class SoundEngine {
  constructor() {
    this.masterVolume = 0.4;
    this.activeLoops = {};
  }

  playRain(features) {
    const rate = 0.5 + features.densityNorm * 1.5;
    const volume = Math.min(0.45, 0.18 + features.densityNorm * 0.25);
    // 第一版可先用雨声音频片段 + 音量/播放速率变化
    this.playSample('rain', { volume, rate });
  }

  playLight(features) {
    const volume = Math.min(0.35, 0.15 + features.speedNorm * 0.15);
    this.playSample('light', { volume, rate: 1 });
  }

  playSample(name, options) {
    // 可使用 Howler.js 或原生 AudioBuffer 实现
  }

  settle() {
    // 所有声音 2-4 秒内渐弱
  }
}
```

第一版可以使用音频素材，第二版再加入合成音色。

---

## 9. 小灯角色系统

### 9.1 角色定位

小灯是 AI 的温和化身，不是机器人、医生或老师。

它负责：

- 提问；
- 陪伴；
- 给出温和创作邀请；
- 对场景变化作出反应；
- 收尾时帮助花园安放；
- 日记页生成旁白。

### 9.2 角色状态

| 状态 | 出现页面 | 表现 |
|---|---|---|
| sleep | 首页 | 小灯微弱，像刚醒 |
| ask | 状态选择页 | 小灯亮一点，弹出问题 |
| guide | AI 引导页 | 小灯给出创作建议 |
| react_rain | 绘画页 | 下雨时小灯轻轻躲雨或闪烁 |
| react_light | 绘画页 | 画光后小灯变亮 |
| settle | 收尾页 | 小灯稳定发光，帮助安放 |
| stamp | 日记页 | 小灯作为小印章出现 |

### 9.3 实现方式

第一版可以用：

- SVG 图形 + CSS 动画；
- Lottie JSON；
- Rive 动效。

不建议第一版做复杂 3D 角色。

---

## 10. 页面级实现方案

### 10.1 首页 HomePage

#### 目标

建立儿童绘本式小世界入口。

#### 必须出现

- 天空；
- 土地；
- 种子；
- 小灯；
- 少量小草；
- 柔和光线；
- “开始今天的花园”按钮。

#### 动效

- 小灯缓慢呼吸发光；
- 云极慢移动；
- 种子轻微晃动。

#### 不应出现

- 大量功能入口；
- 复杂菜单；
- 统计信息；
- 技术词汇。

---

### 10.2 状态选择页 MoodPage

#### 目标

将情绪入口转化为儿童可理解的小状态选择。

#### 推荐选项

| 状态 | 视觉物件 | 说明 |
|---|---|---|
| 有点快 | 跑动的小路 | 高唤醒、停不下来 |
| 有点重 | 小石头 | 低落、沉重 |
| 有点乱 | 被风吹散的小叶子 | 混乱、烦躁 |
| 有点空 | 空土地 | 疲惫、没力气 |
| 有点亮 | 小光点 | 积极、想分享 |
| 说不清 | 薄雾 | 允许模糊 |

#### 交互

点击某个物件后，背景花园轻微变化，小灯给出回应。

---

### 10.3 引导页 GuidePage

#### 目标

体现 AI 共创，但不暴露诊断感。

#### 文案原则

- 不说“你焦虑”。
- 不说“系统判断”。
- 使用场景语言。
- 使用邀请式表达。

示例：

```text
花园里的风好像跑得有点快。
你可以先画一阵风，让它流动出来；
也可以给它一点光，让这里慢慢亮起来。
```

---

### 10.4 创作页 CreatePage

#### 目标

完成“儿童输入 → 场景回应”的核心体验。

#### 布局

- 场景 Canvas 占据主体区域。
- 元素入口放在底部或边缘，像“小工具袋”。
- 小灯在角落提供短提示。
- 不显示调试数字。

#### 元素入口

第一版优先做：

1. 雨
2. 草
3. 光

第二版补充：

4. 风
5. 花

#### 关键体验要求

每个元素绘制完成后，必须有明显的场景变化。

---

### 10.5 安放页 SettlePage

#### 目标

解决画面可能杂乱的问题，形成疗愈收尾仪式。

#### 交互

- 长按屏幕；或
- 跟随呼吸光点 2-3 次。

#### 视觉变化

```text
原始线条透明度降低
过密线条柔化为纹理
环境音降低
小灯稳定发光
整体色调统一
画面进入柔和日记状态
```

---

### 10.6 日记页 DiaryPage

#### 目标

把一次互动沉淀为情绪场景日记。

#### 内容

- 最终花园图；
- 今日添加元素；
- 小灯故事回顾；
- 保存按钮。

#### 文案示例

```text
今天你给花园带来了一点雨，
后来又画出几株小草。
土地慢慢喝到水，绿色也长出来一点。
这是今天的花园，也是你今天留下的一段心情。
```

不出现心理诊断、焦虑评分或治疗判断。

---

## 11. 资产清单

### 11.1 场景资产

| 资产 | 状态 |
|---|---|
| 天空背景 | 普通 / 暖光 / 雨后 |
| 远景山丘 | 静态 |
| 土地 | 干燥 / 微湿 / 湿润 |
| 种子 | 睡着 / 湿润 / 发芽 |
| 小草 | 无 / 小芽 / 草丛 |
| 花 | 花苞 / 半开 / 开花 |
| 光 | 光点 / 光晕 / 暖色滤镜 |
| 云 | 静止 / 被风吹动 |
| 风痕 | 轻风 / 中风 |
| 水珠 | 少量 / 多量 |

### 11.2 角色资产

| 小灯状态 | 说明 |
|---|---|
| sleep | 首页睡着 |
| idle | 普通待机 |
| ask | 提问 |
| glow | 画光后变亮 |
| rain | 雨中轻微闪烁 |
| settle | 收尾稳定发光 |
| stamp | 日记印章 |

### 11.3 声音资产

| 声音 | 用途 |
|---|---|
| rain_light.mp3 | 小雨 |
| rain_dense.mp3 | 密雨 |
| grass_soft.mp3 | 草声 |
| light_chime.mp3 | 光点 |
| wind_soft.mp3 | 轻风 |
| bloom.mp3 | 开花 |
| settle_ambience.mp3 | 收尾环境音 |

---

## 12. 开发优先级

### P0：必须完成

1. Canvas / Pixi 花园场景。
2. 图层系统。
3. 雨、草、光三个元素生成器。
4. 场景状态引擎。
5. 小灯基础状态。
6. 声音基础反馈。
7. 安放模式。
8. 日记卡。

### P1：建议完成

1. 风元素。
2. 花元素。
3. 更细腻的笔触速度映射。
4. 小灯更多动效。
5. 本地保存多日日记。

### P2：后续扩展

1. 海洋场景。
2. 星空场景。
3. 父母端分享。
4. LLM 故事生成。
5. iPadOS SwiftUI 重构。
6. visionOS 空间场景。

---

## 13. 第一版高级 Demo 的最小目标

第一版不要追求功能多。只要实现以下效果，就能显著提升视觉与交互质量：

1. 首页看起来像一个真正的小花园，而不是抽象卡片页。
2. 儿童选择状态后，小灯给出温和引导。
3. 儿童画雨后，土地真的变湿。
4. 儿童画草后，地面真的长出草芽。
5. 儿童画光后，花园真的变暖，小灯变亮。
6. 声音会随笔触速度和密度变化。
7. 收尾时画面被柔化成一张可保存的日记卡。

只要这 7 点成立，Web Demo 就不再是简单线条堆叠，而是一个可被老师直观看懂的“会回应的儿童情绪场景”。

---

## 14. 不建议第一阶段做的事情

第一阶段暂不建议做：

- 多场景系统；
- VR / visionOS；
- 复杂 AI 情绪识别；
- 表情识别；
- 家长端完整系统；
- 社交分享；
- 积分等级；
- 大量任务系统；
- 实时 AI 图像生成。

这些功能会分散焦点。当前最重要的是把一个花园做得“会回应”。

---

## 15. 最终实现原则

本项目的 Web 高级视觉效果不应依赖“更多装饰”，而应依赖一套明确的生成逻辑：

> 儿童画的是情绪痕迹，系统生成的是场景回应。

因此，所有技术实现都应围绕这一点展开：

```text
输入不是最终画面，输入是触发条件；
线条不是装饰，线条是情绪动作；
场景不是背景，场景是回应系统；
声音不是附加，声音是实时反馈；
日记不是截图，日记是一次表达被安放后的结果。
```

这才是 BreathScape 从简单 Web Demo 升级为儿童情绪艺术 App 原型的关键。

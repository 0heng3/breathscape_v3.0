# BreathScape「息境」新版精确实现文档 v3

> 文档用途：本文件用于指导 `BreathScape` Web App Demo 的新一轮前端实现。它不是概念阐述稿，而是工程实现规格书，要求开发者能据此直接拆分组件、编写状态逻辑、实现 Canvas 绘制、DOM 动画、Web Audio 音效与日记保存。

---

## 0. 本版重构目标

本版方案解决上一版中五个核心风险：

1. 儿童不一定理解“今天心情像风/雨/阳光”这类成人化隐喻，因此入口从“天气隐喻”改为“具体小场景卡片”。
2. 儿童画的元素不能完全依赖 AI 猜测，因此采用“工具先验 + 线条特征 + 画布区域”的识别机制。
3. 绘画速度必须影响音效和动画，但不能变成高刺激反馈，因此所有声音与动画都有上限和平滑处理。
4. 儿童画不好、画太多、画得乱时，最终画面不能崩坏，因此采用“原始笔迹层 + 系统风格化转译层 + 收尾整理层”。
5. 场景变化必须明显可见，因此每一次有效绘制都必须触发：笔迹保留、元素生成、场景状态变化、声音变化、反馈文案更新、元素计数更新。

---

## 1. 产品定位

### 1.1 项目名称

中文名：息境  
英文名：BreathScape  
副标题：基于声景线描的儿童情绪场景日记原型

### 1.2 用户对象

6–12 岁儿童。Demo 以 iPad 横屏展示为主，兼容桌面浏览器预览。第一版不面向临床干预、不替代心理咨询、不做情绪诊断、不做风险评分。

### 1.3 核心体验链路

进入花园 → 选择今日小场景 → AI 生成温和创作建议 → 选择自然元素并绘制 → 场景实时回应 → 呼吸收尾整理画面 → 生成今日情绪场景日记 → 本地保存与回看。

### 1.4 核心机制

儿童不是在完成一幅“好看的画”，而是在用线条触发一个会回应的情绪花园。儿童的线条不被评价，系统只把线条转译为自然元素、声音和场景状态变化。最终作品是“被安放后的情绪痕迹”，不是绘画能力测试。

---

## 2. 儿童网站与儿童 App 风格约束

本项目不模仿高刺激儿童游戏，而参考低刺激、开放式、亲和、场景化的儿童应用风格。

### 2.1 风格参考原则

#### 参考方向 A：开放式探索

参考 Pok Pok、Sago Mini、Toca Boca 类儿童产品的“可探索小世界”逻辑。界面不应像表单或工具软件，而应让儿童进入一个完整的场景。儿童主要通过点、拖、画、听、看变化来理解系统。

落地要求：

- 首页必须出现完整情绪花园场景，而不是单纯渐变背景。
- 创作页画布占主视觉 60% 以上。
- 不使用排行榜、积分、失败提示、闯关倒计时。
- 每个元素都必须有可触发的视觉反馈。

#### 参考方向 B：安抚型声音与节奏

参考 Moshi Kids、儿童睡眠/放松类产品的低刺激声音体验。声音要柔和、有节制，不能像游戏奖励音效。

落地要求：

- 所有音效音量默认低于 0.35。
- 快速绘制只增加声音密度或亮度，不突然放大音量。
- 背景音永远缓慢、平稳，不出现尖锐、爆炸、失败音。
- 呼吸页必须逐渐降低风声、雨声与动画强度。

#### 参考方向 C：角色陪伴但不过度幼稚

参考 Khan Academy Kids 的角色引导和故事化路径，但 BreathScape 不做课程化任务。角色只作为温和陪伴，不做评价者。

落地要求：

- 可设置一个“花园小灯”或“小种子”作为陪伴元素。
- 不设置“老师”“医生”“AI 心理师”形象。
- 文案不使用命令式评价，如“你做得很棒”“你错了”“你应该冷静”。
- 使用邀请式语气，如“也可以试试”“要不要给它一点光”。

#### 参考方向 D：儿童隐私与安全

第一版 Demo 不做登录、不采集真实姓名、不上传图像、不做人脸识别、不做第三方广告、不接第三方统计 SDK。作品只保存在本地 localStorage。

---

## 3. 总体页面规格

### 3.1 主验收尺寸

- 主尺寸：1024 × 768，iPad 横屏。
- 扩展尺寸：1180 × 820、1366 × 1024。
- 桌面演示：浏览器居中显示 iPad 舞台框，不全屏拉伸。
- 竖屏兼容：768 × 1024，工具栏改为底部横向。

### 3.2 舞台容器

页面外层：`app-shell`  
尺寸：`width: 100vw; height: 100vh;`  
背景：浅米白到浅雾紫渐变，带 4% 纸张噪声。

内部舞台：`ipad-stage`  
默认：`width: min(100vw, 1180px); aspect-ratio: 4 / 3;`  
圆角：32px  
阴影：`0 24px 80px rgba(80, 64, 120, 0.18)`  
背景：`#FFF8EA` 纸张肌理。

### 3.3 全局字体

```css
font-family: "Nunito", "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif;
```

字体规范：

- 页面大标题：36–44px，字重 800。
- 页面副标题：20–24px，字重 600。
- 正文：18–22px，行高 1.55–1.75。
- 按钮：22–26px，字重 700。
- 工具按钮标签：15–17px，字重 700。
- 辅助说明：15–16px，不允许低于 14px。

### 3.4 色彩规范

| 用途 | 色值 | 说明 |
|---|---|---|
| 纸张底色 | `#FFF7E8` | 主背景，温暖安全 |
| 晨光黄 | `#F7C948` | 主按钮、阳光、关键行动 |
| 花影紫 | `#A88BE8` | 品牌、梦境空间、轻幻想 |
| 薄荷绿 | `#9ED8C3` | 草、生长、恢复 |
| 湖蓝 | `#8EC5E8` | 雨、水、湿润 |
| 花粉 | `#F5A8C8` | 花、柔和打开 |
| 土地棕 | `#C8A978` | 土坡、路径 |
| 深文本 | `#3F3A4A` | 主文字，避免纯黑 |
| 弱文本 | `#7A7285` | 辅助文字 |
| 卡片白 | `rgba(255,255,255,0.76)` | 半透明卡片 |

禁止：

- 大面积高饱和红色。
- 大面积高饱和紫色。
- 纯黑粗边框。
- 闪烁、高对比警示色。

### 3.5 动效规范

- 所有场景动效时长 600–1800ms。
- 呼吸动效周期 4800ms。
- 工具选中动效 180–260ms。
- 元素生成动效 500–1200ms。
- 不允许使用快速闪烁。
- 支持 `prefers-reduced-motion`：若用户系统减少动态效果，则保留状态变化但降低位移和透明度动画。

---

## 4. 信息架构与路由

```txt
/start          进入页
/mood-scene     今日小场景选择页
/guide          AI 场景初始化页
/garden         声景线描画布页
/breath         呼吸收尾页
/diary-card     今日花园日记卡页
/diary-list     我的情绪场景日记页
```

React 组件结构建议：

```txt
src/
  App.jsx
  routes/
    StartPage.jsx
    MoodScenePage.jsx
    GuidePage.jsx
    GardenPage.jsx
    BreathPage.jsx
    DiaryCardPage.jsx
    DiaryListPage.jsx
  components/
    StageFrame.jsx
    GardenScene.jsx
    SceneStateLayers.jsx
    ToolDock.jsx
    FeedbackBubble.jsx
    MoodSceneCard.jsx
    BreathingOrb.jsx
    DiaryCard.jsx
  engine/
    strokeEngine.js
    sceneState.js
    visualEffects.js
    audioEngine.js
    storyEngine.js
    storage.js
  styles/
    tokens.css
    layout.css
    animations.css
```

---

## 5. 数据结构

### 5.1 当前会话状态

```js
const sessionState = {
  selectedMoodScene: null,
  recommendedTools: [],
  strokes: [],
  elementHistory: [],
  sceneState: initialSceneState,
  feedbackText: "",
  diaryDraft: null
};
```

### 5.2 小场景卡片数据

```js
const moodScenes = [
  {
    id: "color_path",
    title: "彩色小路",
    childText: "今天好像可以慢慢往前走。",
    tendency: "轻松、好奇、愿意开始",
    visual: "warm path with small lights",
    recommendedTools: ["sun", "flower", "grass"],
    guideText: "今天的小路亮了一点。你可以先放一点光，也可以让路边长出几株小草。"
  },
  {
    id: "leaf_swirl",
    title: "乱叶团",
    childText: "心里好像有好多小东西在转。",
    tendency: "心乱、坐不住、事情太多",
    visual: "swirling leaves",
    recommendedTools: ["wind", "rain", "grass"],
    guideText: "今天花园里有一团小叶子在转。你可以画一点风，让它动出来；也可以点几滴雨，让地面慢慢安静。"
  },
  {
    id: "small_volcano",
    title: "小火山",
    childText: "心里有一点热热的、冲冲的。",
    tendency: "生气、冲动、想大声说",
    visual: "tiny volcano with warm steam",
    recommendedTools: ["rain", "grass", "wind"],
    guideText: "小火山有一点热。可以先点几滴雨，让土地凉一点；也可以种一点草，让旁边慢慢绿起来。"
  },
  {
    id: "little_stone",
    title: "小石头",
    childText: "心里好像有点重。",
    tendency: "委屈、低落、心里重",
    visual: "small stone near path",
    recommendedTools: ["grass", "flower", "sun"],
    guideText: "这块小石头有点重。可以在它旁边种一点草，或者给它一点光。"
  },
  {
    id: "snail_shell",
    title: "蜗牛壳",
    childText: "今天可能想躲一躲，也可以。",
    tendency: "害怕、不安、不想说",
    visual: "snail shell shelter",
    recommendedTools: ["sun", "flower", "grass"],
    guideText: "小蜗牛想躲一会儿也没关系。你可以放一点暖光，或者在旁边开一朵小花。"
  },
  {
    id: "dim_lamp",
    title: "没电小灯",
    childText: "今天的小灯可能有点没电。",
    tendency: "累、没力气、不想动",
    visual: "dim garden lamp",
    recommendedTools: ["sun", "grass", "rain"],
    guideText: "今天的小灯有点暗。可以先放一点光，也可以只种一株很小的草。"
  },
  {
    id: "fog_glass",
    title: "雾玻璃",
    childText: "今天还看不太清，也没关系。",
    tendency: "说不清、混合情绪、不知道",
    visual: "foggy glass and soft blur",
    recommendedTools: ["rain", "sun", "flower"],
    guideText: "今天的花园有一点雾。可以点几滴雨，也可以放一点光，让它慢慢清楚一点。"
  }
];
```

注意：入口意象不得与绘画工具完全重复。因此入口不用“风、雨、草、花、阳光”作为心情选项，而使用“彩色小路、乱叶团、小火山、小石头、蜗牛壳、没电小灯、雾玻璃”。

### 5.3 场景状态 sceneState

```js
const initialSceneState = {
  windEnergy: 0,
  rainDensity: 0,
  soilWetness: 0,
  grassCoverage: 0,
  flowerBloom: 0,
  sunlightWarmth: 0,
  visualClutter: 0,
  calmLevel: 0.2,
  brightness: 0.72,
  saturation: 0.78,
  soundIntensity: 0.15,
  lastTool: null,
  totalStrokeCount: 0,
  toolCounts: {
    wind: 0,
    rain: 0,
    grass: 0,
    flower: 0,
    sun: 0
  }
};
```

### 5.4 笔触数据 stroke

```js
const stroke = {
  id: "stroke_001",
  tool: "rain",
  points: [
    { x: 220, y: 180, t: 1020, pressure: 0.5 },
    { x: 223, y: 196, t: 1060, pressure: 0.5 }
  ],
  zone: "sky",
  length: 18,
  duration: 40,
  speedAvg: 0.45,
  speedMax: 0.62,
  direction: "down",
  densityLocal: 0.14,
  curvature: 0.12,
  closedness: 0.02,
  createdAt: 1760000000000
};
```

---

## 6. 页面一：进入页 `/start`

### 6.1 页面目标

让儿童知道这是一个可以慢慢进入的花园，不是测验、考试或绘画比赛。

### 6.2 页面布局

- 背景：全屏纸张肌理 + 雾紫/晨光黄柔和渐变。
- 中央主场景：一座安静花园，含小路、土坡、小种子、小灯、远山、轻云。
- 左上角：品牌区。
- 右下或底部中央：主按钮。

### 6.3 元素清单

| 元素 ID | 名称 | 视觉 | 生成方式 | 交互效果 |
|---|---|---|---|---|
| `brand_logo` | 息境 BreathScape | 手写感圆体，紫色小字 + 黄光点 | HTML text + CSS | 无 |
| `hero_garden_base` | 安静花园底图 | 纸张水彩风，远山、小土坡、小种子 | SVG/CSS 或位图插画 | 轻微呼吸光影 |
| `seed_idle` | 小种子 | 土坡中央一颗浅棕种子 | DOM div/SVG | 每 3 秒轻微发光 |
| `lamp_idle` | 小灯 | 路边暖黄小灯 | SVG | 1.6s 柔和闪动 |
| `intro_text` | 引导文案 | “不用马上说清楚，我们先画一条线。” | HTML | 无 |
| `start_button` | 开始今日花园 | 暖黄圆角胶囊按钮 | HTML button | 点击缩放 0.96，跳转 `/mood-scene` |

### 6.4 文案

标题：`欢迎来到息境`  
副文案：`不用马上说清楚，我们先画一条线。`  
按钮：`开始今日花园`

### 6.5 风格约束

首页不得出现“情绪评估”“检测”“测试”“治疗”“改善”等词。画面必须安静，不出现刺激性动画。

---

## 7. 页面二：今日小场景选择 `/mood-scene`

### 7.1 页面目标

让儿童通过具体小场景选择当下状态，避免抽象情绪命名。

### 7.2 页面布局

- 顶部标题：`今天的小花园更像哪一幕？`
- 副标题：`不用选得很准，哪个最像就点哪个。`
- 中央 7 张卡片：2 行布局，第一行 4 张，第二行 3 张居中。
- 底部安全提示：`选“看不清”也可以，我们可以一起画出来。`

### 7.3 卡片统一规格

- 尺寸：180 × 168 px。
- 圆角：28px。
- 背景：半透明白 + 纸张纹理。
- 图标区：90 × 80 px。
- 文字区：标题 22px，说明 15px。
- 点击热区：整张卡片。
- 选中态：外圈 4px 晨光黄描边 + 轻微上浮 + 背景变暖。

### 7.4 每张卡片实现

#### 7.4.1 彩色小路 `color_path`

视觉元素：

- 一条弯弯小路，从左下延伸到右上。
- 路边有 3 个小灯点。
- 路面有柔和黄、粉、绿三段色块。

实现效果：

- hover/触摸时小灯依次亮起。
- 点击后卡片内小路向前出现一小段光线。
- 进入 guide 页时，花园底图的小路亮度 +0.08。

推荐工具：阳光、花、草。

#### 7.4.2 乱叶团 `leaf_swirl`

视觉元素：

- 5–7 片小叶子围成旋转团。
- 叶子为浅棕、薄荷绿、淡紫。

实现效果：

- hover/触摸时叶子慢速旋转 8 度。
- 点击后叶子散开一点，不要快速旋转。
- 进入 guide 页时，画布中右侧出现一团可被风/雨影响的叶子。

推荐工具：风、雨、草。

#### 7.4.3 小火山 `small_volcano`

视觉元素：

- 一个很小的圆锥土丘。
- 顶部冒出红橙色柔和烟，不出现火焰爆炸。

实现效果：

- hover/触摸时烟轻轻上升。
- 点击后烟从红橙变成浅橙。
- 进入 guide 页时，花园局部暖色 +0.08，雨工具推荐高亮。

推荐工具：雨、草、风。

#### 7.4.4 小石头 `little_stone`

视觉元素：

- 路边一块圆圆的浅灰紫石头。
- 石头旁边有一点空地。

实现效果：

- hover/触摸时石头下方阴影变浅。
- 点击后石头旁边出现一个小光点。
- 进入 guide 页时，花园地面保留一块“可照料区域”。

推荐工具：草、花、阳光。

#### 7.4.5 蜗牛壳 `snail_shell`

视觉元素：

- 一个小蜗牛壳，没有表情或只有非常弱的小点。
- 壳旁边有一片叶子。

实现效果：

- hover/触摸时壳旁叶子轻动。
- 点击后壳旁出现暖光保护圈。
- 进入 guide 页时，整体动画速度降低 10%。

推荐工具：阳光、花、草。

#### 7.4.6 没电小灯 `dim_lamp`

视觉元素：

- 一盏亮度很弱的小灯。
- 灯光范围很小。

实现效果：

- hover/触摸时灯微微亮一下。
- 点击后灯光保持低亮，不强行变亮。
- 进入 guide 页时，阳光工具推荐高亮。

推荐工具：阳光、草、雨。

#### 7.4.7 雾玻璃 `fog_glass`

视觉元素：

- 一块圆角玻璃，上面有淡淡雾气。
- 背后花园轮廓模糊。

实现效果：

- hover/触摸时雾气轻微流动。
- 点击后玻璃出现一小块清晰区域。
- 进入 guide 页时，画布叠加低透明雾层。

推荐工具：雨、阳光、花。

---

## 8. 页面三：AI 场景初始化 `/guide`

### 8.1 页面目标

把儿童选择的小场景转化为温和创作建议。系统不解释心理学，不做诊断。

### 8.2 页面布局

- 左侧 65%：初始花园场景。
- 右侧 35%：引导卡片。
- 引导卡片包含：选择的小场景图、2–3 句建议、3 个推荐工具小按钮、进入画布按钮。

### 8.3 元素清单

| 元素 ID | 名称 | 视觉 | 生成方式 | 页面变化 |
|---|---|---|---|---|
| `garden_preview` | 初始花园预览 | 根据 moodScene 改变初始氛围 | GardenScene 组件 | 场景状态差异明显 |
| `scene_token` | 已选场景小图 | 与上一页一致 | SVG/DOM | 无 |
| `guide_text` | AI 引导文案 | 2–3 行，圆角白卡 | HTML | 根据 moodScene 变化 |
| `recommended_tools` | 推荐元素 | 3 个小圆按钮 | ToolIcon | 点击可预选工具 |
| `enter_garden_button` | 进入画布 | 主按钮 | HTML button | 跳转 `/garden` |

### 8.4 场景初始化规则

```js
function applyMoodScene(sceneId, state) {
  switch(sceneId) {
    case "color_path":
      state.brightness += 0.08;
      state.sunlightWarmth += 0.1;
      break;
    case "leaf_swirl":
      state.windEnergy += 0.18;
      state.visualClutter += 0.12;
      break;
    case "small_volcano":
      state.sunlightWarmth += 0.16;
      state.saturation += 0.04;
      break;
    case "little_stone":
      state.brightness -= 0.04;
      state.calmLevel += 0.08;
      break;
    case "snail_shell":
      state.calmLevel += 0.16;
      state.animationSpeed = 0.9;
      break;
    case "dim_lamp":
      state.brightness -= 0.08;
      state.sunlightWarmth -= 0.04;
      break;
    case "fog_glass":
      state.fogOpacity = 0.28;
      state.brightness -= 0.02;
      break;
  }
}
```

---

## 9. 页面四：声景线描画布 `/garden`

### 9.1 页面目标

这是 Demo 核心。儿童选择自然元素并绘制，每一笔都会让花园发生明显变化。

### 9.2 布局

横屏布局：

```txt
┌──────────────────────────────────────────────────────────────┐
│ 顶部：今日花园标题 + 当前反馈一句话 + 完成按钮                 │
├──────────────┬─────────────────────────────┬─────────────────┤
│ 左侧工具栏    │ 中央花园画布                 │ 右侧状态/反馈栏   │
│ 5 个自然元素  │ 固定底图 + Canvas + 动效层    │ 元素计数/提示     │
└──────────────┴─────────────────────────────┴─────────────────┘
```

尺寸：

- 左侧工具栏：112px。
- 中央画布：720 × 520 px，最小不低于 640 × 460 px。
- 右侧反馈栏：260px。
- 顶部栏：72px。

### 9.3 画布图层

从下到上：

| 层级 | 名称 | 组件/技术 | 作用 |
|---|---|---|---|
| 0 | 纸张背景层 | CSS | 纸张肌理、柔和底色 |
| 1 | 花园底图层 | SVG/位图 | 固定场景：远山、土坡、小路、小灯、河带 |
| 2 | 场景状态层 | DOM/SVG | 土壤湿润、亮度、雾、风、植物摇动 |
| 3 | 原始笔迹层 | Canvas | 儿童真实线条，低透明度保留 |
| 4 | 风格化元素层 | DOM/SVG/Canvas | 系统生成的雨滴、草、花、光点、风线 |
| 5 | 临时动效层 | DOM | 每笔触发的粒子、涟漪、发光 |
| 6 | UI 覆盖层 | HTML | 提示、工具选中态、完成按钮 |

### 9.4 工具栏统一规格

每个工具按钮：

- 尺寸：76 × 76 px。
- 圆角：24px。
- 间距：14px。
- 图标：38px。
- 标签：14–16px。
- 选中态：按钮上浮 4px、外圈晨光黄描边、背景更亮、右侧出现小标签“正在画：风”。

### 9.5 工具一：风 `wind`

#### 9.5.1 按钮生成

按钮图标：三条弯曲风线 + 小风铃点。  
按钮文字：`风`  
按钮颜色：湖蓝绿 `#8EC5E8` 与薄荷绿渐变。

#### 9.5.2 儿童绘制方式

允许：横向长线、波浪线、旋转线、弧线。  
不要求画得像风，只要当前工具是风，系统就按风处理。

#### 9.5.3 笔触识别

```js
const isWindLike =
  stroke.length > 50 ||
  stroke.curvature > 0.25 ||
  stroke.direction === "horizontal" ||
  stroke.closedness < 0.2;
```

若不符合，也仍作为“轻风”处理，不提示错误。

#### 9.5.4 视觉生成效果

每完成一笔风：

1. 原始笔迹层保留一条浅蓝透明线。
2. 风格化层生成 2–4 条半透明风线。
3. 花草摇动幅度增加。
4. 小灯火光向风向偏移 3–8px。
5. 右侧风计数 +1。
6. 顶部反馈更新。

生成参数：

```js
windLineCount = clamp(2 + Math.round(stroke.speedAvg * 3), 2, 5);
windAlpha = clamp(0.18 + stroke.speedAvg * 0.12, 0.18, 0.34);
windDrift = clamp(stroke.speedAvg * 16, 4, 24);
sceneState.windEnergy = clamp(sceneState.windEnergy + 0.08 + stroke.speedAvg * 0.08, 0, 1);
```

#### 9.5.5 音效

- 慢速：轻微风声，音量 0.12–0.18。
- 中速：增加风铃泛音，音量 0.18–0.25。
- 快速：风声明显但不刺耳，音量最高 0.32。

音效映射：

```js
windGain = clamp(0.12 + speedAvg * 0.22, 0.12, 0.32);
windFilterFreq = clamp(500 + speedAvg * 900, 500, 1400);
```

#### 9.5.6 文案反馈

低速：`风轻轻来了。`  
中速：`风把花园里的声音带动了一点。`  
高速/多次：`风已经很明显了，也可以给它留一点安静的地方。`

### 9.6 工具二：雨 `rain`

#### 9.6.1 按钮生成

按钮图标：3 个小雨滴。  
按钮文字：`雨`  
按钮颜色：湖蓝 `#8EC5E8`。

#### 9.6.2 儿童绘制方式

允许：点、短竖线、向下划线、重复轻点。

#### 9.6.3 笔触识别

```js
const isRainLike =
  stroke.length < 70 ||
  stroke.direction === "down" ||
  stroke.pointCount < 8;
```

若孩子画长线，也转译成“雨线/小溪痕迹”，不提示错误。

#### 9.6.4 视觉生成效果

每完成一笔雨：

1. 原始笔迹层保留浅蓝点线。
2. 风格化层生成 4–12 个雨滴。
3. 土壤颜色从干土棕逐渐变为湿土棕。
4. 土坡边缘出现 1–3 个浅色水渍。
5. 若 `soilWetness > 0.35`，自动触发 1–2 株小草冒芽。
6. 右侧雨计数 +1。
7. 顶部反馈更新。

土壤变化必须明显：

```js
sceneState.soilWetness = clamp(sceneState.soilWetness + 0.1 + stroke.densityLocal * 0.2, 0, 1);
soilColor = lerpColor("#C8A978", "#A9865F", sceneState.soilWetness);
soilDarkPatchOpacity = 0.12 + sceneState.soilWetness * 0.35;
```

#### 9.6.5 音效

- 点得少：单个轻雨滴。
- 点得多：雨滴密度增加。
- 画得快：雨滴间隔更短，但音量不超过 0.30。

```js
rainInterval = clamp(220 - speedAvg * 120, 80, 220);
rainGain = clamp(0.1 + densityLocal * 0.25, 0.1, 0.3);
```

#### 9.6.6 文案反馈

低密度：`雨点落下来了。`  
中密度：`土地慢慢喝到水了。`  
湿润阈值后：`有一点绿色好像准备冒出来。`

### 9.7 工具三：草 `grass`

#### 9.7.1 按钮生成

按钮图标：三株向上短草。  
按钮文字：`草`  
按钮颜色：薄荷绿 `#9ED8C3`。

#### 9.7.2 儿童绘制方式

允许：从下往上的短线、竖线、小撇线。建议在地面区域画，但不强制。

#### 9.7.3 画布区域规则

草优先生成在 ground zone。若孩子在天空区域画草，系统将对应草投射到最近的地面坐标，同时保留原始淡笔迹。

```js
if (tool === "grass" && stroke.zone !== "ground") {
  generatedY = nearestGroundY(stroke.centerX);
} else {
  generatedY = stroke.centerY;
}
```

#### 9.7.4 视觉生成效果

每完成一笔草：

1. 原始笔迹层保留绿色短线。
2. 风格化层在地面生成 3–7 株小草。
3. 草覆盖率增加。
4. 草会受风影响轻摇。
5. 若 `soilWetness > 0.25`，草颜色更鲜明，生长高度 +15%。
6. 右侧草计数 +1。

```js
grassAmount = clamp(3 + Math.round(stroke.length / 18), 3, 8);
grassHeight = clamp(12 + stroke.speedAvg * 10 + sceneState.soilWetness * 8, 12, 30);
sceneState.grassCoverage = clamp(sceneState.grassCoverage + grassAmount * 0.025, 0, 1);
```

#### 9.7.5 音效

- 慢画：轻沙沙声。
- 快画：沙沙声更短、更密。
- 土壤湿润时：增加非常轻的柔和木琴音。

#### 9.7.6 文案反馈

`一点绿色长出来了。`  
`它不需要很快，只要慢慢长。`  
`草地比刚才更柔软了一点。`

### 9.8 工具四：花 `flower`

#### 9.8.1 按钮生成

按钮图标：圆心 + 5 个花瓣。  
按钮文字：`花`  
按钮颜色：花粉 `#F5A8C8`。

#### 9.8.2 儿童绘制方式

允许：圆、弧线、点状花瓣、任意局部小线团。

#### 9.8.3 识别规则

```js
const flowerScale = stroke.closedness > 0.45 ? "bloom" : "bud";
```

画得不像花也不失败：闭合度低则生成花苞，闭合度高则生成开放花。

#### 9.8.4 视觉生成效果

每完成一笔花：

1. 原始笔迹层保留粉色线。
2. 风格化层在最近地面位置生成一个花苞或小花。
3. 若 `sunlightWarmth > 0.3`，花开放程度更高。
4. 若 `grassCoverage > 0.2`，花优先长在草旁边。
5. 花会跟随风能轻微摆动。
6. 右侧花计数 +1。

```js
flowerOpen = clamp(0.25 + stroke.closedness * 0.35 + sceneState.sunlightWarmth * 0.3, 0.25, 1);
sceneState.flowerBloom = clamp(sceneState.flowerBloom + 0.08 + flowerOpen * 0.04, 0, 1);
```

#### 9.8.5 音效

- 花苞：柔和短音。
- 开放花：两段上行泛音。
- 快速乱画：只播放一次花苞音，避免连续高频铃音。

#### 9.8.6 文案反馈

`花开了一点点。`  
`它不用一下子完全打开。`  
`花园多了一个柔软的颜色。`

### 9.9 工具五：阳光 `sun`

#### 9.9.1 按钮生成

按钮图标：圆点 + 放射线。  
按钮文字：`光`  
按钮颜色：晨光黄 `#F7C948`。

注意：按钮标签建议用“光”，不是“阳光”，更短、更像操作词。

#### 9.9.2 儿童绘制方式

允许：点、短线、放射线、小圆圈。

#### 9.9.3 区域规则

若在天空区绘制：生成光束。  
若在地面区绘制：生成光斑。  
若在植物附近绘制：植物颜色变暖。

#### 9.9.4 视觉生成效果

每完成一笔光：

1. 原始笔迹层保留浅黄色线。
2. 风格化层生成 3–8 个柔和光点。
3. 全局亮度 +0.03 至 +0.08。
4. 花和草颜色暖度提升。
5. 小灯亮度提升。
6. 若 `fogOpacity > 0`，雾层透明度降低。
7. 右侧光计数 +1。

```js
sceneState.sunlightWarmth = clamp(sceneState.sunlightWarmth + 0.08 + stroke.speedAvg * 0.04, 0, 1);
sceneState.brightness = clamp(sceneState.brightness + 0.03, 0.65, 0.92);
sceneState.fogOpacity = clamp(sceneState.fogOpacity - 0.06, 0, 0.35);
```

#### 9.9.5 音效

- 点状光：小木琴音。
- 放射线：柔和铃音。
- 快速多笔：音色变亮但限频，避免尖锐。

#### 9.9.6 文案反馈

`一点光落下来了。`  
`花园比刚才暖了一点。`  
`这点光刚刚好。`

---

## 10. 每一笔后的强制变化规则

每次 `pointerup` 后触发 `commitStroke()`。开发时必须保证：只要该笔有效，页面至少发生 6 个变化。

### 10.1 有效笔触判断

```js
const isValidStroke = stroke.duration > 60 || stroke.length > 8 || stroke.points.length >= 3;
```

若无效，例如误触，系统不报错，只生成一个非常小的光点或忽略。

### 10.2 强制变化清单

每一笔有效绘制后必须执行：

1. `drawRawStroke(stroke)`：原始笔迹层出现半透明线条。
2. `spawnStyledElement(stroke.tool, stroke)`：生成统一风格元素。
3. `updateSceneState(stroke.tool, stroke)`：更新全局状态。
4. `playElementSound(stroke.tool, stroke.speedAvg)`：播放对应音效。
5. `updateFeedbackText(stroke.tool, sceneState)`：更新顶部或右侧文案。
6. `incrementToolCounter(stroke.tool)`：右侧计数变化。
7. `animateAffectedArea(stroke.tool)`：局部区域出现明显动效。

### 10.3 明显变化标准

为了避免“画了但看不出来”，每种工具都有最低可见变化量：

| 工具 | 最低变化量 |
|---|---|
| 风 | 至少生成 2 条风线，至少 1 组植物摇动 |
| 雨 | 至少生成 4 个雨滴，土壤湿润透明层 +0.06 |
| 草 | 至少生成 3 株草，地面绿色覆盖 +0.04 |
| 花 | 至少生成 1 个花苞或花，局部颜色变亮 |
| 光 | 至少生成 3 个光点，画面亮度 +0.03 |

### 10.4 反馈节制

若连续 3 次使用同一工具，不继续无限增强，而是进入“整理建议”：

```js
if (toolCounts[currentTool] >= 3 && lastThreeToolsSame()) {
  feedbackText = "这里已经很明显了，也可以给花园留一点空地。";
  sceneState.visualClutter = clamp(sceneState.visualClutter + 0.08, 0, 1);
}
```

---

## 11. 画面兜底整理机制

### 11.1 为什么需要兜底

儿童可能画得乱、画得少、画得过多、画得不像。系统不能因此生成失败画面，也不能评价儿童画得不好。

### 11.2 四层处理

| 层级 | 处理方式 | 目的 |
|---|---|---|
| 原始笔迹层 | 保留但透明度 0.22–0.38 | 尊重儿童表达 |
| 风格化转译层 | 生成统一水彩元素 | 保证视觉统一 |
| 密度整理层 | 高密度线条转成云雾/叶堆/土壤纹理 | 防止画面脏乱 |
| 呼吸收尾层 | 降低强度、柔化边缘、统一色调 | 生成可保存日记卡 |

### 11.3 画太多的处理

```js
if (sceneState.visualClutter > 0.65) {
  rawStrokeOpacity = 0.18;
  convertDenseAreaToTexture({ type: "soft_mist" });
  feedbackText = "花园里已经留下了很多痕迹，我们可以让它慢慢安静一点。";
}
```

表现：

- 过密区域不再堆叠强线条。
- 系统生成浅雾、叶堆或土壤纹理覆盖。
- 不出现“画太多了”“请清空”这类评价。

### 11.4 画太少的处理

若儿童 60 秒内只画 0–1 笔：

- 允许进入呼吸收尾。
- 日记卡生成“今天的花园很安静”的版本。
- 系统补充极少量自然细节，例如一颗种子、一点光、一片草。

文案：

`今天的花园很安静。安静也可以被留下来。`

### 11.5 画错位置的处理

例如在天空画草：

- 原始笔迹保留在天空，透明度降低。
- 系统风格化草生成在最近地面。
- 不提示错误。

### 11.6 画得不像的处理

工具先验优先。例如当前工具是花，即使孩子画成乱线，也生成花苞而不是识别失败。

---

## 12. 声音系统实现

### 12.1 声音原则

- 声音是环境反馈，不是奖励音效。
- 不使用失败音、金币音、爆炸音。
- 所有声音都可一键静音。
- 第一次播放前需要用户交互启动 AudioContext。

### 12.2 audioEngine 接口

```js
const audioEngine = {
  init(),
  setMuted(boolean),
  playWind({ speed, density }),
  playRain({ speed, density }),
  playGrass({ speed, wetness }),
  playFlower({ openness }),
  playSun({ brightness }),
  setAmbient({ calmLevel, windEnergy, rainDensity }),
  fadeToCalm(duration = 4000)
};
```

### 12.3 速度映射

```js
function normalizeSpeed(speedAvg) {
  return clamp(speedAvg / 1.2, 0, 1);
}
```

| 速度 | 声音影响 | 动画影响 |
|---|---|---|
| 0–0.25 | 音量低、节奏慢 | 元素缓慢生成 |
| 0.25–0.65 | 标准反馈 | 标准生成 |
| 0.65–1 | 密度增加、音量有限 | 风线/雨滴更多，但不刺激 |

### 12.4 音量上限

```js
const MAX_GAIN = {
  wind: 0.32,
  rain: 0.30,
  grass: 0.22,
  flower: 0.24,
  sun: 0.24,
  ambient: 0.18
};
```

---

## 13. 呼吸收尾页 `/breath`

### 13.1 页面目标

让花园从活跃状态过渡到安放状态，同时整理画面，为日记卡做准备。

### 13.2 页面元素

| 元素 ID | 名称 | 视觉 | 效果 |
|---|---|---|---|
| `garden_final_preview` | 花园预览 | 使用当前 sceneState | 风雨逐渐减弱 |
| `breathing_orb` | 呼吸光点 | 中央暖黄/浅紫光点 | 4.8s 放大缩小 |
| `breath_text` | 呼吸提示 | “跟着光点吸气 / 慢慢呼气” | 随阶段变化 |
| `calm_progress` | 3 次呼吸进度 | 三个小点 | 每完成一次点亮 |
| `finish_button` | 生成今日花园 | 呼吸后出现 | 跳转日记卡 |

### 13.3 收尾状态变化

```js
function applyBreathCalming(state) {
  state.windEnergy *= 0.45;
  state.rainDensity *= 0.35;
  state.soundIntensity *= 0.35;
  state.brightness = clamp(state.brightness + 0.04, 0.65, 0.9);
  state.calmLevel = clamp(state.calmLevel + 0.45, 0, 1);
  state.visualClutter = clamp(state.visualClutter - 0.25, 0, 1);
}
```

视觉表现：

- 风线透明度下降。
- 雨滴数量减少。
- 草和花摆动减弱。
- 土地与背景统一成柔和色。
- 过密笔触变成浅雾或纸张纹理。
- 背景音逐渐变平稳。

---

## 14. 日记卡页 `/diary-card`

### 14.1 页面目标

生成一张“今日花园日记卡”，记录过程而不是评估结果。

### 14.2 日记卡结构

| 区域 | 内容 | 说明 |
|---|---|---|
| 顶部 | 今日日期 + 作品名输入 | 默认“今天的小花园” |
| 中央 | 整理后的花园图 | 不直接使用混乱原图 |
| 下方 | 元素标签 | 风、雨、草、花、光的使用顺序 |
| 故事区 | 一段非评判式回顾 | 根据 elementHistory 生成 |
| 操作区 | 保存日记 / 回到首页 / 查看日记 | localStorage |

### 14.3 日记图生成

日记图不是 Canvas 原图截图，而是 `GardenSnapshot` 组件渲染的整理版：

- 原始笔迹透明度降低到 0.16–0.24。
- 风格化元素保留。
- 高密度区域转化为柔雾/纹理。
- 场景色彩统一。
- 小灯、种子、小路等底图元素保留。

### 14.4 故事生成规则

输入：`elementHistory`、`selectedMoodScene`、`sceneState`。

示例规则：

```js
function generateDiaryStory(history, moodScene, state) {
  const first = history[0]?.tool;
  const main = mostUsedTool(history);
  const ending = state.calmLevel > 0.6 ? "后来，花园慢慢安静了一点。" : "这些痕迹留在花园里，也可以被慢慢看见。";
  return `今天的小花园一开始像${moodScene.title}。你先带来了${toolName(first)}，后来又留下了${toolName(main)}。${ending}`;
}
```

禁止词：

- 焦虑降低
- 情绪改善
- 治愈成功
- 心理风险
- 负面情绪
- 诊断结果
- 评分
- 异常

---

## 15. 日记列表页 `/diary-list`

### 15.1 页面目标

展示本地保存的情绪场景日记，强化“回看作品”而不是“查看数据”。

### 15.2 页面元素

| 元素 | 视觉 | 实现 |
|---|---|---|
| 页面标题 | 我的情绪场景日记 | 36px 粗圆体 |
| 日记卡列表 | 2–3 列卡片 | localStorage 读取 |
| 本周小地图 | 7 个小花园点 | 按日期生成 |
| 回顾文案 | 温和总结 | 不使用统计诊断语言 |

### 15.3 本周回顾文案

示例：

`这一周，你的花园里出现过雨、草和一点光。有几天很安静，有几天慢慢热闹起来。这些都是你留下的心情痕迹。`

---

## 16. 核心函数伪代码

### 16.1 commitStroke

```js
function commitStroke(rawPoints, currentTool) {
  const stroke = analyzeStroke(rawPoints, currentTool);

  if (!isValidStroke(stroke)) {
    spawnTinySoftDot(stroke.center);
    return;
  }

  drawRawStroke(stroke);
  const generated = spawnStyledElement(currentTool, stroke, sceneState);
  updateSceneState(currentTool, stroke, sceneState);
  playElementSound(currentTool, stroke, sceneState);
  updateToolCounter(currentTool);
  updateFeedbackText(currentTool, stroke, sceneState);
  appendElementHistory(currentTool, stroke, generated);
  checkClutterAndGuide(sceneState);
}
```

### 16.2 updateSceneState

```js
function updateSceneState(tool, stroke, state) {
  state.totalStrokeCount += 1;
  state.toolCounts[tool] += 1;
  state.lastTool = tool;

  const speed = normalizeSpeed(stroke.speedAvg);

  switch (tool) {
    case "wind":
      state.windEnergy = clamp(state.windEnergy + 0.08 + speed * 0.08, 0, 1);
      break;
    case "rain":
      state.rainDensity = clamp(state.rainDensity + 0.1 + speed * 0.06, 0, 1);
      state.soilWetness = clamp(state.soilWetness + 0.1 + stroke.densityLocal * 0.2, 0, 1);
      if (state.soilWetness > 0.35) state.grassCoverage = clamp(state.grassCoverage + 0.035, 0, 1);
      break;
    case "grass":
      state.grassCoverage = clamp(state.grassCoverage + 0.08, 0, 1);
      state.calmLevel = clamp(state.calmLevel + 0.03, 0, 1);
      break;
    case "flower":
      state.flowerBloom = clamp(state.flowerBloom + 0.1, 0, 1);
      state.saturation = clamp(state.saturation + 0.02, 0.7, 0.9);
      break;
    case "sun":
      state.sunlightWarmth = clamp(state.sunlightWarmth + 0.08, 0, 1);
      state.brightness = clamp(state.brightness + 0.03, 0.65, 0.92);
      state.fogOpacity = clamp((state.fogOpacity || 0) - 0.06, 0, 0.35);
      break;
  }

  state.visualClutter = clamp(state.visualClutter + estimateClutter(stroke), 0, 1);
}
```

---

## 17. CSS 动效命名

```css
@keyframes softPulse {}
@keyframes lampGlow {}
@keyframes windDrift {}
@keyframes rainDrop {}
@keyframes grassGrow {}
@keyframes flowerBloom {}
@keyframes sunGlow {}
@keyframes fogEase {}
@keyframes breathOrb {}
@keyframes cardFloat {}
```

动效必须满足：慢、柔、可预测，不制造强闪烁。

---

## 18. 验收清单

### 18.1 页面验收

- `/start` 能显示完整花园入口，并跳转小场景选择。
- `/mood-scene` 有 7 张不重复的小场景卡片。
- `/guide` 根据每张小场景生成不同的花园初始状态和推荐工具。
- `/garden` 5 个工具均可选择、绘制、生成反馈。
- `/breath` 能让花园明显变柔、变安静。
- `/diary-card` 能生成整理版日记卡。
- `/diary-list` 能展示 localStorage 保存的日记。

### 18.2 交互验收

每个工具至少测试 5 笔，每一笔后必须有明显变化：

- 风：风线出现，植物摇动。
- 雨：雨滴出现，土壤变湿。
- 草：地面长草。
- 花：花苞或花出现。
- 光：画面变亮，光点出现。

### 18.3 兜底验收

- 儿童画得很乱，最终日记卡仍然风格统一。
- 儿童画得很少，也能生成“安静花园”日记。
- 儿童在错误区域画元素，系统不报错，自动投射到合理位置。
- 连续快速绘制不会产生刺耳声音或强闪烁。

### 18.4 语言边界验收

页面中不得出现以下词：

- 焦虑
- 抑郁
- 诊断
- 治疗
- 疗效
- 改善明显
- 风险
- 异常
- 分数
- 失败
- 错误

---

## 19. 给 Codex / Claude Code 的开发提示词

请基于本 Markdown 文档实现 BreathScape Web App Demo。技术栈为 Vite + React + CSS + Canvas + Web Audio API + localStorage。请严格按文档实现 7 个页面：`/start`、`/mood-scene`、`/guide`、`/garden`、`/breath`、`/diary-card`、`/diary-list`。

重点要求：

1. 首页和画布必须呈现儿童网站风格的低刺激、高完成度、可进入的小花园世界，不要做成成人后台界面或普通表单。
2. 心情入口使用 7 个具体小场景卡片：彩色小路、乱叶团、小火山、小石头、蜗牛壳、没电小灯、雾玻璃。不要再使用风、雨、草、花、阳光作为心情选项。
3. 创作页必须使用“工具先验 + 线条特征 + 场景状态”的机制。儿童先选工具，再绘制。系统不评价画得像不像。
4. 每一笔有效绘制后必须同时触发：原始笔迹保留、风格化元素生成、场景状态改变、声音反馈、反馈文案更新、计数更新。
5. 风、雨、草、花、光五个工具必须分别实现明显变化：风线和植物摇动、雨滴和土壤湿润、草生长、花开放、光点和亮度提升。
6. 画得太乱时，系统通过降低原始笔迹透明度、转化为柔雾/纹理、呼吸收尾来整理画面，不能提示儿童画错或画得不好。
7. 呼吸页必须让风变轻、雨变小、声音降低、画面变柔，并生成适合保存的日记卡。
8. 所有文案必须非诊断、非评价、非疗效声明。
9. 构建命令 `npm run build` 必须成功。

---

## 20. 版本结论

本版实现的核心不是“让儿童画一张漂亮的花园”，而是让儿童每一笔都能被花园接住、转译和安放。儿童画得好不好不是系统判断标准；系统要保证每一笔都有回应，最终作品有统一风格，并且全过程不制造诊断、测评或失败感。


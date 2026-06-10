# BreathScape「息境」七日情绪花园 Demo 实现规格 v4

> 目标读者：Codex / Claude Code / 前端开发者  
> 目标产物：一个可在 iPad 横屏演示的 Vite + React Web App 原型  
> 项目定位：面向 6–12 岁儿童的非诊断式情绪表达与轻度调节原型  
> 核心链路：一周地图 → 今日状态选择 → 今日专属花园 → 声景线描创作 → 明显场景变化 → 呼吸收尾 → 今日情绪场景日记 → 本周花园地图

---

## 0. 强制原则

本项目不是普通儿童画板，也不是心理测评工具。实现时必须遵守以下原则：

1. **非诊断**：界面不得出现“焦虑、抑郁、风险、治疗、疗效、评分、改善明显”等医学或测评语言。
2. **非评判**：不得评价儿童“画得好/不好”“画错了/正确”。
3. **儿童笔迹是输入信号，不是最终美术成品**：儿童画的线条必须保留为低透明度痕迹，同时被系统转译成统一风格的自然元素。
4. **每一笔必须引起明显场景变化**：不能只是画布多一条线。必须同时触发笔迹、风格化元素、状态变量、动画、声音、反馈文案。
5. **七天布局必须不同**：一周七天不是换色皮肤，而是七个不同花园区域、不同空间构图、不同可绘制元素和不同调节目标。
6. **低刺激儿童风格**：参考 Pok Pok、Sago Mini、Moshi Kids、Khan Academy Kids 的低压力、开放式探索、少文字、大触控、柔和声景方向；不得做成强游戏化、排行榜、金币、连续签到、失败惩罚。
7. **儿童隐私保护**：第一版 Demo 不做登录、广告、第三方统计、摄像头、人脸识别、云端上传。所有日记保存在 localStorage。

---

## 1. 技术栈

### 1.1 推荐栈

- Vite + React + TypeScript
- CSS Modules 或普通 CSS 变量
- Canvas 2D：儿童原始笔迹层与部分粒子渲染
- DOM/SVG：工具按钮、卡片、局部装饰、可控动画
- Web Audio API：合成柔和音效，不依赖外部音频资源
- localStorage：保存每日日记与本周地图状态

### 1.2 不使用

- 不使用后端服务
- 不使用第三方广告/统计 SDK
- 不使用真实人脸/情绪识别
- 不使用会导致构建复杂的重型 3D 引擎
- 不依赖外部图片素材；如需插画，优先 CSS/SVG/Canvas 生成

### 1.3 构建要求

项目必须能执行：

```bash
npm install
npm run build
npm run preview
```

若现有项目不是 TypeScript，也可以使用 JavaScript，但代码结构必须清晰。

---

## 2. 页面架构

### 2.1 路由建议

若项目已有路由，按现有结构兼容；若无路由，可使用内部 state 控制页面。

建议页面：

```txt
/                         进入页
/week-map                 一周花园地图
/state-select/:day        今日状态选择
/day-intro/:day           今日花园初始化与 AI 温和引导
/garden/:day              今日声景线描画布
/breathe/:day             呼吸收尾
/diary/:day               今日情绪场景日记卡
/week-review              本周花园回顾
```

### 2.2 页面流转

```txt
进入页
  ↓
一周花园地图
  ↓ 点击今日花园
今日状态选择
  ↓ 选择具体小场景卡
今日花园初始化
  ↓ 点击“进入今天的花园”
声景线描画布
  ↓ 点击“让花园慢慢安放”
呼吸收尾
  ↓ 自动/点击完成
今日日记卡
  ↓ 保存
本周花园地图 / 本周回顾
```

---

## 3. 全局视觉规范

### 3.1 尺寸

主验收尺寸：iPad 横屏 1024 × 768。  
页面容器建议：`max-width: 1180px; aspect-ratio: 4 / 3;`  
桌面端居中显示，不要把画布无限拉伸。

### 3.2 色彩

CSS 变量建议：

```css
:root {
  --paper: #fff7e8;
  --paper-2: #f6f0ff;
  --morning-yellow: #f7c948;
  --soft-orange: #f5a35c;
  --garden-purple: #a88be8;
  --mint: #9ed8c3;
  --lake-blue: #8ec5e8;
  --flower-pink: #f5a8c8;
  --soil-dry: #e8cfa9;
  --soil-wet: #bfa37a;
  --text-main: #3f3a4a;
  --text-soft: #6f687a;
  --card-white: rgba(255, 255, 255, 0.72);
}
```

禁止：大面积高饱和红、强黑白对比、频闪、刺眼霓虹。

### 3.3 字体

```css
font-family: "Nunito", "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif;
```

- 标题：32–44px，粗圆
- 正文：18–22px，行高 1.55–1.75
- 按钮：22–28px
- 辅助文案：15–17px，不要密集

### 3.4 按钮

- 主按钮高度：64–76px
- 圆角：28–36px
- 触控目标：不小于 64px
- 点击反馈：`transform: scale(0.96)` + 轻微回弹
- 工具按钮：图标 + 4–6 字短文案，选中态必须非常明显

---

## 4. 今日状态选择：不用风雨光，改用具体小场景

目的：儿童不需要理解“心情为什么像风”。状态入口必须使用儿童熟悉的具体小场景，并且不得与后续绘画工具重复。

```ts
export type MoodSceneCard =
  | "colorPath"
  | "messyLeaves"
  | "littleVolcano"
  | "smallStone"
  | "snailShell"
  | "lowBatteryLamp"
  | "foggyGlass";
```

| id | 卡片名 | 画面 | 对应体验倾向 | 界面文案 |
|---|---|---|---|---|
| colorPath | 彩色小路 | 一条亮亮的小路，前方有小灯 | 轻松、好奇、愿意开始 | 今天好像可以慢慢往前走。 |
| messyLeaves | 乱叶团 | 一堆叶子在原地打转 | 心里乱、事情多、停不下来 | 今天心里好像有好多小东西在转。 |
| littleVolcano | 小火山 | 小火山冒一点红烟 | 生气、冲动、热热的 | 今天心里有一点热热的、冲冲的。 |
| smallStone | 小石头 | 一块石头压在路边 | 委屈、难过、心里重 | 今天心里好像有点重。 |
| snailShell | 蜗牛壳 | 小蜗牛躲进壳里 | 不安、害怕、不想说 | 今天可能想躲一躲，也可以。 |
| lowBatteryLamp | 没电小灯 | 小灯只亮一点点 | 累、没力气、不想动 | 今天的小灯可能有点没电。 |
| foggyGlass | 雾玻璃 | 玻璃雾蒙蒙，看不清 | 说不清、混合情绪、不知道 | 今天还看不太清，也没关系。 |

选择后仅用于推荐工具和初始化文案，不显示任何心理标签。

---

## 5. 七日花园配置

### 5.1 数据结构

```ts
export type DayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ElementType =
  | "seed" | "grass" | "sunlight" | "dew" | "soilLine" | "firstFlower"
  | "waterLine" | "ripple" | "leafBoat" | "bridge" | "rainDrop" | "reed"
  | "windLine" | "cloud" | "floatingLeaf" | "windBell" | "ribbon"
  | "stone" | "moss" | "smallTree" | "shadow" | "breathLight" | "signpost"
  | "mushroom" | "sprout" | "puddle" | "snailTrail" | "bud"
  | "lantern" | "firefly" | "moon" | "windowLight" | "quietFlower" | "softWind"
  | "star" | "moonbeam" | "memorySeed" | "constellationLine" | "rainbow";

export type SceneState = {
  soilWetness: number;
  brightness: number;
  warmth: number;
  windEnergy: number;
  waterFlow: number;
  growthLevel: number;
  pathCompletion: number;
  calmness: number;
  densityLoad: number;
  soundEnergy: number;
  nightSparkle: number;
  memoryConnection: number;
  fogAmount: number;
  lightSources: number;
  flowerOpenLevel: number;
};

export type GardenDayConfig = {
  day: DayNumber;
  name: string;
  subtitle: string;
  regulationIntent: string;
  layoutKind: "courtyard" | "stream" | "slope" | "stonePath" | "mushroomRain" | "nightLights" | "greenhouse";
  palette: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
  initialSceneState: SceneState;
  coreTools: ElementType[];
  extendedTools: ElementType[];
  recommendedByMood: Record<MoodSceneCard, ElementType[]>;
  introTextByMood: Record<MoodSceneCard, string>;
};
```

### 5.2 七日总表

| day | 名称 | 布局 | 调节目标 | 初始视觉 | 主工具 |
|---|---|---|---|---|---|
| 1 | 种子庭院 | 中央圆形土地 + 四周小灯 + 后方低山 | 重新开始、低门槛进入 | 空土地、小种子、未亮小灯 | seed, grass, sunlight, dew, soilLine, firstFlower |
| 2 | 小溪花园 | 左上到右下弯曲小溪 + 两岸草地 + 小桥 | 流动、释放 | 水流很慢、桥未完成 | waterLine, ripple, leafBoat, bridge, rainDrop, reed |
| 3 | 风铃草坡 | 右高左低草坡 + 风铃架 + 云层 | 松动、释放 | 草坡静止、风铃不动 | windLine, cloud, floatingLeaf, windBell, grass, ribbon |
| 4 | 石径安放园 | S 形石头小路 + 灌木 + 安静角落 | 稳定、落地 | 路断断续续、石头稀疏 | stone, moss, smallTree, shadow, breathLight, signpost |
| 5 | 雨后蘑菇园 | 水洼 + 湿润土壤 + 蘑菇地 | 滋养、恢复 | 土湿但植物少 | rainDrop, mushroom, sprout, puddle, snailTrail, bud |
| 6 | 萤火灯园 | 夜色花园 + 灯串路径 + 小屋 | 陪伴、安全感 | 花园偏暗、灯很少 | lantern, firefly, moon, windowLight, quietFlower, softWind |
| 7 | 星光温室 | 透明温室 + 星空屋顶 + 一周陈列 | 回看、整合 | 温室空、星星少 | star, moonbeam, cloud, memorySeed, constellationLine, rainbow |

---

## 6. 每日画布精确实现

### Day 1：种子庭院

布局：中央圆形土地占画布 45%，底部浅色弧形小路，左右两盏小灯，后景低矮山丘。

初始状态：`soilWetness=0.2, brightness=0.45, growthLevel=0.05, lightSources=0`。

| 工具 | 儿童画法 | 生成效果 | 状态变化 | 明显视觉反馈 | 音效 |
|---|---|---|---|---|---|
| seed | 点/小圆 | 土中出现小种子 | seedCount +1, growthLevel +0.03 | 种子轻微发光 1s | 木琴点音 |
| grass | 向上短线 | 草叶从地面长出 | growthLevel +0.06 | 绿色覆盖扩散 | 沙沙声 |
| sunlight | 放射线/点 | 暖光斑落下 | brightness +0.08, warmth +0.08 | 全局亮度上升 | 柔铃 |
| dew | 小点 | 草尖露珠 | soilWetness +0.05 | 露珠闪光 | 水滴声 |
| soilLine | 横向短线 | 柔和土壤纹理 | groundSoftness +0.06 | 土地从硬变柔 | 轻沙声 |
| firstFlower | 圆/弧 | 第一朵小花打开 | flowerOpenLevel +0.1 | 局部变亮 | 泛音 |

### Day 2：小溪花园

布局：小溪从左上流向右下，占画布 35%；两岸草地；中央未完成小桥。

初始状态：`waterFlow=0.1, soilWetness=0.35, pathCompletion=0.15`。

| 工具 | 儿童画法 | 生成效果 | 状态变化 | 明显视觉反馈 | 音效 |
|---|---|---|---|---|---|
| waterLine | 沿小溪画长线 | 流动水纹 | waterFlow +0.12 | 水纹循环移动 | 水流声 |
| ripple | 圆/半圆 | 扩散涟漪 | waterFlow +0.05 | 波纹扩散 | 拨水声 |
| leafBoat | 叶形/短弧 | 叶子船漂走 | calmness +0.04 | 叶片顺流移动 | 木片声 |
| bridge | 横线 | 桥板出现 | pathCompletion +0.15 | 桥逐渐完整 | 木块声 |
| rainDrop | 点/短竖线 | 雨滴落水 | soilWetness +0.08 | 水面和土壤变湿 | 雨滴声 |
| reed | 岸边竖线 | 芦苇长出 | growthLevel +0.05 | 岸边边界丰富 | 细草声 |

### Day 3：风铃草坡

布局：右高左低草坡占 60%；上方风铃架；远处云层。

初始状态：`windEnergy=0.05, growthLevel=0.35, soundEnergy=0.1`。

| 工具 | 儿童画法 | 生成效果 | 状态变化 | 明显视觉反馈 | 音效 |
|---|---|---|---|---|---|
| windLine | 弯线/旋转线 | 半透明风带 | windEnergy + speed*0.2 | 草、风铃、彩带同时摆动 | 风声 |
| cloud | 大弧线 | 云团生成/移动 | fogAmount +0.04 | 云缓慢漂移 | 柔低音 |
| floatingLeaf | 短弧 | 叶片飘动 | windEnergy +0.04 | 叶片沿风向移动 | 叶声 |
| windBell | 竖线+点 | 风铃挂件 | soundEnergy +0.08 | 风铃摆动 | 铃声 |
| grass | 向上短线 | 草坡变密 | growthLevel +0.05 | 草浪更明显 | 沙沙声 |
| ribbon | 长弧线 | 彩带飘动 | motionSoftness +0.06 | 彩带波动 | 布料声 |

### Day 4：石径安放园

布局：S 形石头小路通向后景；左侧灌木；右侧安静空地。

初始状态：`pathCompletion=0.2, calmness=0.4, brightness=0.5`。

| 工具 | 儿童画法 | 生成效果 | 状态变化 | 明显视觉反馈 | 音效 |
|---|---|---|---|---|---|
| stone | 点/圆块 | 圆润石头 | pathCompletion +0.12, calmness +0.04 | 小路逐渐连起来 | 低沉木石声 |
| moss | 密集小点 | 石边苔藓 | softness +0.06 | 石头边变绿 | 轻刷声 |
| smallTree | 竖线+分叉 | 小树苗 | stability +0.08 | 路边出现停靠点 | 木声 |
| shadow | 轻涂/横线 | 地面阴影 | grounding +0.08 | 画面更落地 | 低频声 |
| breathLight | 圆圈/点 | 慢闪光点 | calmness +0.12 | 光点慢速呼吸 | 呼吸音 |
| signpost | 竖线+横线 | 小路标 | directionClarity +0.1 | 路径方向清楚 | 轻敲声 |

### Day 5：雨后蘑菇园

布局：左侧水洼，右侧湿润土壤，中间蘑菇地，后方低矮植物。

初始状态：`soilWetness=0.45, growthLevel=0.15, brightness=0.48`。

| 工具 | 儿童画法 | 生成效果 | 状态变化 | 明显视觉反馈 | 音效 |
|---|---|---|---|---|---|
| rainDrop | 点/短竖线 | 细雨落下 | soilWetness +0.1 | 土壤明显变深，水洼扩大 | 雨声 |
| mushroom | 半圆+竖线 | 蘑菇冒出 | groundDetail +0.08 | 蘑菇弹出 | 柔弹声 |
| sprout | 向上短线 | 嫩芽长出 | growthLevel +0.08 | 小芽变高变亮 | 生长声 |
| puddle | 椭圆 | 水洼反光 | puddleSize +0.1 | 倒影出现 | 水声 |
| snailTrail | 慢弯线 | 银色蜗牛轨迹 | slowMotion +0.06 | 缓慢移动轨迹 | 慢滑声 |
| bud | 小圆点 | 花苞出现 | flowerOpenLevel +0.05 | 花苞等待打开 | 轻泛音 |

### Day 6：萤火灯园

布局：夜色花园，中央弯曲灯串路径，远处小屋，天空月亮位置。

初始状态：`brightness=0.25, nightSparkle=0.1, lightSources=0`。

| 工具 | 儿童画法 | 生成效果 | 状态变化 | 明显视觉反馈 | 音效 |
|---|---|---|---|---|---|
| lantern | 小圆/竖线 | 灯笼挂起 | lightSources +1, brightness +0.06 | 圆形暖光区域扩散 | 温暖铃声 |
| firefly | 点/短线 | 萤火虫飞行 | nightSparkle +0.12 | 光点环绕飞行 | 细闪音 |
| moon | 弧线 | 月亮出现 | brightness +0.07 | 天空亮一点 | 柔长音 |
| windowLight | 方形/点 | 小屋窗光 | companionshipLight +0.1 | 远处窗户亮起 | 木琴 |
| quietFlower | 小弧线 | 夜间花打开 | flowerOpenLevel +0.06 | 暗色中出现花色 | 轻花音 |
| softWind | 慢弯线 | 灯串轻摆 | windEnergy +0.04 | 灯光有呼吸感 | 轻风声 |

### Day 7：星光温室

布局：透明温室在中央，屋顶星空，底部陈列前六天小物缩略影像，中央空白小地图。

初始状态：`memoryConnection=0.1, nightSparkle=0.2, brightness=0.48`。

| 工具 | 儿童画法 | 生成效果 | 状态变化 | 明显视觉反馈 | 音效 |
|---|---|---|---|---|---|
| star | 点/小叉 | 星星点亮 | nightSparkle +0.08 | 星空密度增加 | 星音 |
| moonbeam | 长斜线 | 月光进入温室 | brightness +0.08 | 光带照进来 | 柔长音 |
| cloud | 大弧线 | 云缓慢移动 | skyLayer +0.05 | 星空层次变化 | 柔低音 |
| memorySeed | 点在陈列区 | 前六天元素被点亮 | memoryConnection +0.12 | 一周小物亮起 | 木琴 |
| constellationLine | 连线 | 星星连成线 | memoryConnection +0.15 | 形成本周小地图 | 拨弦声 |
| rainbow | 长弧 | 淡彩虹出现 | closureWarmth +0.1 | 画面完整收束 | 和声音 |

---

## 7. Stroke 输入与识别

### 7.1 数据结构

```ts
export type StrokePoint = {
  x: number;
  y: number;
  t: number;
  pressure: number;
};

export type StrokeData = {
  id: string;
  tool: ElementType;
  day: DayNumber;
  points: StrokePoint[];
  zone: "sky" | "ground" | "water" | "path" | "plant" | "light" | "memory";
  speedAvg: number;
  speedMax: number;
  length: number;
  density: number;
  direction: "up" | "down" | "left" | "right" | "mixed";
  closedness: number;
  createdAt: number;
};
```

### 7.2 特征提取

```ts
function extractStrokeFeatures(points: StrokePoint[]): Pick<StrokeData, "speedAvg" | "speedMax" | "length" | "density" | "direction" | "closedness"> {
  // 1. 计算相邻点距离 / deltaTime 得到速度
  // 2. 计算总长度
  // 3. 根据 bbox 面积估算密度
  // 4. 根据起点终点方向判断主要方向
  // 5. 起点终点距离 / 总长度 判断闭合程度
}
```

识别原则：**工具先验优先**。儿童先选工具，系统不从零猜图形。即使画得不像，也按当前工具转译，只根据特征调整生成强度、速度和位置。

---

## 8. 每一笔强制反馈流程

实现 `onStrokeEnd`：

```ts
function onStrokeEnd(rawPoints: StrokePoint[]) {
  const stroke = buildStrokeData(rawPoints, currentTool, currentDay);
  addRawStrokeLayer(stroke, { opacity: 0.28 });
  const visualTokens = generateVisualTokens(stroke, sceneState, dayConfig);
  addVisualTokens(visualTokens);
  const nextState = applyElementStateEffect(stroke, sceneState);
  setSceneState(nextState);
  playElementSound(stroke, nextState);
  setFeedbackText(makeFeedbackText(stroke, nextState));
  incrementToolCount(stroke.tool);
  triggerSceneAnimation(stroke.tool, nextState);
  normalizeCanvasDensityIfNeeded(nextState);
}
```

### 8.1 最低反馈验收

每一笔必须触发：

| 反馈 | 要求 |
|---|---|
| 原始笔迹 | Canvas 上保留 20–35% 透明度线条 |
| 风格化元素 | 生成统一风格自然元素，不直接依赖儿童画得像不像 |
| 状态变量 | 至少 1 个 SceneState 变量变化 ≥ 0.05 |
| 动画 | 至少 1 个区域产生 0.8–2s 动画 |
| 声音 | 播放对应柔和音效，速度影响参数 |
| 文案 | 右侧更新一句非评价反馈 |

红线：儿童画完后如果页面只是多一条线，视为实现失败。

---

## 9. 场景状态联动规则

### 9.1 雨滴浸湿土壤

```ts
if (stroke.tool === "rainDrop" || stroke.tool === "dew") {
  scene.soilWetness = clamp(scene.soilWetness + 0.08 + stroke.density * 0.04, 0, 1);
  scene.growthLevel = clamp(scene.growthLevel + scene.soilWetness * 0.035, 0, 1);
}
```

视觉：土壤颜色从 `--soil-dry` 插值到 `--soil-wet`；当 `soilWetness > 0.45` 时，自动触发嫩芽或草叶轻微变亮。

### 9.2 风影响已有元素

```ts
if (stroke.tool === "windLine" || stroke.tool === "softWind") {
  scene.windEnergy = clamp(scene.windEnergy + stroke.speedAvg * 0.2 + 0.05, 0, 1);
}
```

视觉：草、彩带、风铃、云的摆动幅度随 `windEnergy` 增加。

### 9.3 光影响亮度和开放

```ts
if (["sunlight", "lantern", "moon", "moonbeam", "windowLight"].includes(stroke.tool)) {
  scene.brightness = clamp(scene.brightness + 0.06, 0, 1);
  scene.warmth = clamp(scene.warmth + 0.05, 0, 1);
  scene.flowerOpenLevel = clamp(scene.flowerOpenLevel + 0.04, 0, 1);
}
```

视觉：光斑扩散，花苞轻微打开，雾层变薄。

### 9.4 路径完整度

```ts
if (["bridge", "stone", "signpost"].includes(stroke.tool)) {
  scene.pathCompletion = clamp(scene.pathCompletion + 0.1, 0, 1);
}
```

视觉：桥板/石头小路逐步连起来。

### 9.5 一周记忆连接

```ts
if (["memorySeed", "constellationLine", "rainbow"].includes(stroke.tool)) {
  scene.memoryConnection = clamp(scene.memoryConnection + 0.12, 0, 1);
}
```

视觉：Day 7 中前六天小元素逐一点亮，星星连成一周地图。

---

## 10. 声音实现

### 10.1 基本原则

- Web Audio API 合成，不加载外部音频。
- 音量必须小，所有声音可关闭。
- 速度影响音效，但必须有上限与平滑，不做刺激反馈。

### 10.2 速度映射

```ts
const speedNorm = clamp(stroke.speedAvg / 1.2, 0, 1);
const volume = 0.04 + speedNorm * 0.08;
const pitch = basePitch + speedNorm * pitchRange;
const duration = 0.18 + (1 - speedNorm) * 0.25;
```

慢速画：声音更低、更柔、间隔更长。  
快速画：声音略亮、密度略高，但不突然变大。  
密集重复画：自动压缩音量，防止嘈杂。

### 10.3 元素声音类型

| 元素类型 | 声音生成建议 |
|---|---|
| seed/stone/bridge | 短木琴/木块音 |
| grass/reed/moss | 轻噪声 + 高通滤波，模拟沙沙 |
| rainDrop/dew/puddle/ripple | 短高频正弦 + 快速衰减 |
| windLine/softWind/cloud | 低音量噪声 + 滤波扫动 |
| sunlight/lantern/star/firefly | 正弦/三角波短音 |
| moonbeam/constellationLine/rainbow | 柔和长音或和声音 |

---

## 11. 画面兜底整理

儿童可能画不好、画得乱、画太多、不画。系统必须兜底。

### 11.1 图层结构

1. 每日花园底图层：CSS/SVG/Canvas 生成，稳定美术风格。
2. 儿童原始笔迹层：透明度 0.2–0.35，保留表达痕迹。
3. 系统风格化生成层：统一水彩/线描元素。
4. 收尾整理层：呼吸后降低噪声，把过密区域转成柔雾、叶堆、土壤纹理、星尘。

### 11.2 密度控制

```ts
if (scene.densityLoad > 0.72) {
  reduceRawStrokeOpacity(0.18);
  convertDenseAreaToTexture(currentTool);
  setFeedbackText("花园里已经留下了很多痕迹，我们给它留一点安静的地方。");
}
```

### 11.3 不画也成立

如果儿童停留超过 20 秒不画：

文案：“也可以先留一块安静的地方。”  
允许直接进入呼吸收尾，生成“今天花园很安静”的日记卡。

---

## 12. 呼吸收尾

页面只保留当前花园和一个缓慢放大缩小的光点。执行 3 次呼吸循环，每次 6–8 秒。

视觉变化：

- `windEnergy *= 0.4`
- `rainDensity` 或雨滴粒子减少
- 原始笔迹透明度下降到 0.18–0.25
- 背景音进入低通，音量逐渐下降
- 亮度变柔，饱和度略降
- 过密区域转为纹理

文案：

```txt
跟着光点吸气。
再慢慢呼气。
花园会自己安静下来。
```

---

## 13. 日记生成

### 13.1 数据结构

```ts
export type GardenDiary = {
  id: string;
  day: DayNumber;
  gardenName: string;
  moodCard: MoodSceneCard;
  usedTools: ElementType[];
  toolCounts: Record<ElementType, number>;
  sceneState: SceneState;
  storyText: string;
  createdAt: string;
  thumbnailDataUrl?: string;
};
```

### 13.2 故事模板

禁止诊断，使用过程回顾。

```ts
function makeDiaryStory(diary: GardenDiary): string {
  // 示例：
  // “今天你来到小溪花园。你先画了水线，又让几片叶子慢慢漂走。
  // 小溪比一开始流动了一点，岸边也留下了你的声音。
  // 这是今天的花园，也是你今天留下的一段心情。”
}
```

### 13.3 本周回顾

Day 7 或 Week Review 页面展示七个缩略花园，不做分数。

文案示例：

```txt
这一周，你走过了七个花园角落。
有一天你种下了种子，有一天你让小溪流动，
也有一天你点亮了灯。
这些不是分数，是你留下的心情痕迹。
```

---

## 14. 推荐文件结构

```txt
src/
  App.tsx
  main.tsx
  styles/
    global.css
    tokens.css
  data/
    moodCards.ts
    gardenDays.ts
    elements.ts
    copy.ts
  types/
    garden.ts
  state/
    useGardenStore.ts
    storage.ts
  pages/
    LandingPage.tsx
    WeekMapPage.tsx
    StateSelectPage.tsx
    DayIntroPage.tsx
    GardenCanvasPage.tsx
    BreathePage.tsx
    DiaryPage.tsx
    WeekReviewPage.tsx
  components/
    AppShell.tsx
    GardenStage.tsx
    ToolDock.tsx
    MoodCard.tsx
    FeedbackPanel.tsx
    SceneStatusPanel.tsx
    BreathOrb.tsx
    DiaryCard.tsx
    WeekMap.tsx
  canvas/
    strokeCapture.ts
    featureExtraction.ts
    visualGenerators.ts
    sceneRenderer.ts
    densityNormalizer.ts
  audio/
    audioEngine.ts
    soundPresets.ts
  utils/
    clamp.ts
    color.ts
    id.ts
```

---

## 15. MVP 范围

第一阶段必须完成：

1. 七日地图页面。
2. 七个不同花园布局。
3. 每天至少 3 个核心工具。
4. 每个工具：画笔输入、风格化生成、状态变化、音效、反馈文案。
5. 呼吸收尾。
6. 今日日记卡。
7. localStorage 保存和回看。
8. `npm run build` 通过。

第一阶段工具：

| Day | 必做工具 |
|---|---|
| 1 | seed, grass, sunlight |
| 2 | waterLine, ripple, leafBoat |
| 3 | windLine, windBell, ribbon |
| 4 | stone, moss, breathLight |
| 5 | rainDrop, mushroom, sprout |
| 6 | lantern, firefly, moon |
| 7 | star, memorySeed, constellationLine |

第二阶段再扩展到每天 6 个工具。

---

## 16. 验收标准

### 16.1 功能验收

- 能从进入页走完整流程到保存日记。
- 七天花园布局明显不同。
- 每天工具与当天场景相关。
- 画雨后土壤、水面或植物状态必须变化。
- 画风后已有元素必须移动。
- 画光后画面亮度或局部照明必须变化。
- 画石头/桥后路径完整度必须变化。
- Day 7 能显示前六天记忆元素。
- 关闭声音后不再播放音效。
- localStorage 能保存并回看日记。

### 16.2 视觉验收

- iPad 1024×768 下不重叠。
- 主画布占主要视觉，不被工具栏遮挡。
- 按钮足够大，儿童可触控。
- 色彩低刺激，动画慢且柔和。
- 儿童画乱后最终日记仍风格统一。

### 16.3 文案验收

不得出现：

```txt
焦虑、抑郁、愤怒诊断、治疗、疗效、风险、分数、等级、失败、错误、画得不好
```

允许出现：

```txt
有点乱、有点重、想躲一躲、慢慢来、留一块安静的地方、花园回应了你、今天留下的痕迹
```

---

## 17. 开发注意事项

1. 优先完成可演示闭环，不要先追求所有元素数量。
2. 不要把七天做成背景图切换；必须有不同布局和状态变量。
3. 不要让儿童原始画线决定最终美术质量；必须有系统风格化生成层。
4. 不要使用弹窗打断创作。
5. 不要引入账号、云同步、AI API Key。
6. 不要在儿童界面展示复杂技术词。
7. 保证 `npm run build` 没有 TypeScript 错误。
8. 完成后在 README 中写明运行方式和已完成范围。

---

## 18. 最终交付物

Codex 最终应交付：

1. 可运行的 Vite React Web App。
2. 完整源代码。
3. `README.md`：包含安装、运行、构建、功能说明。
4. 若有未实现项，列在 `README.md` 的 “Known limitations”。
5. 构建成功截图或终端输出说明。


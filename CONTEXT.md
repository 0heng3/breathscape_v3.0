# BreathScape 高级交互能力上下文

## 目标问题

本文件记录两个高级交互能力在当前 BreathScape Web Demo 中的可实现性、当前实现状态、缺口与建议实现路径：

1. 线条实时生成音乐，并同步生成画面。
2. 最后画完后，用摄像头读取身体姿势控制场景的动态变化。

结论基于当前代码状态，而不是概念设想。

---

## 1. 线条实时生成音乐，生成画面

### 能否实现

可以实现。

Web 端可以使用 Pointer Events、Canvas/SVG、Web Audio API 或 Tone.js 完成该能力：

- 画线过程中持续采集点位、速度、方向、密度、停顿等笔触参数；
- 将笔触参数实时映射为音高、节奏、音量、音色和环境层；
- 同步在场景中生成雨滴、草芽、光点、风痕等响应元素；
- 画完后把原始笔迹柔化为表达痕迹，保留在日记画面中。

### 当前是否已经实现

已实现 Web Demo 第一版实时能力，但还不是完整作曲系统。

当前已经实现：

- `DrawingCanvas.jsx` 在绘制过程中采集 pointer 点位，并通过 `onStrokeMove` 持续上报实时笔触事件。
- `strokeAnalysis.js` 在笔触结束后分析长度、速度、密度、方向、闭合度和区域。
- `App.jsx` 的 `handleStroke` 会在一笔结束后更新场景状态。
- `App.jsx` 的 `handleStrokeMove` 会在绘制过程中触发实时声音，并生成短生命周期 `liveResponses`。
- `GardenStage.jsx` 会根据 `elementHistory` 生成响应簇，例如雨滴、水珠、草芽、光点、风痕和花。
- `GardenStage.jsx` 会根据 `liveResponses` 在绘制中实时显示临时雨滴、草芽、光点等响应。
- `DrawingCanvas.jsx` 已将最终笔迹柔化为低透明 trace layer。
- `audioEngine.js` 已按元素生成不同声音纹理：雨滴串、草声、光铃声等。
- `audioEngine.js` 新增 `playLiveElementTone`，绘制过程中按元素和速度节流触发实时声音。

当前仍未完整实现：

- 当前声音已经能随笔触实时触发，但仍是短音效/纹理，不是可持续的音乐层或声景 loop。
- 没有旋律规则、和声音阶、节拍网格或多声部状态。
- 没有将笔触停顿、反复涂抹、压力等实时映射到音乐变化。

### 当前实现与目标的差距

目标体验应是：

```text
手指正在画雨 -> 雨声实时变密 -> 画面同步落雨
手指正在画草 -> 沙沙声实时出现 -> 草芽沿笔触附近长出
手指正在画光 -> 铃声/泛音实时变化 -> 光点沿线扩散
```

当前体验已经升级为：

```text
手指正在画 -> 实时声音纹理响起 -> 临时雨滴/草芽/光点出现
画完一笔 -> 系统分析这笔 -> 沉淀为正式场景回应和柔化痕迹
```

这已经具备“实时声景线描”的第一版雏形，但还不是完整音乐生成系统。

### 如何实现完整版本

建议分三步实现。

#### P0：实时笔触事件流

新增一个实时笔触回调，不只在 `onPointerUp` 时触发：

```jsx
<DrawingCanvas
  activeTool={activeTool}
  onStrokeMove={handleStrokeMove}
  onStroke={handleStroke}
/>
```

`DrawingCanvas.jsx` 在 `move` 中传出当前增量：

```js
onStrokeMove({
  tool: activeTool.id,
  point,
  previous,
  speed,
  direction,
  pressure,
  canvasWidth,
  canvasHeight
});
```

#### P0：实时声音引擎

将 `playElementTone` 升级为持续型 SoundEngine：

```js
soundEngine.startStroke(tool);
soundEngine.updateStroke(features);
soundEngine.endStroke();
```

不同元素映射：

| 元素 | 实时声音 |
|---|---|
| 雨 | 密度越高，雨滴触发越密；速度越快，雨声更急 |
| 草 | 向上短线触发轻沙沙声；越密，草声越厚 |
| 光 | 轻点生成铃声；长线生成持续泛音 |
| 风 | 速度控制风声滤波和音量 |
| 花 | 闭合度或弧线触发柔和开花音 |

技术上可以继续用 Web Audio API，也可以引入 Tone.js 管理 synth、loop 和 envelope。

#### P1：实时视觉响应层

在 `GardenStage` 中新增 transient response layer：

```js
const [liveResponses, setLiveResponses] = useState([]);
```

`handleStrokeMove` 根据当前工具追加短生命周期响应：

- 雨：当前点附近生成 1-3 个雨滴；
- 草：地面附近生成 1-2 根草芽；
- 光：沿笔触生成光点；
- 风：沿路径生成风痕；
- 花：在闭合/弧线处生成花苞。

这些实时响应在 1-3 秒内淡出，笔触结束后再沉淀为 `elementHistory` 的正式回应簇。

---

## 2. 最后画完，用姿势控制场景动态变化

### 能否实现

可以实现，但实现方式取决于“姿势”的定义。

可选路线：

1. 摄像头身体/手势识别：使用 MediaPipe、TensorFlow.js 或 WebRTC + 手势模型。
2. 设备姿态控制：在 iPad 上使用 DeviceOrientationEvent，根据倾斜角控制风、光、云和草的动态。
3. 摄像头姿势控制：使用 MediaPipe Pose Landmarker 读取肩膀、手腕等关键点，驱动风、光和安放程度。

当前 Web Demo 已接入第 3 种作为第一版实现。iPad 倾斜控制可以作为后续补充。

### 当前是否已经实现

已实现摄像头姿势控制第一版。

当前已经有：

- 安放模式：`BreathePage.jsx` 使用呼吸光点引导收尾。
- 场景动态：`GardenStage.jsx` 有云移动、风线、草摆动、小灯发光等 CSS 动效。
- 场景状态：`applyBreathCalming` 会降低风、雨、声音强度，提高 calmLevel。
- `PoseSettleStage.jsx` 会在安放页请求摄像头，并用 `@mediapipe/tasks-vision` 的 Pose Landmarker 读取身体关键点。
- 当前识别肩膀、手腕、手肘关键点，判断双手靠近、双手抬起、单手抬起和身体稳定。
- `applyGestureSettling` 会根据姿势更新 calmLevel、windEnergy、sunlightWarmth、animationSpeed、gestureWind 和 gestureGlow。
- `GardenStage.jsx` 读取 `gestureWind` 和 `gestureGlow`，让云、小灯光晕和轻风状态随姿势变化。
- 安放页会显示姿势提示，例如“双手靠近了，小灯被轻轻捧亮”“一只手在带风，云会轻轻跟着走”。

当前没有：

- 没有 DeviceOrientationEvent。
- 没有 iPad 倾斜控制。
- 没有复杂手势分类模型，只使用关键点规则。

### 推荐实现方式

当前版本已改为“摄像头姿势控制安放场景”。下面的触摸方案不再作为主方案，只可作为摄像头不可用时的备选降级。

#### P0：长按安放

在安放页或创作页完成后，用户长按花园：

```text
长按越稳定 -> calmLevel 越高
长按位置靠近小灯 -> 小灯更亮
松手 -> 花园进入最终日记状态
```

实现方式：

- 在 `GardenStage` 外层加 `onPointerDown / onPointerMove / onPointerUp`；
- 记录长按时长、移动幅度；
- 如果时长超过 1200ms 且移动小于阈值，逐步提高 calmLevel；
- 同时降低 `animationSpeed`、`rainDensity`、`windEnergy`。

#### P0：滑动带动风

在安放模式中允许儿童用慢慢滑动控制风：

```text
向左/向右慢慢滑 -> 云和风痕跟着移动
滑得越慢 -> 花园越安静
滑得越快 -> 小灯提醒慢一点
```

实现方式：

- 计算 pointer move 的方向和速度；
- 将方向映射到 CSS 变量 `--gesture-wind-x`；
- 将速度映射到 `windEnergy` 和 `animationSpeed`。

#### P1：双指捧光

支持两指靠近小灯：

```text
两指靠近 -> 小灯光晕变大
两指稳定停留 -> 花园进入安放
两指分开 -> 光点扩散
```

实现方式：

- 维护 active pointers map；
- 计算两指中心点和距离；
- 中心点靠近小灯区域时提高 `sunlightWarmth` 和 `calmLevel`；
- 距离变化控制光晕半径。

#### P1：iPad 倾斜控制

适合 iPad Demo：

```text
iPad 轻轻倾斜 -> 云慢慢移动，草轻轻摆
设备回正并保持 -> 花园稳定下来
```

实现方式：

- 使用 `DeviceOrientationEvent`；
- iOS 需要用户点击后请求权限；
- 将 `gamma/beta` 映射到风向和光点偏移；
- 必须设置低通滤波，避免画面抖动。

#### P2：摄像头手势识别

适合展示亮点，但不建议第一阶段作为主路径：

- 使用 MediaPipe Hands 或 Pose Landmarker；
- 识别张手、合手、慢慢抬手、靠近小灯等动作；
- 映射到光晕、风向、安放程度。

风险：

- 需要摄像头权限；
- 不同设备性能差异明显；
- 儿童隐私和安全说明成本高；
- Web Demo 中调试复杂度较高。

---

## 建议落地顺序

### 第一阶段：最稳妥

1. 实现 `onStrokeMove`。
2. 实现持续型 `SoundEngine`。
3. 绘制中实时生成雨滴、草芽、光点。
4. 安放页加入长按安放。
5. 安放页加入慢滑控制风和云。

### 第二阶段：更像 iPad App

1. 加入双指捧光。
2. 加入 iPad 设备倾斜控制。
3. 增加声音 loop 和环境声层。
4. 日记保存时记录姿势安放过程。

### 第三阶段：展示型高级能力

1. 引入 MediaPipe 手势识别。
2. 用手势控制小灯光晕、风向、花园远近。
3. 录制成比赛展示视频。

---

## 当前状态总结

| 能力 | 当前状态 |
|---|---|
| 线条生成画面 | 已实现；一笔结束后生成正式场景回应 |
| 线条实时生成画面 | 已实现第一版；绘制中生成 live response |
| 线条生成声音 | 已实现；一笔结束后触发元素声音纹理 |
| 线条实时生成音乐 | 已实现第一版实时声音；仍未做完整旋律/多声部音乐系统 |
| 画完后安放场景 | 已实现；呼吸光点、柔化、trace layer |
| 姿势控制场景动态 | 已实现第一版；摄像头身体姿势影响场景 |
| 摄像头姿势控制 | 已实现第一版；MediaPipe Pose 关键点规则 |
| 触摸姿势控制 | 已移除；不再作为姿势控制主方案 |
| iPad 倾斜控制 | 未实现，可作为第二阶段 |
| 摄像头复杂手势分类 | 未实现，可作为展示型高级能力 |

总体判断：

当前 Demo 已经从“笔触结束后触发回应”推进到“绘制中实时声景反馈 + 绘制中实时画面响应 + 安放页摄像头姿势控制”的第一版。后续如果要更接近高级演示，可以继续做持续音乐层、iPad 姿态控制和更复杂的摄像头手势分类。

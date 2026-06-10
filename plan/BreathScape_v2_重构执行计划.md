# BreathScape v2 重构执行计划

依据 `BreathScape_儿童App页面风格迁移与Demo重构方案_v2.md`，本次重构目标是把当前单文件式 Demo 改为 iPad 横屏优先、组件清晰、路由链路明确、儿童 App 风格更完整的可演示 Web App。

## 1. 重构目标

1. 建立完整页面链路：
   `/start -> /mood -> /guide -> /canvas -> /breathe -> /card -> /diary`
2. 保留并强化核心机制：
   心情隐喻选择、AI 场景引导、声景线描、每笔三重反馈、呼吸收尾、日记保存回看。
3. 从单文件实现拆分为数据、工具、组件、页面和样式层。
4. 使用已有高完成度花园插画资产作为场景底图，代码只负责交互状态层和 UI。
5. 严格保留非诊断、非评分、非疗效承诺的儿童安全边界。
6. 以 iPad 横屏 1024x768 作为主要验收尺寸。

## 2. 文件结构计划

```text
src/
  App.jsx
  routes/
    StartPage.jsx
    MoodPage.jsx
    GuidePage.jsx
    CanvasPage.jsx
    BreathePage.jsx
    DiaryCardPage.jsx
    DiaryPage.jsx
  components/
    GardenStage.jsx
    DrawingCanvas.jsx
    FeedbackPanel.jsx
    ElementMeter.jsx
    MoodCard.jsx
    ToolButton.jsx
    SoftButton.jsx
    DiaryEntryCard.jsx
    BreathOrb.jsx
  data/
    moods.js
    tools.js
  utils/
    audioEngine.js
    feedbackRules.js
    storyGenerator.js
    storage.js
    strokeAnalysis.js
  styles/
    tokens.css
    global.css
```

现有 `src/assets/emotion-garden-map.png` 保留为主视觉资产。

## 3. 分阶段执行

### 阶段 A：数据与工具层

- 抽离 7 个心情隐喻到 `data/moods.js`。
- 抽离 5 个绘制工具到 `data/tools.js`。
- 新建 `utils/storage.js`，统一 localStorage key 为 `breathscape_diary_entries`，兼容旧 key `breathscape.diaries.v1`。
- 新建 `utils/strokeAnalysis.js`，计算速度、密度、方向和长度。
- 新建 `utils/feedbackRules.js`，根据工具、计数和线条分析生成实时反馈。
- 新建 `utils/storyGenerator.js`，生成非评判式日记故事和本周回顾。
- 新建 `utils/audioEngine.js`，集中管理 Web Audio 轻音效。

### 阶段 B：组件层

- `GardenStage`：负责插画底图、风雨草花阳光状态动画、互动热点和呼吸安静态。
- `DrawingCanvas`：只负责 Pointer Events 绘制和 stroke 输出。
- `FeedbackPanel`：右侧“小花园在说”面板，展示一句反馈、元素计数和建议按钮。
- `MoodCard`、`ToolButton`、`SoftButton`：统一儿童触控按钮规范。
- `DiaryEntryCard`：日记列表卡片。
- `BreathOrb`：呼吸光点。

### 阶段 C：页面层

- `/start`：大幅插画首页，短文案，主按钮高度 68px 以上。
- `/mood`：7 张心情卡片，4+3 布局，点击选择后可继续。
- `/guide`：左侧今日花园预览，右侧 AI 引导卡片，推荐元素可直接进入画布并选中。
- `/canvas`：三栏布局，左工具栏、中画布、右反馈栏；每笔触发视觉、声音、文案和计数。
- `/breathe`：花园安静态 + 呼吸光点 + 生成日记按钮。
- `/card`：生成今日故事卡，可命名并保存。
- `/diary`：日记卡列表 + 本周小地图 + 亲子沟通提示。

### 阶段 D：样式层

- 新建 `styles/tokens.css` 定义色彩、字号、阴影和触控尺寸。
- 新建 `styles/global.css` 承担页面布局、组件样式和响应式。
- 保持晨光米白、花影浅紫、主行动黄、柔橙、薄荷绿、湖蓝、花粉配色比例。
- 1024x768 下必须无重叠；手机/竖屏变为纵向布局。

### 阶段 E：验证

- 运行 `npm.cmd run build`。
- 用 Playwright 打开 `http://localhost:5173/start`，设置 iPad 视口 `1024x768`。
- 验证完整链路：
  进入页 -> 心情选择 -> AI 引导 -> 画布绘制风/草 -> 呼吸 -> 日记卡 -> 保存 -> 日记列表。
- 检查控制台无错误。
- 保存最终截图到 `output/playwright/`。

## 4. 验收清单

- P0 全部满足：
  完整路由链路、7 心情、5 工具、Canvas、每工具视觉反馈、音效反馈、AI 文案反馈、呼吸、日记卡、localStorage、iPad 横屏适配。
- P1 尽量满足：
  高完成度底图、工具选中态、元素计数、本周小地图、页面转场、静音按钮、竖屏兼容。
- 文案不出现诊断词、疗效承诺、评分、失败或重画评价。
- 不引入登录、广告、上传、摄像头或麦克风采集。

## 5. 风险控制

- 不引入 React Router，避免增加依赖；使用浏览器 history + 当前 route 状态实现轻量路由。
- 不迁移 TypeScript，保持当前 JavaScript 项目稳定。
- 不重写生成图片，继续使用已接入的 `emotion-garden-map.png`。
- 先保证完整可演示闭环，再细化额外热点和导出能力。

# Spec：入职引导页（0月 Onboarding）

> 插入位置：开局选卡完成后 → 正式进入第1周前
> 目标：用叙事方式传递核心规则，不打断沉浸感
> 预计阅读时长：45秒以内

---

## 一、在整体流程中的位置

### 现有流程
```
IntroScreen（35岁鬼故事）
    ↓
CardScreen × 4-5轮（开局选卡）
    ↓  ← 在这里插入
GameScreen（第1周，触发 direction_select 事件）
```

### 修改后流程
```
IntroScreen（35岁鬼故事）
    ↓
CardScreen × 4-5轮（开局选卡）
    ↓
OnboardingScreen（本 spec，共5屏）
    ↓
GameScreen（第1周，触发 direction_select 事件）
```

### appPhase 变更

```
现有："intro" | "cards" | "game"
修改："intro" | "cards" | "onboarding" | "game"
```

- CardScreen 最后一张卡点"开始制作！"后，`setAppPhase("onboarding")` 而非直接 `"game"`
- OnboardingScreen 最后一屏点击后，执行现有的 `buildInitialState` + `setAppPhase("game")` + `setEvent(pickEvent(initState))`

---

## 二、视觉规格

沿用现有全局样式，无需新增样式变量：

| 属性 | 值 |
|------|----|
| 背景色 | `#060610`（同 IntroScreen） |
| 文字色 | `#acacac` |
| 字体 | `monospace` |
| 最大宽度 | `420px`，居中 |
| 内边距 | `24px 20px` |
| 整屏居中 | `minHeight: 100vh`，`flexDirection: column`，`justifyContent: center` |

进度指示：左上角 `X / 5`，颜色 `#acacac`，`fontSize: 12`

按钮样式：同 IntroScreen 的"接这个项目 →"按钮（深色背景，hover 边框变亮）

屏间切换：无需动画，直接切换即可

---

## 三、五屏内容（逐字稿）

> 说明：「」内为角色台词，其余为旁白。换行即换段。

---

### 屏 1 / 5

```
第0周  入职
────────────────────────

前台坐着一个人，在等你。

你大概知道那是公司的某个高层，
也是老板的弟弟，
叫 Tom。

他没有站起来。

「来了。跟我来。」

                  [继续 →]
```

---

### 屏 2 / 5

```
你有多少时间
────────────────────────

「试用期六个月，24周。」

「你要在这24周里，
  把游戏的完成度推到100。」

  第1周 ·········· 第24周
  ↑                      ↑
  现在                上线

「每4周，上面会来看一次进度。
  那是你证明自己的节点。」

                  [继续 →]
```

---

### 屏 3 / 5

```
你每周要做什么
────────────────────────

「你有行动点。分配给你觉得
  重要的事。」

  推进度  /  维持团队  /  管理老板

「行动结束，会有一件事找上门。」

「那件事需要你做决定。」

「没有标准答案。」

                  [继续 →]
```

---

### 屏 4 / 5

```
别让这四个东西归零
────────────────────────

Tom 指了指走廊尽头的白板。

  📈 进度         推到100才算过
  💪 士气         归零项目解散
  💰 预算         烧完项目停摆
  🤝 老板信任     跌光你被开除

「四个里任何一个先到底，
  就结束了。」

                  [继续 →]
```

---

### 屏 5 / 5

```
────────────────────────

Tom 转身要走，停了一下。

「还有一件事。」

「这里没有人会告诉你
  怎么做选择。」

「但每一个决定，
  都会被记住。」

你不确定他说的是"我哥"，
还是别的什么。

          [好，我准备好了 →]
```

---

## 四、交互逻辑

- 每屏只有一个按钮，点击进入下一屏
- 屏 1-4 按钮文案：`继续 →`
- 屏 5 按钮文案：`好，我准备好了 →`
- 屏 5 点击后执行：
  ```
  const initState = buildInitialState(pickedCards);
  setState(initState);
  setAppPhase("game");
  setEvent(pickEvent(initState));
  ```
- **无跳过按钮**（首次体验，不提供跳过）
- 无返回按钮（不可后退）

---

## 五、不需要做的事

- 不需要动画或转场效果
- 不需要音效
- 不需要新的状态字段（`appPhase` 加一个值即可）
- 不需要解释 qualityDebt、隐性积分等机制（设计上故意不提）

---

## 六、验证点

- [ ] 选完所有开局卡后，进入 OnboardingScreen 而非直接进游戏
- [ ] 屏 1-5 内容与逐字稿一致
- [ ] 左上角显示 `1/5` 到 `5/5` 进度
- [ ] 屏 5 点击后正确初始化游戏状态，触发 `direction_select` 事件
- [ ] 整体样式与 IntroScreen 视觉一致

---

## 七、开发提示词

将以下内容直接交给程序开发：

---

**提示词：**

> 在 `delay-game.jsx` 中新增一个 `OnboardingScreen` 组件，并将其接入现有的 `appPhase` 状态机。
>
> **状态变更：**
> `appPhase` 的取值从 `"intro" | "cards" | "game"` 改为 `"intro" | "cards" | "onboarding" | "game"`。
>
> 在 `handleCardNext` 函数中，当所有选卡完成时（现有逻辑是 `setAppPhase("game")`），改为 `setAppPhase("onboarding")`，同时暂不执行 `buildInitialState` 和 `setEvent`，把这两步移到 OnboardingScreen 完成后触发。
>
> **OnboardingScreen 组件规格：**
> - Props：`{ pickedCards, onDone }`
> - 内部维护 `step` 状态（0-4，共5屏）
> - 样式完全复用 IntroScreen 的写法：`background: "#060610"`，`color: "#acacac"`，`fontFamily: "monospace"`，`maxWidth: 420`，`minHeight: "100vh"`，flex 垂直居中
> - 左上角显示当前进度 `{step + 1} / 5`，`fontSize: 12`
> - 每屏内容见 spec_guide.md 第三节逐字稿，换行用 `<br/>` 或多个 `<p>` 实现
> - 屏 1-4 按钮文案 `继续 →`，屏 5 按钮文案 `好，我准备好了 →`
> - 屏 5 点击后调用 `onDone()`
>
> **App 层 onDone 实现：**
> ```javascript
> const handleOnboardingDone = () => {
>   const initState = buildInitialState(pickedCards);
>   setState(initState);
>   setAppPhase("game");
>   setEvent(pickEvent(initState));
> };
> ```
>
> **渲染分支（App return 中）：**
> ```javascript
> if (appPhase === "onboarding")
>   return <OnboardingScreen pickedCards={pickedCards} onDone={handleOnboardingDone} />;
> ```
>
> 不需要新的样式文件，不需要动画，不需要跳过按钮。

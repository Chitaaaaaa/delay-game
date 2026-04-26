# Patch 07 — 老板信任度 + 向上管理行动 + 数值 Tips

## 文件位置
`C:\Users\69032\Downloads\demo-pet\demo-producer\delay-game.jsx`

---

## 改动一：State 扩展

```js
// 新增字段：
bossTrust: 随机初始值（见下方）,
activeTip: null,   // "progress" | "morale" | "budget" | "trust" | null

// 删除字段：
bossAnger: boolean   // 全部替换为 bossTrust 逻辑
```

**`bossTrust` 初始值**：游戏开始时随机取 3-8 之间的整数（含两端）。
量程：0-10。低于0强制置0，高于10强制置10。

**`buildInitialState` 里**：`bossTrust: Math.floor(Math.random() * 6) + 3`

**`restart` 时**也要重置 `bossTrust` 为同样的随机逻辑。

---

## 改动二：老板信任度的变化来源

在对应事件的 `handleChoice` 或结算逻辑里修改 `bossTrust`：

| 来源 | 变化 |
|------|------|
| milestone 选A（顺利通过） | +1 |
| milestone 选B（如实汇报） | -1 |
| water_reveal 触发时 | -1（水分被发现，信任受损）|
| 拒绝人海战术（选C任意方案） | -2 |
| 清醒的人 Phase1 选B | -1 |
| 向上管理行动（新增，见下） | +1 |
| 每月月底自动结算：进度超前轨迹 | +1 |
| 每月月底自动结算：进度落后轨迹 | -1 |

**原 `bossAnger = true` 的所有位置**，替换为 `bossTrust = Math.max(0, bossTrust - 2)`。

---

## 改动三：bossTrust 阈值效果

在 `pickEvent` 和每周结算里检查 `bossTrust`：

**`bossTrust <= 2`（清算前夕）**：
- 每月月底自动扣预算 -5（在月度小结卡渲染时触发）
- 月度小结卡追加一行环境文字：
  `「他最近在问其他人你项目的情况。」` color: `#f87171`

**`bossTrust === 0`（触发谈话）**：
- 立即向 `scheduledEvents` 加入 `{ id: "boss_talk", week: state.week + 1 }`
- 不再自动扣预算（谈话事件本身处理后果）

**`bossTrust <= 4`**：
- 管理层干预类事件（`corp_kpi`, `corp_approval`, `kpi_review`, `market_trend`）权重 ×2

**`bossTrust >= 8`**：
- 上述事件权重 ×0.5（干预减少）

---

## 改动四：「清算谈话」事件

加入事件池但不随机触发，仅由 `scheduledEvents` 触发，ID `"boss_talk"`：

```
name: "谈话"
emoji: "🪑"
color: "#dc2626"
tagline: "「我们谈谈吧。」"
situation: "他让你下午去他办公室。"
dialogue: "他没有废话。\n\n「我最近对这个项目不是很放心。你知道我在说什么。\n我需要你告诉我——这个游戏，还能做出来吗？」\n\n你看了一眼窗外。"

选项A（进度 >= 50%）：「能。数据在这里。」
  effects: { bossTrust: +3, progress: 0, morale: 0, budget: 0 }
  result: "他看了很久，点了点头。「好。那我等你的结果。」你从他办公室出来，腿有点软。"

选项B（始终可选）：「我需要更多时间。」
  effects: { bossTrust: +1, progress: 0, morale: -5, budget: -10 }
  result: "他给了你两周。代价是预算又少了一块，团队知道了这件事，士气受到影响。"

选项C（进度 < 35%，自动触发失败）：
  仅当进度 < 35% 时，A选项变灰，只剩B和C
  选项C文字：「……我说不出口。」
  effects: gamePhase = "lose"
  loseReason: "老板失去了信心。项目在第X周被终止，你正式离开了这家公司。"
```

---

## 改动五：新增「向上管理」行动

在 `ACTIONS` 数组里新增：

```js
{
  id: "manage_up",
  emoji: "☕",
  label: "向上管理",
  ap: 2,
  desc: "老板信任度+1，降低管理层干预概率",
  always: true,
  available: s => s.bossTrust < 10,
  apply: s => ({ ...s, bossTrust: Math.min(10, s.bossTrust + 1) })
}
```

---

## 改动六：第四条 Stat Bar

在 `StatBar` 渲染区域新增老板信任度条。

**显示参数：**
- label: `「⭐ 信任」`
- value: `state.bossTrust * 10`（将10点制映射到0-100供 StatBar 使用）
- color: `#facc15`（黄色）
- 危险阈值：`value < 30`（即 bossTrust <= 2）时变红

实际显示数值用 `state.bossTrust` 而非乘以10后的值（在 StatBar 内部区分 displayValue 和 pct）。

修改 `StatBar` 组件，支持可选的 `displayValue` prop：
- 若传入 `displayValue`，右侧显示 `displayValue` 而非 `value`
- `pct`（进度条宽度）仍用 `value`

调用：
```jsx
<StatBar label="⭐ 信任" value={state.bossTrust * 10} displayValue={state.bossTrust} color="#facc15" onClick={() => setState(s => ({...s, activeTip: activeTip === 'trust' ? null : 'trust'}))} />
```

---

## 改动七：四个数值的点击 Tips

### 交互逻辑

`activeTip` 存在 App 组件的 state 里（不在游戏 state 里，纯 UI 状态）。

点击任意 StatBar → 切换对应的 `activeTip`（再次点击或点击其他则关闭）。

`StatBar` 组件接受 `onClick` prop，点击时调用。

### Tips 渲染

在 `statsRow` 下方，当 `activeTip !== null` 时渲染一个展开区域：

样式：`background: #0c0c18, border: 1px solid #1a1a2e, borderRadius: 8, padding: "10px 14px", fontSize: 11, color: #666, fontFamily: monospace, lineHeight: 1.8`

**进度 tips（`activeTip === 'progress'`）：**
```
📈 进度
达到 100% 游戏上线，这是唯一的胜利条件。
每周基础 +3 · 冲进度行动 +3 · 事件影响不定
时间到了还不到 100%：延期失败
```

**士气 tips（`activeTip === 'morale'`）：**
```
💪 士气
归零：团队集体摆烂，项目解散。
< 35：危机安抚行动解锁（2AP，+25士气）
< 20：⚠️ 危险，每周自然衰减加快
团队关怀行动 +10 · 画饼/加班会持续消耗
```

**预算 tips（`activeTip === 'budget'`）：**
```
💰 预算
归零：项目被砍，直接失败。
< 25：紧急融资行动解锁（3AP，+18~32预算）
< 20：⚠️ 危险
加班付费、招人、各类事件都会消耗预算
```

**信任度 tips（`activeTip === 'trust'`）：**
```
⭐ 老板信任度（0-10）
0：触发「谈话」事件，可能直接失败。
≤ 2：每月底预算自动 -5，他在打听你的项目
≤ 4：管理层干预事件频率 ×2
≥ 8：管理层干预频率降低
向上管理行动 +1（2AP）· 顺利通过里程碑 +1
初始值随机（3-8）
```

---

## 不改的东西

- 现有事件内容和数值（除了替换 bossAnger 的部分）
- Patch 01-06 的改动成果
- 胜负判定里的士气/预算/时间归零逻辑（新增信任度=0的分支）

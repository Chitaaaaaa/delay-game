# Patch 05 — 「清醒的人」两阶段事件 + 双槽心腹扩展

## 文件位置
`C:\Users\69032\Downloads\demo-pet\demo-producer\delay-game.jsx`

---

## 改动一：State 扩展

### 新增字段

```js
// 在初始 state 里新增：
lucidConfidant: null | {
  subtype: "external" | "unstable" | "inner",
  usesLeft?: number,   // unstable 专用，初始值 3
},
scheduledEvents: [],   // [{ id: string, week: number }]
```

`scheduledEvents` 用于「N周后触发」的延迟事件机制，比 `pendingEvents` 多了一个 week 字段。

---

## 改动二：延迟事件触发机制

在 `pickEvent` 函数里，**优先级高于随机抽取**，检查 `scheduledEvents` 里是否有 `week <= state.week` 的事件：

```js
const due = state.scheduledEvents.find(e => e.week <= currentWeek);
if (due) {
  // 从 scheduledEvents 移除该条目
  // 返回对应的事件对象
}
```

触发后从 `scheduledEvents` 里移除该条目。

---

## 改动三：「清醒的人」Phase 1 事件

加入 `EVENTS` 数组，**不参与随机抽取**（同 `water_reveal`），通过专门逻辑触发。

**触发条件**：第 3-16 周之间，随机触发（概率约 1/8，每局最多触发一次）。可复用现有随机事件池逻辑，但加一个 `lucidTriggered` flag 防止重复。

```js
{
  id: "lucid_p1",
  name: "清醒的人",
  emoji: "🔬",
  color: "#e2e8f0",
  tagline: "「我只是说了实话。」",
  situation: "全员会议上，主程打断了老板：",
  dialogue: "「等一下——我觉得你说的不对。」\n\n会议室安静了三秒钟。老板笑了笑，把话题带过去了。但你注意到，他的眼神变了。\n\n所有人都在看你。",
  choices: [
    {
      text: "打个圆场，接过话头",
      effects: { progress: 0, morale: 3, budget: 0 },
      result: "气氛缓和了。他看了你一眼，什么都没说。",
      phase1: "A"
    },
    {
      text: "沉默，让他把话说完",
      effects: { progress: 0, morale: 8, budget: 0 },
      result: "他说完了。团队有人在桌子下鼓掌。老板记住了这件事。",
      phase1: "B"
    },
    {
      text: "「这个我们会后再跟进」",
      effects: { progress: 0, morale: 0, budget: 0 },
      result: "标准管理动作。没有人满意，也没有人受伤。",
      phase1: "C"
    },
  ]
}
```

**Phase 1 结算后**：
- 将 `{ id: "lucid_p2", week: state.week + 2 }` 加入 `scheduledEvents`
- 将玩家的 `phase1Choice`（"A"/"B"/"C"）存入 state：`lucidPhase1: "A" | "B" | "C"`

---

## 改动四：「清醒的人」Phase 2 事件

同样加入事件池但不随机触发，由 `scheduledEvents` 在第 `phase1Week + 2` 周触发。

```js
{
  id: "lucid_p2",
  name: "清醒的人",
  emoji: "🔬",
  color: "#e2e8f0",
  tagline: "「我只是说了实话。」",
  situation: "他发消息给你，问能不能见一面：",
  dialogue: "「制作人，我最近……不太顺。你知道的。\n\n我在面试了，应该能去个好地方。你愿意帮我写封推荐信吗？」",

  // 选项根据 lucidPhase1 动态生成（见下方）
}
```

### Phase 2 选项（根据 `state.lucidPhase1` 动态渲染）

**共同选项 A（始终可见）：写推荐信**
```js
{
  text: "写，祝你顺利",
  effects: { progress: -8, morale: -5, budget: 0 },
  result: "他走了。你花了一个小时写了一封认真的推荐信。",
  outcome: "external"
}
```
→ 结算后设置 `lucidConfidant = { subtype: "external" }`

**共同选项 B（始终可见）：劝他留下**
```js
{
  text: "你能不能再考虑一下",
  effects: { progress: -5, morale: -3, budget: 0 },
  result: "他摇摇头。「不是钱的问题。」但他留下来了——心不在了。",
  outcome: "unstable"
}
```
→ 结算后设置 `lucidConfidant = { subtype: "unstable", usesLeft: 3 }`

**专属选项 C（仅 `lucidPhase1 === "B"` 时可见）：帮他争取转岗**
```js
{
  text: "我帮你争取换一个组，不用走",
  effects: { progress: -3, morale: 0, budget: -8 },
  result: "花了一些政治资本，批了。他换了个组，离那个漩涡远了一些。",
  outcome: "inner"
}
```
→ 结算后设置 `lucidConfidant = { subtype: "inner" }`

### 固定结局文字（所有选项结算完后追加）

- A 和 C 型：
  > 「技术最强的人走了。老板的那个想法，三个月后悄悄从PRD里消失了。」

- B 型（unstable）：
  > 「他留下来了。但那个会议室里的某样东西，已经变了。」

- C 型（inner）：
  > 「他换了组。老板的那个想法，三个月后悄悄从PRD里消失了。他还在。」

---

## 改动五：三种 lucidConfidant 的效果

### A型 external（外部线人）

每周结算时，有 **20% 概率**在结果区域末尾显示一条他发来的消息（`lastBossReaction` 的位置，单独一行）：

```
📱 他发来消息：「[内容]」
```

消息内容池（随机抽取）：
- 「听说你们发行方最近换了负责人，我在业内听到过他的名字，小心。」
- 「外面有个项目和你们方向很像，已经在测了，你知道吗？」
- 「你们那个技术方案，圈子里有人评价过，我发给你看……」
- 「我新公司这边说，你们老板最近在和另一家发行接触，你有数吗？」

游戏效果：纯叙事，不改数值，但每条消息都是对某类即将到来事件的**模糊预警**（不精确指向，保留不确定性）。

### B型 unstable（不稳定心腹）

月底 milestone 选项C时，若 `lucidConfidant.subtype === "unstable"`，选项C的结果**不做 50% 骰子**，直接给出准确信息（从 CONFIDANT_REVEALS 矩阵里取对应条目）。

但每次使用后：`lucidConfidant.usesLeft -= 1`

当 `usesLeft === 0` 时：
- `lucidConfidant` 置 `null`
- 下一周触发一行叙事文字（用 `lastBossReaction` 位置）：
  > 「他最终还是提了离职。你已经不记得他用的是哪家猎头了。」

### C型 inner（第四类心腹）

月底 milestone 事件**新增一个选项 D**（仅当 `lucidConfidant?.subtype === "inner"` 时显示）：

```
选项D：「问问[他]，上面到底想看到什么」
  效果：progress -2, morale 0, budget 0
  结果：揭示该月老板/投资方的真实预期（见下方内容池）
  不加 water_reveal，不消耗 usesLeft（可重复使用）
```

**选项D揭示内容（按月份）：**

| 月份 | 内容 |
|------|------|
| 月1 | 「他说：『老板其实不在乎方向，他在乎的是下周能不能在董事会上放出去。』」 |
| 月2 | 「他说：『MVP评审的标准是投资人设的，不是老板，他自己也不知道过线在哪里。』」 |
| 月3 | 「他说：『上面现在有两个声音，一个要你们快，一个要你们稳，你只听到了快的那个。』」 |
| 月4 | 「他说：『发行方已经在看备选项目了，你们现在是A计划，但B计划也在推。』」 |
| 月5 | 「他说：『验收标准上周改了，没有人通知你。』」 |

---

## 改动六：UI 显示

Header 区域新增一行（在现有 `🤝 心腹：[role]` 下方）：

- `lucidConfidant.subtype === "external"`：`📱 线人：他` fontSize 10，color `#94a3b8`
- `lucidConfidant.subtype === "unstable"`：`⚡ 线人：他（剩余${usesLeft}次）` color `#fbbf24`
- `lucidConfidant.subtype === "inner"`：`🔬 心腹：他（内部）` color `#e2e8f0`
- `null`：不显示

---

## 不改的东西

- 现有 `confidant` 槽位逻辑不动
- Patch 01-04 的改动成果
- 胜负判定、卡牌开局流程

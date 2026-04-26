# Patch 06 — 「人海战术」事件 + 数值修正

## 文件位置
`C:\Users\69032\Downloads\demo-pet\demo-producer\delay-game.jsx`

---

## 改动一：数值修正

`ACTIONS` 里「冲进度」行动：
- `progress` 效果从 `+5` 改为 `+3`
- `desc` 从 `"进度+5  士气-4"` 改为 `"进度+3  士气-4"`
- `apply` 里 `s.progress + 5` 改为 `s.progress + 3`

---

## 改动二：State 扩展

```js
// 初始 state 新增：
bossAnger: false,          // 拒绝人海战术后设为 true
hireBurdenWeeksLeft: 0,    // 新人拖累剩余周数（>0时每周自动扣进度）
hireBurdenRate: 0,         // 每周扣的进度值（大规模=2，小规模=1）
hireScale: null,           // "large" | "small" | null
problemEmployee: null,     // null | { type: "code"|"morale", isInfiltrator: boolean }
```

---

## 改动三：新人拖累的自动结算

在 `handleChoice` 的 state 更新逻辑里，每周结算时检查 `hireBurdenWeeksLeft`：

```js
// 在计算 newProgress 之前：
const hirePenalty = prev.hireBurdenWeeksLeft > 0 ? prev.hireBurdenRate : 0;
const newHireBurdenWeeksLeft = Math.max(0, prev.hireBurdenWeeksLeft - 1);

// newProgress 扣除 hirePenalty
const newProgress = Math.min(100, Math.max(0,
  prev.progress + BASE_PROGRESS + eventEffect + modeBonus + pb - hirePenalty
));
```

当 `hireBurdenWeeksLeft` 从 1 变为 0 时，同时向 `scheduledEvents` 加入
`{ id: "hire_reveal", week: newWeek + 1 }`（下周触发结果揭晓）。

**planning 阶段 header 提示**（当 `hireBurdenWeeksLeft > 0` 时）：
在 header 里加一行小字：
`🧑‍💻 新人培训中，还剩 ${hireBurdenWeeksLeft} 周  进度 -${hireBurdenRate}/周`
颜色 `#f97316`，fontSize 10，monospace。

---

## 改动四：「人海战术」事件

加入 `EVENTS` 数组，参与随机抽取，但：
- 仅在 week 5-18 之间触发
- 每局最多触发一次（用 `manpowerTriggered` flag 控制）

```js
{
  id: "manpower",
  name: "人海战术",
  emoji: "👥",
  color: "#f97316",
  tagline: "「招人能解决一切问题！」",
  situation: "老板把你叫进办公室：",
  dialogue: "「进度有点慢啊。我觉得是人不够，我让HR那边准备了一批简历。\n你来定，招多少都行。\n对了，我有几个推荐的候选人你看一下，都是很不错的人。」\n\n你看了一眼他发来的名单。",
}
```

### 三个选项

**选项A：照单全招（大规模）**
```js
{
  text: "好，全部招进来",
  effects: { progress: 0, morale: 5, budget: -15 },
  result: "老板很满意。HR开始批量面试。你看着那份推荐名单，把它夹进了文件里。",
  action: "large"
}
```
→ 结算后：`hireScale = "large"`，`hireBurdenWeeksLeft = 4`，`hireBurdenRate = 2`

**选项B：据理力争（小规模）**
```js
{
  text: "人不是越多越好，我只招2个关键岗位",
  effects: { progress: 0, morale: 0, budget: -8 },
  result: "他有点不满意，但接受了。你花了点政治资本，至少把规模压下来了。",
  action: "small"
}
```
→ 结算后：`hireScale = "small"`，`hireBurdenWeeksLeft = 3`，`hireBurdenRate = 1`

**选项C：拒绝，提其他方案（条件解锁）**

此选项的文字和可用性根据当前数值动态判断，**三种方案互斥，取第一个满足的**：

| 条件 | 按钮文字 | 效果 | 结果文字 |
|------|---------|------|---------|
| `budget > 60` | 「我们投工具提效，不加人」 | `progress:+3, morale:0, budget:-15` | 「他皱了皱眉，但接受了。你把预算投进了自动化工具。」 |
| `morale > 70` | 「团队状态很好，我来推动冲刺」 | `progress:+5, morale:-12, budget:0` | 「他半信半疑。团队知道了，士气开始消耗。」 |
| 进度超前（`progress > (week/24)*100 + 10`） | 「进度没有问题，数据在这里」 | `progress:0, morale:0, budget:0` | 「他看了数据，没说话，挥了挥手让你走。老板记住了这件事。」|
| 以上全不满足 | ~~拒绝~~ | 选项灰色不可点 | — |

→ 任意选项C成功结算后：`bossAnger = true`

---

## 改动五：「新人结果揭晓」事件

加入事件池但不随机触发，仅由 `scheduledEvents` 触发，ID 为 `"hire_reveal"`。

```js
{
  id: "hire_reveal",
  name: "新人磨合结束",
  emoji: "🎲",
  color: "#a78bfa",
  tagline: "「培训期结束了。」",
  situation: "新人开始独立作业，这几周你也看清楚了：",
  dialogue: "【根据随机结果动态生成，见下方】",
}
```

### 随机结果逻辑

在事件触发时骰一次，结果写入临时状态用于渲染：

```
25% 神队友
35% 普通帮手
40% 问题人员
  其中若 hireScale === "large"：40% 概率其中一人是内鬼
  若 hireScale === "small"：20% 概率是内鬼
```

**神队友（25%）：**
```
dialogue: "他第一周就定位了一个困扰大家半个月的bug，顺手还重构了相关模块。
          主程私下说：「这人是个宝。」"
choice: { text: "很好，继续保持", effects: { progress: 5, morale: 8 } }
result: "他留下来了。每周进度悄悄多了一点。"  // 后续每周 progress+1，持续至游戏结束（activeBonus）
```

**普通帮手（35%）：**
```
dialogue: "表现正常，能按需求交付，不出乱子，也没有惊喜。
          就是又多了一个需要管理的人。"
choice: { text: "好，融入团队吧", effects: { progress: 0, morale: 0 } }
result: "他融入了。你几乎记不住他的名字。"
```

**问题人员（40%）：随机 code 或 morale 类型**

code 型：
```
dialogue: "主程发来一条消息：「这个新来的……他的代码我看了，
          不知道从哪里下手review。现在改他的东西比重写还慢。」"
choice: { text: "先观察", effects: { progress: -3, morale: -5 } }
result: "他留下来了。每次进度落后的时候，他让进度落得更快。"
→ 设置 problemEmployee: { type: "code", isInfiltrator: false/true }
```

morale 型：
```
dialogue: "他每天中午都在说上家公司有多好，下午在群里发
          「感觉这个需求不合理」「这么做有意义吗」。
          你已经收到了三个关于他的投诉。"
choice: { text: "先观察", effects: { progress: 0, morale: -8 } }
result: "他留下来了。士气本来就低的时候，他让士气低得更快。"
→ 设置 problemEmployee: { type: "morale", isInfiltrator: false/true }
```

**内鬼追加文字**（在问题人员结果末尾追加）：
```
「他和上面走得很近。你开始注意到，老板问的问题越来越精准。」
→ bossAnger = true（如果还不是的话）
→ 管理层干预事件（corp_kpi, corp_approval, kpi_review）权重 ×2
```

---

## 改动六：问题人员的系数 debuff

在每周 `handleChoice` 结算时，检查 `problemEmployee`：

```js
// code 型：进度已落后时放大下滑
if (problemEmployee?.type === "code") {
  const expectedProgress = (newWeek / TOTAL_WEEKS) * 100;
  if (newProgress < expectedProgress) {
    newProgress = Math.max(0, newProgress - 2); // 额外再扣2
  }
}

// morale 型：士气低时加快下滑
if (problemEmployee?.type === "morale") {
  if (newMorale < 50) {
    newMorale = Math.max(0, newMorale - 3); // 额外再扣3
  }
}
```

---

## 改动七：`bossAnger` 的效果

在 `pickEvent` 里，若 `bossAnger === true`，将以下事件的权重提升（实现方式：在候选事件池里加入额外副本）：
- `corp_kpi`（KPI季）
- `corp_approval`（18层审批）
- `kpi_review`（KPI施压）
- `market_trend`（跟风热）

每个额外加入一次，相当于抽到概率 ×2。

---

## 不改的东西

- 现有 `brooks_law` 事件保留（主动考虑招人的场景，与人海战术不冲突）
- Patch 01-05 的改动成果
- 胜负判定、卡牌开局流程

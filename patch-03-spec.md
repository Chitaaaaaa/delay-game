# Patch 03 — 心腹系统 + 月度 Milestone + 开场文本

## 文件位置
`C:\Users\69032\Downloads\demo-pet\demo-producer\delay-game.jsx`

---

## 改动一：开场文本

替换 `IntroScreen` 组件里的文本内容：

```
你今年35岁。
被毕业已经是半年前的事，
现在你是一位X滴司机。
好在你买的车够好，可以跑专车。
有一天，你接到了一位神秘乘客，
他很反常地和你聊了一路的天，直到把他送到了公司园区。
他说现在他无人可用，那些肥头大耳的老将都被他开除完了，
他愿意给你一次机会——
担任游戏制作人，试用期六个月。
你必须在24周内把游戏送上线。
否则……开除速度一定会很快！
```

样式保持原有的深色分行风格，按段落拆分 `<p>` 标签，颜色层次同原文。

---

## 改动二：心腹系统

### 状态定义

在游戏 state 里新增字段：

```js
confidant: null | {
  type: "emotional" | "technical" | "political",
  role: string,   // 显示用，如「核心程序员」「主程」「组长」
}
```

初始值为 `null`。

### 获取：通过特定事件的特定选项触发

以下三个现有事件，在玩家选了指定选项且当前 `confidant === null` 时，在结果里附带一段文字，并将 `confidant` 写入 state：

| 事件 ID | 触发选项 | 心腹类型 | role 字段 | 附加结果文字 |
|---------|----------|----------|-----------|-------------|
| `quitter` | 「给他批一个月调整假」（第3个选项） | `emotional` | `「核心程序员」` | 「他回来之后，私下找到你：『制作人，以后有什么事你直接问我。』」 |
| `perfectionist` | 「局部重构最关键的部分」（第2个选项） | `technical` | `「主程」` | 「他发现你是少数听得进技术建议的人。某天下班前他多说了几句实话。」 |
| `blamer` | 「拉双方当面对齐，建沟通机制」（第3个选项） | `political` | `「组长」` | 「握手言和之后，组长私下谢了你。他说：『你要知道什么，来找我。』」 |

### 失去：三种条件

1. **他离职**：`quitter` 事件再次触发，且当前 `confidant.role === 「核心程序员」`时，无论玩家选什么，事件结算后 `confidant` 置 `null`，并在结果文字末尾追加：
   > 「你意识到现在没有人会跟你说真话了。」

2. **被抽调**：`firefighter`（救火队）事件，选了「以大局为重，送人」时，若 `confidant !== null`，有 50% 概率 `confidant` 置 `null`，追加：
   > 「他在被抽走的名单里。你们之间的那条线，就这么断了。」

3. **被卖**：`blamer` 事件再次触发，且 `confidant.type === "political"`，选了「站程序」或「站策划」任一偏袒选项时，`confidant` 置 `null`，追加：
   > 「他看你的眼神变了。你知道那意味着什么。」

### UI 显示

在 header 区域（时间信息右侧或下方）新增一行：

- 有心腹时：`🤝 心腹：[role]`，颜色 `#a78bfa`，fontSize 10，monospace
- 无心腹时：不显示任何内容（不占空间）

---

## 改动三：月度 Milestone 事件

### 触发逻辑

在 `nextEvent` 函数里，当推进后的周数为 **5、9、13、17、21、25** 时（即进入新月第一周前），先显示月度 milestone，而不是普通事件。

用新状态 `pendingMilestone: number | null`（值为当前结束的月份编号 1-6）控制。

月度 milestone 在 **event 阶段**显示，替代普通随机事件。

---

### 月度 Milestone 事件结构

每月 milestone 是一个特殊事件对象，格式与普通 EVENTS 相同，但不进随机池。

**三个选项的通用结构：**

- **选项 A**（接受 Demo）：无前置条件，快但有隐患
  - 效果：正常进度，`pendingEvents` 加入 `"water_reveal"`
  
- **选项 B**（深入验收）：需要 planning 阶段消耗了 AP 行动「深入验收」才可选（见下方新行动）
  - 效果：进度小幅修正（-3 到 -8），消除水分风险，不加 `water_reveal`
  
- **选项 C**（找心腹私下问）：需要 `confidant !== null` 才可选，否则灰色不可点
  - 效果：揭示一条局部真相（文本），进度小幅修正（-2 到 -5），50% 概率消除 `water_reveal`

**选项 C 根据心腹类型显示不同的揭示内容（在结果文字里体现）：**
- `emotional`：「他说：『有两个人最近一直在投简历，还没告诉你。』」
- `technical`：「他说：『那个系统其实只支持演示场景，换一张地图就崩。』」
- `political`：「他说：『程序和策划现在有两个私下的群，你不在的会才说真话。』」

---

### 六个月的具体内容

**月1：立项启动评审**
```
name: "立项启动评审", emoji: "🚀", color: "#6366f1"
tagline: "「方向定了吗？」"
situation: "第一个月末，上面来看原型："
dialogue: "投资方代表坐在会议室里，笑着问：「能跑吗？大概什么感觉？
         我不需要完整的，能动就行。」
         你扫了一眼团队——他们昨晚熬通宵做了一个能跑的东西。"
choiceA: { text: "展示这个能跑的版本", result: "他们满意地点头。你没有告诉他们这是昨晚才做的。" }
choiceB: { text: "如实说明当前进度和风险", result: "他皱了皱眉，但最终点头：「诚实是好事。」进度没虚报，心里稳了。" }
choiceC: { text: "先找人确认这个版本有多少是真实的" }
effects: A{ progress:0, morale:5, budget:5 } B{ progress:-3, morale:3, budget:0 } C{ progress:-2, morale:0, budget:0 }
```

**月2：MVP 评审**
```
name: "MVP 评审", emoji: "🎮", color: "#0ea5e9"
tagline: "「核心玩法能玩通吗？」"
situation: "第二个月末，内部评审："
dialogue: "总监把手柄放下来：「核心循环我玩了十分钟，
         感觉还行，就是……有几个地方我有点疑问。」
         他翻开了一页记满问题的纸。"
choiceA: { text: "逐条解释，打消疑虑", result: "你回答了所有问题。有三个你其实不确定，但你说得很自信。" }
choiceB: { text: "承认部分问题，给出修复计划", result: "他看起来有点失望，但接受了时间表。进度是真实的。" }
choiceC: { text: "先确认这十分钟他没玩到的地方是什么情况" }
effects: A{ progress:0, morale:3, budget:3 } B{ progress:-4, morale:5, budget:0 } C{ progress:-2, morale:0, budget:0 }
```

**月3：基础闭环评审**
```
name: "基础闭环评审", emoji: "🔄", color: "#10b981"
tagline: "「从头玩到尾，不崩吗？」"
situation: "第三个月末，里程碑测试："
dialogue: "QA组发来报告：「我们跑了一遍主流程，
         有一些……情况。」
         你们约好了今天下午向上汇报全流程可用性。"
choiceA: { text: "先开会，QA的问题会后再处理", result: "汇报很顺利。QA报告被你压到了下周。" }
choiceB: { text: "推迟汇报，先处理QA问题", result: "上面有点不满意被推迟。但你知道自己在哪里。" }
choiceC: { text: "让心腹先看一下QA报告里哪些是真正的问题" }
effects: A{ progress:0, morale:0, budget:5 } B{ progress:-5, morale:3, budget:0 } C{ progress:-2, morale:0, budget:0 }
```

**月4：内容量产评审**
```
name: "内容量产评审", emoji: "📦", color: "#f59e0b"
tagline: "「内容够吗？」"
situation: "第四个月末，内容进度核查："
dialogue: "策划总监发来一个表格：「按计划，本月应该完成
         60%的关卡内容。我这边看到的数字是58%，差不多。」
         你的主程私下发消息：「那个数字是怎么算出来的？」"
choiceA: { text: "确认数字，继续推进", result: "58%通过了。你没有去追那条私信。" }
choiceB: { text: "要求重新核查内容完成标准", result: "核查花了三天。真实数字是41%。上面很不高兴。" }
choiceC: { text: "先回那条私信，问清楚" }
effects: A{ progress:0, morale:3, budget:3 } B{ progress:-8, morale:5, budget:0 } C{ progress:-3, morale:0, budget:0 }
```

**月5：整体验收评审**
```
name: "整体验收评审", emoji: "🔍", color: "#ef4444"
tagline: "「这个游戏，能上线吗？」"
situation: "第五个月末，外部评审："
dialogue: "发行方带了三个人来，玩了两个小时。
         会议室里安静了很长时间。
         最后他们说：「我们有一些反馈……」"
choiceA: { text: "接受反馈，承诺全部修改", result: "他们满意地走了。你看着那份修改清单，感觉最后一个月不够用。" }
choiceB: { text: "区分必改和不改，谈判范围", result: "谈了两个小时。砍掉了一半修改项。进度有损但可控。" }
choiceC: { text: "先私下确认团队能做到哪些" }
effects: A{ progress:-5, morale:-5, budget:5 } B{ progress:-3, morale:3, budget:0 } C{ progress:-2, morale:0, budget:0 }
```

**月6：上线前评审（特殊处理）**

月6是终局月，第24周触发胜利条件，不需要月度 milestone。跳过。

---

### `water_reveal` 事件内容

加入 `EVENTS` 数组，ID 为 `"water_reveal"`，不参与随机抽取，只通过 `pendingEvents` 触发：

```
name: "进度修正", emoji: "💧", color: "#64748b"
tagline: "「所以那个数字……」"
situation: "你在复盘上个月的里程碑，翻到了一些细节："
dialogue: "那两个「完整关卡」——一个是美术场景，没有碰撞体，走进去会穿模。
         另一个的通关逻辑还没写，只能走到中间。
         系统演示确实能跑，但只在那一张专用测试地图上。
         你打开进度表，盯着那几个数字看了很久。"
choices:
  A: 召集团队重新对齐真实进度 → { progress:-8, morale:-5, budget:0 }
     结果：「当众说出来了。有人沉默，有人低头。气氛很糟，但你终于知道自己在哪里。」
  B: 私下找主程重新评估 → { progress:-5, morale:0, budget:-5 }
     结果：「花了两天重新盘了一遍。数字调小了。只有你们两个人知道。」
  C: 默默调整内心预期 → { progress:-3, morale:3, budget:0 }
     结果：「你一个人坐着，把进度表里几个数字改小了。没有人知道。你也不确定这样做对不对。」
```

---

## 改动四：新增 Planning 阶段行动「深入验收」

在 `ACTIONS` 数组里新增一条：

```js
{
  id: "verify",
  emoji: "🔎",
  label: "深入验收",
  ap: 2,
  desc: "解锁本月 milestone B 选项（看原始 build）",
  always: false,
  available: (s, ctx) => ctx.isMonthEnd && !ctx.verifyDone,
  apply: s => s   // 不改数值，只是标记
}
```

`ctx` 需要新增 `isMonthEnd`（当前周是否为月末周，即 week % 4 === 0）和 `verifyDone`（本周是否已使用此行动）。

使用后在 state 里写入 `verifyUsedThisMonth: true`，月度 milestone 事件的 B 选项判断此字段是否为 true。

月底 milestone 结算完后重置此字段。

---

## 老板反应文本

在月度 milestone 事件结果文字末尾，所有选项都追加一行（淡色小字，作为环境叙事）：

```
选项A / 选项C未消除水分：
  「老板那边收到了你的月度汇报。他回复了一个大拇指。」

选项B / 选项C消除水分：
  「老板那边收到了修正后的数字。他沉默了两分钟，然后发来：『下个月盯紧点。』」
```

`water_reveal` 事件里不再重复老板反应，那是你自己发现的事，上面不知道。

---

## 不改的东西

- 现有事件内容（除了新增心腹触发文字）
- 胜负判定逻辑
- 开局卡牌流程
- Patch 01 / Patch 02 的改动成果

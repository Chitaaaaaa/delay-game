# Patch 41：强制世界事件 + 手写剧本原型系统

> 前置：Patch 01-40 已完成
> 目标：
>   A) 版号寒冬（2018-2019）和疫情（2020）作为强制世界事件实现
>   B) 建立手写剧本原型系统框架，供后续极明确原型（王者荣耀/原神等）挂载

---

## A：强制世界事件

### A.1 设计原则

版号寒冬和疫情不走原型匹配系统，原因：
- 它们影响**所有**玩家选择，不存在「没有匹配」的情况
- 它们是历史上真实发生的、超出个人控制的事件
- 开场独白（原型screen）不适合描述这类事件——它们不是「你的处境」，而是「世界对你做了什么」

实现方式：在 `buildInitialState()` 中，根据 marketYear 直接向 `scheduledEvents` 注入强制事件。

---

### A.2 版号寒冬（2018-2019）

**注入时机**：游戏第 `4` 周（给玩家一点时间先适应，然后寒冬来袭）

**事件内容**：

```js
{
  id: "world_license_freeze",
  name: "版号停发",
  emoji: "🚫",
  color: "#ef4444",
  tagline: "「游戏版号暂停核发」",
  isWorldEvent: true,        // 世界事件标记，无归因角色
  situation: "消息在凌晨突然传开：",
  dialogue: `国家相关部门宣布暂停游戏版号审批。

没有明确的恢复时间表。没有任何解释。

你手里的项目，不知道什么时候能上线了。`,
  choices: [
    {
      text: "先继续开发，等消息",
      effects: { morale: -8, budget: -5 },
      result: "团队情绪低落，但还在继续。你每天刷新政策页面，没有新消息。"
    },
    {
      text: "压缩团队规模，先活下去",
      effects: { morale: -15, budget: 10, progress: -5 },
      result: "裁了几个人。剩下的人明白了这是什么处境。项目慢下来了，但公司还在。"
    },
    {
      text: "用这段时间打磨质量",
      effects: { qualityDebt: -3, morale: -5, progress: -3 },
      result: "你告诉团队：把能做的事做好。没人完全信，但他们还是做了。"
    },
  ],
}
```

**追加机械效果**（独立于选项，版号寒冬期间全程生效）：

```js
// 注入强制事件的同时，设置全局修正
state.worldEventActive = "license_freeze";
state.budgetDrainBonus = (state.budgetDrainBonus || 0) + 0.15;  // 被动消耗+15%
// 持续至第 16 周自动解除（历史上2019年4月恢复）
state.worldEventEndsWeek = 16;
```

---

### A.3 疫情与远程（2020）

**注入时机**：游戏第 `3` 周

**事件内容**：

```js
{
  id: "world_covid_remote",
  name: "突然通知：全员居家",
  emoji: "🏠",
  color: "#6366f1",
  tagline: "「公司通知：明天起全员居家办公，时间未定」",
  isWorldEvent: true,
  situation: "周五下班前，HR发来通知：",
  dialogue: `「因为你们知道的原因，下周开始全员居家办公。
设备今天带回家，钉钉保持在线，有问题随时联系。」

你看了眼办公室。没人说话。大家开始收拾桌子。`,
  choices: [
    {
      text: "快速建立远程协作规范",
      effects: { morale: 3, progress: -4, budget: -3 },
      result: "你花了两天把协作流程理清楚。团队适应得还行，但效率明显下来了。"
    },
    {
      text: "维持原节奏，相信大家自律",
      effects: { morale: -3, progress: -8 },
      result: "有人状态好，有人完全失控。两周后你发现进度已经严重落后。"
    },
    {
      text: "降低当期目标，先稳住节奏",
      effects: { morale: 5, progress: -6, bossTrust: -1 },
      result: "团队松了口气。老板有点不高兴，但没有发作。进度在可控范围内慢下来了。"
    },
  ],
}
```

**追加机械效果**：

```js
state.worldEventActive = "covid_remote";
state.progressEfficiencyPenalty = 0.15;  // 每周进度产出-15%
state.worldEventEndsWeek = 12;           // 第12周「逐步恢复线下」
```

---

### A.4 世界事件的 buildInitialState 注入逻辑

```js
// 在 buildInitialState() 末尾

const WORLD_EVENTS = [
  { yearRange: [2018, 2019], week: 4,  eventId: "world_license_freeze" },
  { yearRange: [2020, 2020], week: 3,  eventId: "world_covid_remote"   },
];

WORLD_EVENTS.forEach(({ yearRange, week, eventId }) => {
  if (marketYear >= yearRange[0] && marketYear <= yearRange[1]) {
    state.scheduledEvents = [
      ...(state.scheduledEvents || []),
      { week, id: eventId, type: "world" }
    ];
  }
});
```

---

## B：手写剧本原型系统框架

### B.1 设计原则

手写剧本原型（以下简称「剧本」）是比「明确原型」更精确的一层：

```
明确原型：  年代 × 品类 × 背景 → 叙事氛围 + 机械修正
手写剧本：  上述条件 + 项目状态 + 团队 → 完整的剧情弧线 + 专属事件序列
```

剧本对应的是现实中**真实发生的游戏项目**，玩家如果选择了完全匹配的组合，
就会感受到「我在经历/复现那段历史」。

### B.2 已确认的剧本候选列表

| 游戏名 | 预计年代 | 品类 | 规模 | 背景 | 匹配难度 |
|--------|---------|------|------|------|---------|
| 王者荣耀 | 2015-2016 | MOBA | 大厂 | 策划/程序 | 高 |
| COK（列王的纷争）| 2013-2014 | SLG | 中厂 | 跨行业 | 高 |
| Love Live | 2012-2013 | ANIME/ROMANCE | 中厂 | 美术 | 中 |
| 梦幻西游手游 | 2014-2015 | LEGACY | 大厂 | 程序 | 高 |
| 阴阳师 | 2016 | ANIME/CARD | 中大厂 | 美术/策划 | 高 |
| 率土之滨 | 2015-2016 | SLG | 小中厂 | 策划 | 高 |
| 恋与制作人 | 2017-2018 | ROMANCE | 中厂 | 策划/美术 | 高 |
| 乱世王者 | 2017-2018 | SLG | 中厂 | 策划 | 中 |
| 荒野行动 | 2017 | BATTLE_ROYALE | 中厂 | 程序 | 高 |
| 刺激战场 | 2017-2018 | BATTLE_ROYALE | 大厂 | 程序 | 高 |
| 多多自走棋 | 2019 | AUTO_CHESS | 小厂 | 策划 | 高 |
| FGO | 2016-2017 | CARD/ANIME | 中厂 | 美术/策划 | 中 |
| 原神 | 2017-2020 | OPENWORLD | 大厂 | 美术/程序 | 极高 |
| 永劫无间 | 2019-2021 | ARPG/BATTLE_ROYALE | 中厂 | 程序 | 高 |
| 逆水寒手游 | 2021-2023 | ARPG/LEGACY | 大厂 | 程序/美术 | 高 |
| 蛋仔派对 | 2021-2022 | PARTY | 大厂 | 策划 | 高 |
| 三国：谋定天下 | 2022-2023 | SLG | 中厂 | 策划 | 中 |
| 永劫无间手游 | 2023-2024 | ARPG | 大厂 | 程序 | 高 |

### B.3 剧本数据结构

```js
const SCRIPT_ARCHETYPES = [
  {
    id: "script_wzry",
    name: "【内部代号：英雄之战】",    // 不直接写游戏名，用暗示性代号
    hint: "你知道这是什么。",          // 玩家懂的都懂
    conditions: {
      yearRange: [2015, 2016],
      genres: ["MOBA"],
      scales: ["large"],
      backgrounds: ["designer", "engineer"],
      // 无 projectStatus/teamType 限制（容错更高）
    },
    narrative: {
      opening: "[待手写]",
      eraNote: "[待手写]",
    },
    mechanics: {
      startingState: {},
      scheduledScriptEvents: [
        // 专属剧情事件序列，在特定周触发
        { week: 2,  eventId: "script_wzry_01" },   // [待定：早期立项压力]
        { week: 8,  eventId: "script_wzry_02" },   // [待定：竞品危机]
        { week: 14, eventId: "script_wzry_03" },   // [待定：上线前夕]
      ],
    },
  },
  // 其余剧本条目在后续会话中逐一手写补充
];
```

### B.4 剧本匹配优先级

```
剧本原型（script） > 明确原型（specific） > 模糊原型（fuzzy）
```

剧本匹配到时，直接替换明确原型的叙事，机械修正叠加生效。

### B.5 剧本专属事件

每个剧本有 2-4 个专属剧情事件（scheduledScriptEvents），在固定周触发，
这些事件描述那段历史中真实发生过的关键节点——
不点名，但玩过的人都知道在说什么。

具体内容待用户逐一提供手写素材后录入。

---

## 九、验证点

- [ ] marketYear=2018/2019 时，第4周触发版号停发事件
- [ ] marketYear=2020 时，第3周触发全员居家事件
- [ ] 版号寒冬期间 budgetDrainBonus 正确生效
- [ ] 疫情期间 progressEfficiencyPenalty 正确生效
- [ ] 世界事件结束后 worldEventActive 清空，修正解除
- [ ] 剧本原型优先级高于明确原型
- [ ] 剧本匹配时 scheduledScriptEvents 正确注入 scheduledEvents
- [ ] 无剧本匹配时回落到明确原型（系统降级正常工作）

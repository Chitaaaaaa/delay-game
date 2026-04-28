# Patch 40：开局叙事原型系统

> 前置：Patch 01-39 已完成
> 目标：根据玩家开局选择（年代×规模×品类×背景）匹配叙事原型，
>       在进入游戏前展示开场独白，并将「隐藏压力」转化为全局机械修正

---

## 一、系统概述

```
开局选牌完成
    ↓
matchArchetype() 扫描所有原型，找到最优匹配
    ↓
触发「原型开场」screen（新增 appPhase）
    ↓
玩家确认后进入游戏
    ↓
原型的机械修正在 buildInitialState() 中叠加生效
```

原型分两级：
- **明确原型**：年代+品类+背景同时匹配，唯一触发
- **模糊原型**：条件宽松，在无明确原型时触发兜底

---

## 二、原型数据结构（完整版）

```js
const ARCHETYPES = [
  {
    id: "legacy_twilight",
    name: "页游余晖前夜",
    type: "specific",
    conditions: {
      yearRange: [2012, 2013],
      genres: ["LEGACY"],
      scales: ["small", "mid"],
      projectStatuses: ["new"],
      teamTypes: ["mixed"],
      backgrounds: null,        // null = 任意
    },
    narrative: {
      opening: `...`,
      eraNote: `...`,
    },
    mechanics: {
      startingState: { qualityDebt: 2 },
      budgetDrainBonus: 0.20,
      eventWeights: {
        capital_wave: 2.0,      // 正数 = 加权
        campus_recruit: 0.3,    // <1.0 = 压低
      },
      npcWeights: { "幻想家": 1.5 },
      exclusiveEvents: [
        // { week: N, id: "arch_xxx_NN", ... }
      ],
    },
  },
];
```

### mechanics 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `startingState` | object | 叠加到初始 state 的字段修正 |
| `budgetDrainBonus` | number | 额外预算消耗倍率（0.20 = +20%）|
| `eventWeights` | object | 现有事件的权重修正，<1.0 表示压低，>1.0 表示加权 |
| `npcWeights` | object | NPC 人格的出现权重修正 |
| `exclusiveEvents` | array | 仅在此原型触发的专属事件，按 week 注入 scheduledEvents |

---

## 三、触发匹配算法

```js
function matchArchetype(state) {
  const { marketYear, studioScale, gameDirection, playerBackground,
          industryBackground, projectStatus, teamType } = state;

  // 优先匹配明确原型
  for (const archetype of ARCHETYPES.filter(a => a.type === "specific")) {
    const c = archetype.conditions;
    if (
      (!c.yearRange   || (marketYear >= c.yearRange[0] && marketYear <= c.yearRange[1])) &&
      (!c.genres      || c.genres.includes(gameDirection)) &&
      (!c.scales      || c.scales.includes(studioScale)) &&
      (!c.projectStatuses || c.projectStatuses.includes(projectStatus)) &&
      (!c.teamTypes   || c.teamTypes.includes(teamType)) &&
      (!c.backgrounds || c.backgrounds.includes(playerBackground) || c.backgrounds.includes(industryBackground))
    ) {
      return archetype;
    }
  }

  // 降级匹配模糊原型
  for (const archetype of ARCHETYPES.filter(a => a.type === "fuzzy")) {
    const c = archetype.conditions;
    if (/* 宽松匹配 */ matchFuzzy(c, state)) {
      return archetype;
    }
  }

  return null; // 无匹配，不显示原型screen
}
```

---

## 四、新增 appPhase

```
"intro" → "cards" → "archetype" → "onboarding" → "game"
```

`"archetype"` 在选牌完成后、上手引导前触发（如无匹配原型则跳过）。

### 4.1 ArchetypeScreen 组件

```jsx
function ArchetypeScreen({ archetype, onNext }) {
  return (
    <div style={{ ...全屏叙事布局... }}>
      <div style={{ ...原型名... }}>
        {archetype.name}
      </div>
      <div style={{ ...时代注脚... }}>
        {archetype.narrative.eraNote}
      </div>
      <div style={{ ...开场独白... }}>
        {archetype.narrative.opening}
      </div>
      <button onClick={onNext}>就是这里了 →</button>
    </div>
  );
}
```

动画：与 IntroScreen 一致，staggered fadeUp，标题先，独白后，按钮最后。

---

## 五、机械修正叠加

在 `buildInitialState()` 末尾，读取匹配到的原型并叠加修正：

```js
const archetype = matchArchetype(partialState);
if (archetype) {
  state.activeArchetypeId = archetype.id;
  const m = archetype.mechanics;

  // 初始 state 修正
  if (m.startingState) {
    Object.keys(m.startingState).forEach(key => {
      state[key] = Math.max(0, (state[key] || 0) + m.startingState[key]);
    });
  }

  // 预算消耗修正（叠加到 budgetDrainMultiplier）
  if (m.budgetDrainBonus) {
    state.archetypeBudgetDrainBonus = m.budgetDrainBonus;
  }

  // 事件权重修正（存储，供事件调度读取）
  if (m.eventWeights) {
    state.archetypeEventWeights = m.eventWeights;
  }

  // NPC权重修正（存储，供 getAppearanceWeight 读取）
  if (m.npcWeights) {
    state.archetypeNpcWeights = m.npcWeights;
  }

  // 强制事件注入
  if (m.mandatoryEvents) {
    state.scheduledEvents = [...(state.scheduledEvents || []), ...m.mandatoryEvents];
  }
}
```

---

## 六、全部明确原型数据

### 机械修正速查表

| 原型 | 初始state修正 | 预算消耗 | 事件权重 | NPC权重 |
|------|-------------|---------|---------|--------|
| 页游余晖前夜 | qualityDebt+2 | +20% | capital_wave×2 | 幻想家×1.5 |
| 卡牌野蛮生长 | morale-5 | — | 灵机一动×2 | — |
| 端游末路余钟 | qualityDebt+3 | +10% | — | — |
| 数值红利盛夏 | directionClarity-10 | — | — | 幻想家×1.5 |
| MOBA赛道血战 | — | +15% | 雷公×2 | — |
| 空降吃鸡风口 | qualityDebt+3 | — | — | — |
| 版号冰封长夜 | — | — | — | — ⚠️见patch-41 |
| 画质军备竞赛 | — | +30% | — | 完美主义×2 |
| 云端隔屏攻坚 | — | — | — | — ⚠️见patch-41 |
| 流水断崖回落 | budget-15 | — | 防沉迷×∞⚠️强制 | — |
| 元宇宙泡沫局 | qualityDebt+4, directionClarity-15 | — | — | 空中楼阁×2 |
| 女性向新蓝海 | — | — | — | 完美主义×1.5 |
| AI重构研发场 | — | — | — | 布道者×1.5 |
| 海外阵地攻坚 | qualityDebt+2 | +15% | 雷公×1.5 | 铁头功×1.5 |
| 热钱砸入赛道 | — | — | — | 铁头功×2, 空中楼阁×1.5 |
| 直播定生死局 | directionClarity-10 | +20% | — | 幻想家×1.5 |

⚠️ 版号冰封长夜、云端隔屏攻坚以强制世界事件实现（见 patch-41），不走机械修正。
⚠️ 防沉迷新规在第 5 周强制注入「防沉迷政策落地」世界事件。

### 各原型条件定义（代码形式）

```js
// 仅列条件，narrative 内容见下方文案区

{ id: "legacy_twilight",     yearRange:[2012,2013], genres:["LEGACY"],          scales:["small","mid"],       projectStatuses:["new"],             teamTypes:["mixed"],  backgrounds:null },
{ id: "card_boom",           yearRange:[2013,2014], genres:["CARD","CHESS_CARD"],scales:["small"],             projectStatuses:["new"],             teamTypes:["fresh"],  backgrounds:["designer"] },
{ id: "pc_mmo_sunset",       yearRange:[2014,2016], genres:["PC_MMO"],           scales:["large"],             projectStatuses:["new"],             teamTypes:["veteran"],backgrounds:["engineer"] },
{ id: "number_design_peak",  yearRange:[2015,2016], genres:["SLG","CARD"],       scales:["small","mid"],       projectStatuses:["new"],             teamTypes:["mixed"],  backgrounds:["designer"] },
{ id: "moba_war",            yearRange:[2016,2017], genres:["MOBA"],             scales:["large"],             projectStatuses:["new"],             teamTypes:["veteran"],backgrounds:null },
{ id: "battle_royale_rush",  yearRange:[2017,2018], genres:["BATTLE_ROYALE"],    scales:["mid"],               projectStatuses:["new"],             teamTypes:["mixed"],  backgrounds:["engineer"] },
{ id: "license_freeze",      yearRange:[2018,2019], genres:null,                 scales:null,                  projectStatuses:null,                teamTypes:null,       backgrounds:null },  // → patch-41
{ id: "quality_arms_race",   yearRange:[2019,2021], genres:["OPENWORLD","ARPG"], scales:["large"],             projectStatuses:["new"],             teamTypes:["mixed"],  backgrounds:["artist"] },
{ id: "covid_remote",        yearRange:[2020,2020], genres:null,                 scales:null,                  projectStatuses:["new","handover"],  teamTypes:["mixed"],  backgrounds:null },  // → patch-41
{ id: "minor_protection",    yearRange:[2021,2021], genres:["CASUAL","IDLE","CARD","CHESS_CARD","ROMANCE","AUTO_CHESS","PARTY","ANIME"], scales:null, projectStatuses:null, teamTypes:null, backgrounds:null },
{ id: "metaverse_dream",     yearRange:[2021,2022], genres:["METAVERSE"],        scales:["mid","large"],       projectStatuses:["new"],             teamTypes:["fresh"],  backgrounds:["blockchain"] },
{ id: "otome_awakening",     yearRange:[2020,2022], genres:["ROMANCE","ANIME"],  scales:["small","mid"],       projectStatuses:["new"],             teamTypes:["mixed"],  backgrounds:["artist","designer"] },
{ id: "ai_pioneer",          yearRange:[2023,2024], genres:["AI_NATIVE"],        scales:null,                  projectStatuses:["new"],             teamTypes:["fresh"],  backgrounds:["engineer","outsider"] },
{ id: "overseas_slg",        yearRange:[2023,2025], genres:["SLG","GLOBAL"],     scales:["mid","large"],       projectStatuses:["new"],             teamTypes:["mixed"],  backgrounds:["pm"] },
{ id: "capital_rush",        yearRange:[2018,2020], genres:null,                 scales:["mid","large"],       projectStatuses:["new"],             teamTypes:["mixed"],  backgrounds:["realestate","finance"] },
{ id: "livestream_rules",    yearRange:[2021,2023], genres:["CASUAL","IDLE","CARD","ROMANCE","AUTO_CHESS","PARTY","ANIME"], scales:null, projectStatuses:null, teamTypes:null, backgrounds:["mcn"] },
```

---

## 七、模糊原型（兜底）

```js
// 无明确原型时按优先级匹配

{ id: "fuzzy_inherited_mess",  name:"接盘侠",    conditions:{ projectStatuses:["handover","zombie"] } },
{ id: "fuzzy_outsider_boss",   name:"外行空降",  conditions:{ backgrounds:["outsider"], genres:["OPENWORLD","ARPG","SLG","MOBA","METAVERSE"] } },
{ id: "fuzzy_tech_debt",       name:"技术债宿命",conditions:{ backgrounds:["engineer"], projectStatuses:["zombie"] } },
{ id: "fuzzy_fresh_gamble",    name:"新团队赌博",conditions:{ teamTypes:["fresh"], scales:["large","xlarge"] } }, // xlarge = 特大体量品类
{ id: "fuzzy_small_big_dream", name:"小厂大梦",  conditions:{ scales:["small"], genres:["OPENWORLD","ARPG","MOBA","SLG"] } },
{ id: "fuzzy_artist_vision",   name:"审美强人",  conditions:{ backgrounds:["artist"], genres:["ROMANCE","ANIME"] } },
```

模糊原型的 narrative 内容和 mechanics 另行补充（内容较少，优先级低于明确原型）。

---

## 八、文案区（narrative 内容）

所有明确原型的 opening + eraNote 已在需求文档中确认，
实现时直接从「游戏制作人全量清晰原型·开局叙事模组」文档读取对应内容录入即可。

---

## 九、四个原型的完整事件生态（模板，其余原型照此补充）

### 9.1 元宇宙泡沫局

```js
eventWeights: {
  capital_wave: 3.0,
  zombie_reveal: 2.0,
  kpi_review: 2.0,
  campus_recruit: 0.3,
  team_shortage: 0.2,
},
npcWeights: { "空中楼阁": 2.0, "幻想家": 1.5 },
exclusiveEvents: [
  { week: 6,  id: "arch_meta_media" },
  { week: 10, id: "arch_meta_chain_bug" },
  { week: 14, id: "arch_meta_regulation" },
],
```

**专属事件内容：**

`arch_meta_media`（第6周）
```
名称：媒体来了
情境：PR 发来消息——
对话：「36氪的记者联系我们，想做一期『游戏+Web3先行者』的深度专访，
      问我们是否接受采访。产品还没做出来，但他们对故事很感兴趣。」

选项A：接受，讲讲我们对行业的判断
  效果：bossTrust+1, morale+5, directionClarity-8
  结果：「报道出来了，标题很好听。团队很兴奋，投资人转发了。
        你知道，接下来要被这个故事追着跑了。」

选项B：婉拒，产品没出来前不造势
  效果：morale-3, directionClarity+5
  结果：「记者有点失望。团队也有点失落——大家都想出名。
        但你觉得，至少还有机会用产品说话。」
```

`arch_meta_chain_bug`（第10周）
```
名称：链上出问题了
情境：安全研究员在推特上发帖——
对话：「他说在我们合约里发现了一个逻辑漏洞，理论上可以任意铸造NFT。
      帖子正在扩散，目前800转发，还在涨。媒体已经开始联系我们了。」

选项A：立即暂停合约，公告承认漏洞
  效果：progress-5, bossTrust-1, morale-3, qualityDebt-2
  结果：「你第一时间公告。社区骂了一天，但大部分人说：
        『至少他们没捂』。修复花了一周，合约重新上线。」

选项B：悄悄修复，不公开声明
  效果：qualityDebt-1, morale+2
  结果：「修复推上去了，没人注意到。但那个研究员
        还在帖子评论区等你回应。你选择沉默。
        这件事，也许就这么过去了。」

选项C：联系那个研究员，请他帮忙做全面审计
  效果：budget-8, qualityDebt-3, relationship提升（随机角色）
  结果：「他接了。花了十天，把整个合约翻了一遍。
        你付了他一笔不小的费用。团队松了口气——
        至少知道水下还有什么了。」
```

`arch_meta_regulation`（第14周）
```
名称：监管约谈
情境：律师发来紧急邮件——
对话：「相关部门对区块链游戏发布了新的指导意见，
      现有的Token经济模型触碰了若干红线。
      需要在两周内提交合规说明，并暂停相关功能上线。」

选项A：立即整改，配合监管
  效果：progress-10, budget-10, bossTrust+1
  结果：「两周后你提交了整改方案。Token部分全部下线，
        游戏变成了一个……普通游戏。投资人沉默了三天。」

选项B：找律师争取，看能不能谈
  效果：budget-15, progress-5
  结果：「律师费烧了不少。结论是：有些东西是谈不了的。
        你还是得改，只是多花了两周和一笔钱。」
```

---

### 9.2 空降吃鸡风口

```js
eventWeights: {
  thunder: 2.0,        // 技术突发事故
  zombie_reveal: 1.5,  // 技术债暴露
  market_trend: 2.0,   // 市场变化
  lucid_p1: 1.5,       // 技术主程站出来说真话
  manage_up: 0.5,      // 向上管理没时间做
},
npcWeights: { "完美主义": 1.5, "自由发挥": 1.5 },
exclusiveEvents: [
  { week: 3,  id: "arch_br_competitor" },
  { week: 8,  id: "arch_br_cheat" },
  { week: 12, id: "arch_br_sync_hot" },
],
```

**专属事件内容：**

`arch_br_competitor`（第3周）
```
名称：对手上线了
情境：你刷到一条推送——
对话：「竞品悄悄上线了，没有发布会，没有预热。
      但首日DAU已经超过50万。他们比你早了至少两个月。
      你打开他们的游戏，和你们做的方向几乎一模一样。」

选项A：加速，能砍的全砍，先上线
  效果：progress+5, qualityDebt+4, morale-5
  结果：「团队连续两周没有休息日。进度上来了，
        但你开始收到bug报告，频率越来越高。」

选项B：不改节奏，打磨好再上
  效果：morale+3, directionClarity+5
  结果：「你告诉团队：他们做的是他们的，我们做的是我们的。
        没人完全相信，但大家继续做了。窗口期还在收窄。」

选项C：调整方向，做差异化
  效果：directionClarity-10, progress-5, morale-3
  结果：「你花了三天开会讨论差异点。最终决定加一个模式。
        没人确定这是对的，但至少不是纯跟风了。」
```

`arch_br_cheat`（第8周）
```
名称：外挂猖獗
情境：玩家社区炸锅了——
对话：「外挂工作室在卖透视和自动瞄准。差评榜上排第一的词是『外挂』。
      主程说，现在的反作弊是上线前两周临时接的，漏洞很多。」

选项A：紧急接入专业反作弊SDK
  效果：budget-12, progress-5, qualityDebt-2
  结果：「花了两周接入。外挂少了，但新的适配问题又来了。
        玩家说比以前好，但还没好到够。」

选项B：人工封号，先顶着
  效果：morale-5, budget-3
  结果：「专门成立了一个举报处理小组。每天处理几百个举报。
        外挂还在，但玩家看到你在处理，差评少了一些。」

选项C：在游戏里加羞辱外挂玩家的机制
  效果：morale+5, directionClarity-5, bossTrust-1
  结果：「团队很喜欢这个主意。外挂视频反而成了传播素材。
        但法务说这可能有风险。老板让你解释一下你在干嘛。」
```

`arch_br_sync_hot`（第12周）
```
名称：同步问题上热搜了
情境：你早上一睁眼——
对话：「一个UP主发了一个合集视频，全是玩家录下来的同步延迟、
      瞬移、子弹穿模。播放量昨晚到了800万。
      #某某游戏同步问题# 正在微博热搜第三位。」

选项A：当天发公告，承认问题，给补偿
  效果：budget-8, bossTrust-1, morale-3
  结果：「公告发出去，一波道歉包发下去。骂声小了一些。
        但主程说，这个问题不是一周能修完的。」

选项B：联系UP主，私下沟通
  效果：budget-5, directionClarity-3
  结果：「UP主没有删视频，但在评论区发了一条：
        『官方已联系，在处理中』。舆论暂时稳住了。
        你买来了时间，但问题还在。」

选项C：技术层面紧急优化，不公开回应
  效果：progress-8, qualityDebt-2
  结果：「沉默处理。一周后有玩家发帖说感觉好多了。
        热搜过了，大部分人忘了这件事。
        技术债少了一点，但你永远不知道下次什么时候再爆。」
```

---

### 9.3 画质军备竞赛（原神冲击）

```js
eventWeights: {
  kpi_review: 2.0,
  manpower: 1.5,
  zombie_reveal: 1.5,
  campus_recruit: 2.0,  // 疯狂招人
  manage_up: 0.3,       // 没空管上面
},
npcWeights: { "完美主义": 2.0, "远见": 1.5, "幻想家": 0.5 },
exclusiveEvents: [
  { week: 5,  id: "arch_ow_rival_trailer" },
  { week: 9,  id: "arch_ow_art_director" },
  { week: 13, id: "arch_ow_device_compat" },
],
```

**专属事件内容：**

`arch_ow_rival_trailer`（第5周）
```
名称：竞品出预告片了
情境：周一早上所有人都在刷同一个视频——
对话：「另一家大厂的开放世界预告片昨晚发布，两分钟，没有游戏实机，
      全是CG。但弹幕全是『这才是游戏该有的样子』。
      你们美术组的群沉默了半小时后，有人发了一句：
      『我们现在的标准够吗？』」

选项A：召开全组会议，重新对齐视觉目标
  效果：morale+5, progress-6, directionClarity-8
  结果：「会议开了三个小时。结论是：有几块要推翻重做。
        没人说这不值得，但排期表上多了两个红色区块。」

选项B：告诉团队：我们比的是游戏，不是CG
  效果：morale-3, directionClarity+5
  结果：「说完这句话，你感到有人信，有人不信。
        标准没有变，但那个视频的阴影还在。」

选项C：偷偷联系对方的美术外包团队
  效果：budget-10, qualityDebt-2, morale+3
  结果：「他们有档期。价格不便宜，但出来的东西确实不一样。
        你在成本报告里写的是『特效优化外包』。」
```

`arch_ow_art_director`（第9周）
```
名称：美术总监的标准
情境：主美找你单独谈——
对话：「他把平板推到你面前，上面是两张角色图对比：
      一张是你们现在的，一张是他觉得应该到的标准。

      差距很明显。他说：『我知道这意味着什么。但如果我们
      用现在这个标准上线，我没有办法在简历上写这个项目名。』」

选项A：支持他，给资源，重做
  效果：progress-10, budget-12, morale+8, qualityDebt-3
  结果：「你批了。美术组的士气是几个月来最高的一次。
        进度表上多出来的空白，你还不知道怎么解释。」

选项B：现在的标准够用，不重做
  效果：morale-8, directionClarity+3
  结果：「他点了点头，没有再说什么。你注意到他
        第二天开始准时下班，不再主动提优化建议了。」

选项C：折中：只重做主角，其他次要角色保持现状
  效果：progress-5, budget-5, morale+3
  结果：「他接受了。不完美，但够用。你们都知道
        这是一个妥协，但妥协有时候也是一种完成。」
```

`arch_ow_device_compat`（第13周）
```
名称：中端机跑不了
情境：QA发来测试报告——
对话：「目标画质设置下，红米Note系列帧率平均23帧，
      发热严重，5分钟后开始降频。
      这个价位段占国内安卓用户的35%。」

选项A：做动态画质方案，自动适配设备
  效果：progress-8, budget-8, qualityDebt+2
  结果：「花了三周做适配层，基本跑通了。
        高端机效果没变，中端机能玩了，只是『没那么好看』。
        这个说法，你还不知道玩家怎么看。」

选项B：放弃中端机市场，只做旗舰体验
  效果：directionClarity+5, morale-5, bossTrust-2
  结果：「市场部沉默了一会儿，然后发来一张DAU预测图。
        老板让你再想想。」

选项C：降低默认画质标准，所有机型统一用中等设置
  效果：morale-10, qualityDebt-1, bossTrust-1
  结果：「美术组知道了这个决定之后，主美当天请了病假。
        画质军备竞赛，你选择了撤退。」
```

---

### 9.4 海外阵地攻坚（出海SLG）

```js
eventWeights: {
  kpi_review: 2.0,
  thunder: 1.5,
  manage_up: 0.5,
  campus_recruit: 0.3,  // 本地人才难招
},
npcWeights: { "铁头功": 1.5, "空中楼阁": 1.5, "布道者": 1.5 },
exclusiveEvents: [
  { week: 4,  id: "arch_os_culture_mine" },
  { week: 9,  id: "arch_os_ua_blackhole" },
  { week: 14, id: "arch_os_data_local" },
],
```

**专属事件内容：**

`arch_os_culture_mine`（第4周）
```
名称：踩到文化雷区了
情境：本地合作伙伴发来紧急消息——
对话：「你们游戏里某个历史武将的形象，在目标市场是非常敏感的符号。
      上周已经有媒体在问了。如果不处理，上线后可能直接被下架。」

选项A：替换这个角色，重新设计
  效果：progress-6, budget-5
  结果：「美术花了十天重做。合规过了，但这个角色的
        原始设计你还是觉得更好看。」

选项B：改名字和外观，保留底层数值设计
  效果：progress-3, budget-2
  结果：「换了个名字，换了件衣服。本地伙伴说应该够了，
        但建议你继续观察。」

选项C：咨询当地法律团队后再决定
  效果：budget-8, progress-2
  结果：「法律意见来了：建议替换。
        你花了一笔咨询费，得到了你两周前就猜到的结论。」
```

`arch_os_ua_blackhole`（第9周）
```
名称：买量黑洞
情境：市场部提交了本月投放报告——
对话：「目标市场的用户获取成本是预测值的3.2倍。
      钱在烧，新增在涨，但LTV模型走不通——
      玩家进来了，但付费率比预期低40%。」

选项A：继续投，等LTV数据稳定
  效果：budget-15, bossTrust-1
  结果：「又烧了三周。数据没有明显好转。
        你意识到可能是产品本身的问题，不是买量的问题。」

选项B：暂停投放，先优化留存
  效果：progress-5, morale-3
  结果：「买量暂停，团队转向留存优化。
        两周后数据有一点改善。你重新打开投放，更保守了。」

选项C：换市场，试试东南亚
  效果：budget-5, directionClarity-8
  结果：「东南亚的获客成本低很多，但市场体量也小很多。
        这不是你最初想做的那个故事了。」
```

`arch_os_data_local`（第14周）
```
名称：数据本地化要求
情境：法务发来紧急通知——
对话：「目标国通过新法规，要求游戏用户数据必须存储在本地服务器。
      现有架构完全不支持。合规截止日期：六周后。」

选项A：紧急搭建本地服务器基础设施
  效果：budget-20, progress-8, qualityDebt+2
  结果：「花了六周，勉强合规了。架构很脆，但能用。
        你知道这里还会有后续问题。」

选项B：找本地合作伙伴，托管数据
  效果：budget-10, bossTrust-1
  结果：「合作谈下来了，但数据主权出让给了对方。
        老板对这个方案不太满意，但接受了。」

选项C：评估是否值得继续做这个市场
  效果：morale-8, directionClarity+5
  结果：「你做了一张ROI表格。结论不好看。
        这个市场，可能本来就不适合你们现在的体量。」
```

---

## 十、其余12个原型的事件生态（待补充）

使用 [background-prompt-template.md](background-prompt-template.md) 中的模板，
将每个原型的「隐藏压力」作为输入，用豆包批量生成：
- eventWeights 加权/压低表
- npcWeights 修正表
- exclusiveEvents 2-3个专属事件

已完成模板的4个原型可直接作为示例输入。

---

## 十一、验证点

- [ ] 选牌完成后正确触发 archetype 匹配
- [ ] 有匹配时显示 ArchetypeScreen，无匹配时跳过
- [ ] 明确原型优先于模糊原型
- [ ] ArchetypeScreen 动画与 IntroScreen 风格一致
- [ ] buildInitialState 正确叠加 startingState 修正
- [ ] archetypeBudgetDrainBonus 在 budget drain 计算中被读取
- [ ] archetypeEventWeights 在事件调度中被读取
- [ ] archetypeNpcWeights 在 getAppearanceWeight 中被读取
- [ ] 防沉迷新规原型：第5周强制注入政策事件
- [ ] 版号寒冬/疫情条件匹配时跳过原型screen（由patch-41接管）

# Patch 20：品类专属事件池 + 背景职能解锁

> 前置：Patch 01-19 已完成
> 合并原 patch-20（品类专属事件池）与 patch-21（背景职能解锁）为单一 patch

---

## 一、Part A：品类专属事件池

### 1.1 机制说明

每个 gameDirection 锁定后，对应的 1 个专属事件加入该局可触发事件池。专属事件有 minWeek 字段，仅在方向锁定且周数 >= minWeek 时可触发。触发后标记到 narrationsUsed，每局最多触发一次。

### 1.2 触发逻辑

在 pickEvent 中，方向专属事件与通用事件池 EVENTS 并列参与随机抽取：

```javascript
if (s.gameDirection && s.directionChosen) {
  const dirEvents = DIRECTION_SPECIFIC_EVENTS.filter(e =>
    e.direction === s.gameDirection
    && newWeek >= e.minWeek
    && !(s.narrationsUsed || []).includes(e.id)
  );
  pool = [...pool, ...dirEvents];
}
```

### 1.3 隐性维度分配

每个事件的选项含 hidden 字段，存放隐性积分变化。跨层效果原则：显性 1-2 个 + 半显性 0-1 个 + 隐性 0-1 个。

```
方向            主隐性     次隐性
OPENWORLD      quality    judgment
BATTLE_ROYALE  grit       judgment
ANIME          people     quality(半显)
SLG            people     honesty
AI_NATIVE      judgment   honesty
ROMANCE        judgment   grit(选项B)
IDLE           quality    judgment(选项C)/honesty(选项B)
MINI_GAME      honesty
LEGACY         people     honesty(选项C)
METAVERSE      judgment   honesty(选项A)
```

### 1.4 handleChoice 集成

方向专属事件触发后，需在 handleChoice 中处理 hidden 字段的隐性积分变化。新增 id 前缀判断：

```javascript
if (event?.id?.startsWith('dir_') && choice.hidden) {
  Object.entries(choice.hidden).forEach(([key, val]) => {
    if (newState[key] !== undefined) {
      newState[key] = Math.max(0, Math.min(10, newState[key] + val));
    }
  });
}
if (event?.id?.startsWith('dir_')) {
  newState.narrationsUsed = [...(prev.narrationsUsed || []), event.id];
}
```

### 1.5 十个品类专属事件定义

#### 1) OPENWORLD - 范围蔓延 (minWeek: 9)

| 字段 | 值 |
|------|------|
| id | dir_openworld_scope |
| name | 范围蔓延 |
| emoji | 🗺️ |
| color | #38bdf8 |
| tagline | 「12个区域，还是7个？」 |
| situation | 策划提交了一份区域清单： |
| dialogue | 清单上有12个区域，按优先级排列。前5个是核心区域，已经开工。后7个是"如果来得及"的区域——其中3个有独特的玩法设计，2个是风景打卡点，还有2个是"玩家会期待的"标准配置。程序组说：按现有速度，最多再做3个。 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 全部做，加人加班。 | progress:-5, budget:-15, qualityDebt:15 | quality:-1 | 三个月后，12个区域都有了。每个区域的深度，大约是你最初设计的三分之一。 |
| B | 砍到7个，保证每个区域有内容。 | progress:3, morale:-8, qualityDebt:3 | quality:+1 | 7个区域，每个都至少有2小时内容。策划在群里发了一张图：原本的12区地图，5个被划掉了。 |
| C | 核心5个做深，后7个做浅——开放世界本来就是看风景。 | progress:5, morale:3, qualityDebt:8 | judgment:-1 | 5个区域有深度，7个区域是空壳。上线后，有玩家发帖：「这个世界很大，但是空的。」 |

#### 2) BATTLE_ROYALE - 对手抢先 (minWeek: 6)

| 字段 | 值 |
|------|------|
| id | dir_br_rival |
| name | 对手抢先 |
| emoji | 🪂 |
| color | #f97316 |
| tagline | 「他们比我们早两周。」 |
| situation | 运营组发来一条消息： |
| dialogue | 「隔壁那家吃鸡今天上线了。我们看了一下，品质一般，但他们赶在前面了。用户评论第一条：又是吃鸡，又一个换皮。」你看了看自己的进度表。如果加速，两周内也能上。但那个版本……你还记得QA上周的报告。 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 加速赶工，两周内上线。 | progress:8, morale:-10, qualityDebt:12 | grit:-1 | 你赶上了。上线首日DAU还行，但第二天留存……你让运营不要把数据发到群里。 |
| B | 按节奏做，品质第一。 | morale:5, bossTrust:-1 | grit:+1 | 你多花了三周。上线时，市场上已经有四款吃鸡了。但你的评分是它们中最高的。没有人发朋友圈庆祝。 |
| C | 调整方向，避开正面竞争——我们做差异化玩法。 | progress:-5, morale:3, budget:-8 | judgment:-1 | 你花了两天开会，定了一个新的差异化方向。程序组说可以做，但之前的内容要砍掉40%。你在会议室里坐了很久。 |

#### 3) ANIME - 画师跳票 (minWeek: 5)

| 字段 | 值 |
|------|------|
| id | dir_anime_artist |
| name | 画师跳票 |
| emoji | 🎨 |
| color | #c084fc |
| tagline | 「我做不下去了。」 |
| situation | 主美术发来一条很长的消息： |
| dialogue | 「制作人，我想和你聊聊。最近两个月，我每天画到凌晨两点。改了七版角色设定，每一版你都说'差点意思'。我不确定你想要的到底是什么。我接到了另一家的offer，对方说不用改七版。我尊重这个项目，但我做不下去了。」 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 加薪留人，你是核心资产。 | budget:-12, morale:5, progress:-3 | people:-1 | 她留下来了。但加薪的消息在团队里传开了。你知道有人也在想：我是不是也该谈谈待遇。 |
| B | 放手。尊重她的选择，快速换人。 | morale:-5, progress:-5, qualityDebt:5 | people:+1 | 她走了。新画手两周后到岗，但画风有差异，之前完成的素材要返工。你把她的工位清空时，发现抽屉里有一张画了一半的角色稿。 |
| C | 你来定稿，减少改版次数。我们重新对齐审美。 | progress:-2, qualityDebt:8, morale:3 | quality:-1 | 你花了一下午和她对齐。她点点头，说'早该这样'。但你心里知道，你为了赶进度，把好几处本该再打磨的地方放过了。 |

#### 4) SLG - 鲸鱼流失 (minWeek: 10)

| 字段 | 值 |
|------|------|
| id | dir_slg_whale |
| name | 鲸鱼流失 |
| emoji | 🐋 |
| color | #0ea5e9 |
| tagline | 「他上个月没充值。」 |
| situation | 运营总监发来一封紧急邮件： |
| dialogue | 「我们头部的3个大R，已经连续两个月没有付费了。我查了一下，他们在其他SLG里活跃。不是游戏有问题——是竞品出了新的赛季机制，拉走了核心用户。如果我们不做什么，这个月的流水会跌30%。」 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 给大R开专属福利，把他们拉回来。 | budget:-10, morale:-5, bossTrust:1 | people:-1 | 他们回来了。但你给他们的特权，普通玩家在论坛上看到了。有人说：这游戏是有钱人的游戏。 |
| B | 查问题根源，修竞品对标的功能。 | progress:-5, budget:-8, qualityDebt:-5 | people:+1 | 你让策划和运营一起分析了三天。结论很简单：不是功能问题，是长线内容不够。修了一个月，大R回来了一半。另一半不会再回来了。 |
| C | 开发新的付费点，不依赖头部大R。 | progress:-3, qualityDebt:10, budget:5 | honesty:-1 | 新的付费设计上线了。中小R的付费提升了，但大R觉得被忽视了。你在运营数据里看到了一条趋势线，方向不太好。 |

#### 5) AI_NATIVE - 内容审核 (minWeek: 6)

| 字段 | 值 |
|------|------|
| id | dir_ai_audit |
| name | 内容审核 |
| emoji | 🤖 |
| color | #2dd4bf |
| tagline | 「AI说的这句话，你看了吗？」 |
| situation | QA在测试环境截了一张图发到群里： |
| dialogue | AI NPC在对话中生成了一段涉及敏感历史的内容。QA标了红色。你看了那段对话。AI的上下文理解没有问题，但它组合出来的表述，在人看来是有问题的。法务说：这条如果上线，可能被举报。技术说：这是大模型的不确定性，不可能100%拦截。 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 删了这条，如实上报，暂停AI对话上线。 | progress:-5, bossTrust:1, morale:-3 | judgment:+1 | 你按了暂停。老板知道了，但他同意你的判断。团队有点泄气——这是你们的核心卖点。 |
| B | 删了这条，不上报。我们加一道关键词过滤就行。 | progress:0, qualityDebt:5, morale:3 | judgment:-1, honesty:-1 | 过滤加上了。你和QA说这件事不要外传。第二天你看到QA的工位空了一半时间——他在投简历。 |
| C | 保留AI对话，加人工审核流程。每条上线前过一遍。 | progress:-3, budget:-10, qualityDebt:-3 | judgment:+1 | 人工审核上线了。成本高了，速度慢了，但内容干净了。运营说：你们能不能再快一点？ |

#### 6) ROMANCE - 围攻 (minWeek: 8)

| 字段 | 值 |
|------|------|
| id | dir_romance_review |
| name | 围攻 |
| emoji | 💐 |
| color | #f472b6 |
| tagline | 「这不是给你们的。」 |
| situation | 社区运营发来一张截图，表情很为难： |
| dialogue | 游戏社区被一波男性玩家涌入了。他们在每个帖子下面刷差评，理由是"这游戏排挤男性玩家"。你看了几条。有些是恶意刷评，有些是真的不理解为什么这个游戏不是为他们做的。运营问：要不要处理？ |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 删评控评，维护社区氛围。 | morale:5, budget:-5, qualityDebt:5 | judgment:-1 | 社区安静了。但截图在外部平台传开了，标题是"这游戏容不下异见"。你不知道哪个更伤。 |
| B | 发声明，明确方向——这个游戏就是为女性玩家做的。 | morale:-5, bossTrust:1 | grit:+1 | 声明发了。女用户群里有人发了一串感叹号。男用户群里有人骂你。老板看了声明，沉默了一下，说：你确定？你说确定。 |
| C | 悄悄调整内容，加一些男性向角色安抚。 | progress:-3, morale:3, qualityDebt:5 | people:-1 | 你让策划加了两个男性视角角色。男玩家没那么吵了。但核心女用户群里，有人问：为什么新角色画风变了？ |

#### 7) IDLE - 外挂泛滥 (minWeek: 10)

| 字段 | 值 |
|------|------|
| id | dir_idle_cheat |
| name | 外挂泛滥 |
| emoji | ⏸️ |
| color | #94a3b8 |
| tagline | 「论坛上有人卖脚本了。」 |
| situation | 运营截了一个论坛帖子发给你： |
| dialogue | 有人做了一个挂机脚本，功能比你们游戏内置的挂机还强——自动刷本、自动合成分解、自动推图。论坛置顶帖，售价9块9。你算了一下：如果20%的用户用外挂，排行榜会失真，付费用户会流失。但封号又会得罪人。 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 紧急修封，下个版本封堵外挂。 | progress:-3, budget:-8, qualityDebt:-3 | quality:+1 | 封堵上线了。外挂作者发了新帖：已更新，绕过检测。你让程序再改，他说这是猫鼠游戏，没有终点。 |
| B | 先忍着，看看数据再决定。 | morale:-3, bossTrust:-1 | honesty:-1 | 一个月后，排行榜前十有七个是外挂用户。付费用户在论坛发帖：这游戏有外挂，谁还充钱？ |
| C | 把外挂的功能做进游戏，官方挂机加强版。 | progress:3, morale:5, qualityDebt:8 | judgment:-1 | 你做了。外挂用户转成了官方用户。但付费用户问：我之前花钱买的东西，现在免费送了？ |

#### 8) MINI_GAME - 合规审核 (minWeek: 7)

| 字段 | 值 |
|------|------|
| id | dir_mini_compliance |
| name | 合规审核 |
| emoji | 🎰 |
| color | #fbbf24 |
| tagline | 「3处内容需要修改，否则下架。」 |
| situation | 平台方发来一份审核通知： |
| dialogue | 「经审核，贵方游戏存在以下问题：1. 第3关奖励机制涉嫌诱导分享 2. 角色立绘衣着不符合规范 3. 付费流程未做防沉迷提示。请于7个工作日内完成修改，否则将做下架处理。」法务看了一眼，说：第1条和第3条是实打实违规，第2条……看你怎么理解"不符合规范"。 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 3处全改，合规第一。 | progress:-5, morale:-3, bossTrust:1 | honesty:+1 | 改完了。平台审核通过了。你在团队群里说：以后合规检查提前做。没有人回复。 |
| B | 只改第1和第3条，第2条打擦边球。 | progress:-2, morale:3, qualityDebt:5 | honesty:-1 | 你改了两处，第三处做了微调。审核员看了三分钟，通过了。你知道他在忙，没仔细看。 |
| C | 找关系通融一下，看看能不能不改。 | budget:-10, bossTrust:-1, morale:3 | honesty:-1 | 你找了一个中间人。对方说可以缓一缓，但不是不改。你花了一笔钱，买了一个月时间。最后还是改了。 |

#### 9) LEGACY - 情怀透支 (minWeek: 8)

| 字段 | 值 |
|------|------|
| id | dir_legacy_trust |
| name | 情怀透支 |
| emoji | 🧓 |
| color | #a78bfa |
| tagline | 「这还是那个游戏吗？」 |
| situation | 社区里出现了一个高赞帖子： |
| dialogue | 标题是「玩了三个月，我想问：这还是当初承诺的那个游戏吗？」帖子里列了7项承诺没兑现的地方。评论里全是老玩家在说"对"、"我也是这么觉得的"、"情怀不够用了"。最上面一条评论："制作人一开始不是这么说的。" |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 倾听，把能改的都改了。 | progress:-5, morale:5, budget:-5, qualityDebt:-5 | people:+1 | 你花了两周改了4项。老玩家说"终于听了"。但进度掉了两周，你在日历上把deadline划掉又重写了一遍。 |
| B | 坚持当前方向，发布一封制作人信解释理念。 | morale:-8, bossTrust:1 | people:-1, grit:+1 | 信发了。有人理解了，有人骂你在画饼。那个高赞帖子的楼主回了一句："我等你的下一封信。" |
| C | 用情怀营销安抚——发老版本截图、做周年活动。 | morale:3, progress:0, qualityDebt:5 | people:-1, honesty:-1 | 活动做了。老玩家回来了两天，然后又走了。有人在活动帖下面写："你们还记得这个游戏最开始的样子吗？" |

#### 10) METAVERSE - 概念退潮 (minWeek: 7)

| 字段 | 值 |
|------|------|
| id | dir_metaverse_fade |
| name | 概念退潮 |
| emoji | 🕶️ |
| color | #6366f1 |
| tagline | 「元宇宙到底是什么？」 |
| situation | 投资人季度会议 |
| dialogue | PPT翻到第8页，你讲完了"元宇宙社交生态"的愿景。台下安静了三秒。然后一个投资人举手：「你说的这些，和去年所有人说的，有什么区别？」另一个补了一句：「说实话，我们今年已经把元宇宙的预算砍了70%。」你看着PPT上"沉浸式虚拟社交空间"几个字，突然觉得字变大了。 |

| 选项 | text | effects | hidden | result |
|------|------|---------|--------|--------|
| A | 「我们的方向不变。元宇宙不是概念，是基础设施。」 | bossTrust:-1, morale:5, qualityDebt:5 | honesty:-1 | 散会后，团队有人私下说："制作人是真的信，还是只能信？"你没有回答。 |
| B | 「我们调整方向，回归游戏本身。」 | bossTrust:+2, morale:-8, qualityDebt:-5 | judgment:+1 | 砍掉了虚拟地产和社交广场，剩下的核心玩法其实还不错。但团队三个月的心血白费了，没人庆祝。 |
| C | 「给我两个月，我拿数据证明。」 | progress:-3, morale:-3 | judgment:+1, grit:+1 | 两个月后，你拿着一张表回到会议室。数据不多，但每一行都是真的。投资人翻了两页，说："继续吧。"你不确定他是真的被说服了，还是只是不想再开一次会。 |

> Part B 已完成，见下方

---

## 二、Part B：背景职能×方向解锁

### 2.1 playerBackground 存储修复

当前开局选卡只修改了数值，未将身份标签存入 state。需在各背景卡的 init 函数中追加 playerBackground 字段：

```javascript
{ id: "bg_designer",  ..., init: s => ({ ...s, progressBonus: s.progressBonus + 1, playerBackground: "designer" }) }
{ id: "bg_engineer",  ..., init: s => ({ ...s, apBonusPerWeek: (s.apBonusPerWeek||0) + 1, playerBackground: "engineer" }) }
{ id: "bg_artist",    ..., init: s => ({ ...s, morale: Math.min(100, s.morale + 10), playerBackground: "artist" }) }
{ id: "bg_pm",        ..., init: s => ({ ...s, budget: Math.min(130, s.budget + 15), playerBackground: "pm" }) }
{ id: "bg_outsider",  ..., init: s => ({ ...s, budget: Math.min(130, s.budget + 20), morale: Math.max(10, s.morale - 10), playerBackground: "outsider" }) }
```

同时在 buildInitialState 和所有 resetState 中新增 `playerBackground: null` 字段。

### 2.2 UNLOCK_TABLE 常量

```javascript
const UNLOCK_TABLE = [
  {
    playerBackground: "designer",
    industryBackground: null,
    direction: "AUTO_CHESS",
    years: [2018],                 // 提前一年
    selectBonus: { matchThresholdDelta: -5 },
    inPoolBonus: { qualityDebtDelta: -5 },
    pitch: "这个玩法形态你在卡牌设计里隐约想到过。",
  },
  {
    playerBackground: "engineer",
    industryBackground: null,
    direction: "OPENWORLD",
    years: [2017, 2018, 2019],
    selectBonus: { matchThresholdDelta: -5 },
    inPoolBonus: { progressEfficiencyMultiplier: 1.1 },
    pitch: "别人说做不到，但你知道技术上是可行的。",
  },
  {
    playerBackground: "artist",
    industryBackground: null,
    direction: "ANIME",
    years: [2013, 2014, 2015],
    selectBonus: { qualityDebtAccumRate: 0.9 },
    inPoolBonus: { mockedMoralePenaltyMultiplier: 0.5 },
    pitch: "美术品质就是护城河，这个赛道你有感觉。",
  },
  {
    playerBackground: "pm",
    industryBackground: null,
    direction: "GLOBAL",
    years: [2019, 2020, 2021],
    selectBonus: { budgetCostMultiplier: 0.95 },
    inPoolBonus: { manageUpMultiplier: 1.2 },
    pitch: "跨地区协作你推过，出海的坑你比别人少踩。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "realestate",
    direction: "SLG",
    years: [2012, 2013, 2014, 2015, 2016],
    selectBonus: { budgetDelta: 10 },
    inPoolBonus: null,              // T3: 预算谈判额外选项，留后续patch
    pitch: "长线系统性运营——这个逻辑你在另一个行业做过。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "education",
    direction: "ROMANCE",
    years: [2015, 2016, 2017],
    selectBonus: { moraleDelta: 5 },
    inPoolBonus: { comfortMultiplier: 1.1 },
    pitch: "情感连接和内容驱动，你比游戏圈的人更懂用户。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "finance",
    direction: "MINI_GAME",
    years: [2022, 2023],
    selectBonus: { budgetPrecisionDisplay: true },
    inPoolBonus: null,              // T3: 预算精确显示，留后续patch
    pitch: "成本低、赔率高——这个结构你一眼算明白了。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "film",
    direction: "IP_PORT",
    years: [2012, 2013, 2014, 2015, 2016, 2017],
    selectBonus: { qualityDebtDelta: -10 },
    inPoolBonus: { qualityDebtDelta: -10 },
    pitch: "IP改编的大坑你在影视圈见过，你知道怎么绕。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "blockchain",
    direction: "METAVERSE",
    years: [2020, 2021],
    selectBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    inPoolBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    pitch: "这个概念你比所有人都先见过——至少你是这么认为的。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "blockchain",
    direction: "AI_NATIVE",
    years: [2024, 2025, 2026],
    selectBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    inPoolBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    pitch: "从链圈到AI，你擅长在风口里找钱。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "mcn",
    direction: "PARTY",
    years: [2021, 2022, 2023, 2024],
    selectBonus: { manageUpMultiplier: 1.2 },
    inPoolBonus: { bossInterveneMultiplier: 0.8 },
    pitch: "社交裂变和UGC，你在直播间天天干这个。",
  },
];
```

### 2.3 getBackgroundUnlock 函数

```javascript
function getBackgroundUnlock(playerBackground, industryBackground, marketYear) {
  if (!playerBackground) return [];
  return UNLOCK_TABLE.filter(rule => {
    if (rule.playerBackground !== playerBackground) return false;
    if (rule.industryBackground !== null && rule.industryBackground !== industryBackground) return false;
    if (!rule.years.includes(marketYear)) return false;
    return true;
  });
}
```

注意返回值为数组（区块链背景在 2020-2021 返回 METAVERSE 解锁，2024-2025 返回 AI_NATIVE 解锁，不会同时命中）。

### 2.4 buildDirectionPool 更新

替换现有 `buildDirectionPool` 函数：

```javascript
function buildDirectionPool(marketYear, playerBackground, industryBackground) {
  const year = YEAR_DATA[marketYear];
  if (year.special === "confused_year") return null;

  const hot = year.hot;
  const mocked = year.mocked;

  let basePool;
  if (hot.length <= 2) {
    basePool = [...hot, mocked].filter(Boolean);
  } else {
    const secondary = hot[1 + Math.floor(Math.random() * (hot.length - 1))];
    basePool = [hot[0], mocked, secondary];
  }

  const unlocks = getBackgroundUnlock(playerBackground, industryBackground, marketYear);

  if (unlocks.length === 0) {
    return basePool.map(d => ({ direction: d }));
  }

  let pool = basePool.map(d => ({ direction: d }));

  for (const unlock of unlocks) {
    const existingIdx = pool.findIndex(p => p.direction === unlock.direction);
    if (existingIdx >= 0) {
      // 已在池中：标记 backgroundBonus，不加槽位
      pool[existingIdx] = {
        ...pool[existingIdx],
        backgroundBonus: unlock.inPoolBonus || unlock.selectBonus,
        pitch: unlock.pitch,
        tag: "背景加成",
      };
    } else {
      // 不在池中：新增第4选项
      pool.push({
        direction: unlock.direction,
        backgroundBonus: unlock.selectBonus,
        pitch: unlock.pitch,
        tag: "背景加成",
      });
    }
  }

  return pool;
}
```

### 2.5 方向选择事件更新

方向选择事件（direction_select）的选项生成逻辑更新为：

```javascript
const pool = buildDirectionPool(s.marketYear, s.playerBackground, s.industryBackground);
const choices = pool.map(item => ({
  text: item.tag
    ? `${DIRECTIONS[item.direction].label} — ${item.pitch} [背景加成]`
    : `${DIRECTIONS[item.direction].label} — ${DIRECTIONS[item.direction].pitch}`,
  effects: {},
  direction: item.direction,
  backgroundBonus: item.backgroundBonus || null,
  result: `你决定走${DIRECTIONS[item.direction].label}路线。`,
}));
```

### 2.6 选后效果生效

在 handleChoice 中，当 direction_select/direction_forced/confused_year_strategy 事件被选择时：

```javascript
if (event?.id === "direction_select" || event?.id === "direction_forced" || event?.id === "confused_year_strategy") {
  const bonus = choice.backgroundBonus;
  let bonusEffects = {};
  if (bonus) {
    // T1: 一次性数值
    if (bonus.qualityDebtDelta) bonusEffects.qualityDebt = (bonus.qualityDebtDelta > 0 ? -1 : 1) * Math.abs(bonus.qualityDebtDelta);
    if (bonus.budgetDelta) bonusEffects.budget = bonus.budgetDelta;
    if (bonus.bossTrustDelta) bonusEffects.bossTrust = bonus.bossTrustDelta;
    if (bonus.moraleDelta) bonusEffects.morale = bonus.moraleDelta;

    // T2: 状态乘数 —— 存入 state.backgroundBonuses 供各计算点读取
    // (在下一段 2.7 中定义)
  }

  setState(prev => ({
    ...prev,
    gameDirection: choice.direction,
    directionChosen: true,
    morale: Math.max(0, Math.min(100, prev.morale + (choice.effects.morale || 0) + (bonusEffects.morale || 0))),
    budget: Math.max(0, Math.min(100, prev.budget + (choice.effects.budget || 0) + (bonusEffects.budget || 0))),
    bossTrust: Math.max(0, Math.min(10, prev.bossTrust + (choice.effects.bossTrust || 0) + (bonusEffects.bossTrust || 0))),
    qualityDebt: Math.max(0, Math.min(100, prev.qualityDebt + (choice.effects.qualityDebt || 0) + (bonusEffects.qualityDebt || 0))),
    backgroundBonuses: choice.backgroundBonus ? [choice.backgroundBonus] : [],
  }));
}
```

### 2.7 已在池中 bonus 在各计算点读取

state 新增 `backgroundBonuses` 数组字段（初始为 `[]`）。各计算点读取方式：

| bonus key | 读取位置 | 生效方式 |
|-----------|---------|---------|
| matchThresholdDelta | 结局门槛3 checkDirectionMatch | primary/secondary 的综合分阈值减去此值 |
| progressEfficiencyMultiplier | 冲进度行动进度产出 | 基础进度 × 此乘数 |
| qualityDebtAccumRate | qualityDebt 累加时 | qualityDebt增量 × 此乘数 |
| mockedMoralePenaltyMultiplier | getMockedEvent | 同行质疑事件的 morale 负面效果 × 此乘数 |
| budgetCostMultiplier | 每周预算消耗 + 行动预算消耗 | 消耗量 × 此乘数 |
| manageUpMultiplier | 月底 manageUp 效果 | manageUp 的 bossTrust增益 × 此乘数 |
| comfortMultiplier | getCrisisComfortEffect/getTeamComfortEffect | 回复效果 × 此乘数 |
| bossInterveneMultiplier | 老板干预事件触发概率 | 触发概率 × 此乘数 |
| budgetPrecisionDisplay | UI 层 | T3：本patch不实现 |
| qualityDebtDelta | 方向选择时一次性 | 直接加减 |
| budgetDelta | 方向选择时一次性 | 直接加减 |
| bossTrustDelta | 方向选择时一次性 | 直接加减 |
| moraleDelta | 方向选择时一次性 | 直接加减 |

辅助函数：

```javascript
function getBackgroundBonus(state, key) {
  if (!state.backgroundBonuses) return null;
  for (const bonus of state.backgroundBonuses) {
    if (bonus[key] !== undefined) return bonus[key];
  }
  return null;
}
```

### 2.8 特殊规则：解锁方向 = mocked 方向时

部分年份下，解锁方向恰好是当年被嘲笑的方向（例如程序出身在2019解锁OPENWORLD，而2019 mocked正是OPENWORLD）。

此时：
- 正常添加为第4选项，并标注「[背景加成]」
- 同行质疑事件照常触发
- **但 morale 惩罚减半**（通过 `mockedMoralePenaltyMultiplier: 0.5` 在 inPoolBonus 中生效）
- 结局判定仍走 mocked 路径，但逆势突围阈值从综合分0.7降为0.6

```javascript
// 在结局判定中
if (matchType === "mocked") {
  const hasBgBonus = getBackgroundBonus(prev, "matchThresholdDelta") !== null;
  const counterThreshold = hasBgBonus ? 0.6 : 0.7;
  if (composite >= counterThreshold) {
    gamePhase = "counter_win";
  } else {
    gamePhase = "bad_release";
  }
}
```

### 2.9 pickEvent 调用处更新

现有代码 `buildDirectionPool(s.marketYear, null, s.industryBackground)` 需更新为：

```javascript
const pool = buildDirectionPool(s.marketYear, s.playerBackground, s.industryBackground);
```

---

## 三、新增 state 字段

```javascript
playerBackground: null,        // "designer"|"engineer"|"artist"|"pm"|"outsider"|null
backgroundBonuses: [],         // 方向选择时存入的 bonus 对象数组
```

同时在 buildInitialState 和所有 resetState 中添加。

---

## 四、本 patch 不实现

- 每个方向第 2 个专属事件（标记 TODO）
- T3 级已在池中 bonus：预算谈判额外选项（地产+SLG）、预算精确显示（金融+MINI_GAME）
- 2026 年背景解锁（确认不生效——2026 无标准方向选择事件）
- 旧事件极化改造
- KPI 松紧权重接入
- TeamSlot 产出系数接入
- todo-unfinished.md 中其余未完成项

---

## 五、实现提示词

1. 在 CARD_GROUPS 第四组（"你上一份工作是……"）的 5 张卡 init 函数中追加 `playerBackground` 字段。在 buildInitialState 和所有 resetState 对象中新增 `playerBackground: null, backgroundBonuses: []`。

2. 在 EVENTS 常量之后新增 `DIRECTION_SPECIFIC_EVENTS` 数组，包含 10 个事件对象（见 1.5 节表格）。每个事件有 id/direction/minWeek/name/emoji/color/tagline/situation/dialogue/choices 字段，每个 choice 含 text/effects/hidden/result。

3. 在 pickEvent 函数中，通用事件池构建之后（约 line 1903 `return pool[...]` 之前），插入方向专属事件注入逻辑（见 1.2 节）。

4. 在 handleChoice 中新增 `event?.id?.startsWith('dir_')` 的判断分支，处理 hidden 字段隐性积分变化和 narrationsUsed 标记（见 1.4 节）。

5. 新增 `UNLOCK_TABLE` 常量和 `getBackgroundUnlock` 函数，替换现有空壳函数。新增 `getBackgroundBonus` 辅助函数。

6. 重写 `buildDirectionPool` 函数（见 2.4 节），更新 pickEvent 中的调用处传参（见 2.9 节）。

7. 更新方向选择事件的选项生成逻辑（见 2.5 节），处理 backgroundBonus 的选后生效（见 2.6 节）。

8. 在以下计算点插入 `getBackgroundBonus` 读取：
   - 结局门槛3（matchThresholdDelta + mocked 逆势阈值）
   - 冲进度行动（progressEfficiencyMultiplier）
   - qualityDebt 累加（qualityDebtAccumRate）
   - getMockedEvent（mockedMoralePenaltyMultiplier）
   - 预算消耗（budgetCostMultiplier）
   - manageUp 效果（manageUpMultiplier）
   - 关怀行动（comfortMultiplier）
   - 老板干预触发（bossInterveneMultiplier）

9. 更新 `content-writing.md` 第四节的状态列，将 10 个方向标记为 DONE。

**验证点：**
- [ ] 策划出身 + 2018年 → 方向池出现 AUTO_CHESS 第4选项
- [ ] 程序出身 + 2019年 → OPENWORLD 已在池中，显示 [背景加成] 标签
- [ ] 程序出身 + 2019年 + 选了 OPENWORLD → 同行质疑 morale 惩罚减半，逆势阈值降为0.6
- [ ] 区块链 + 2021年 → METAVERSE 第4选项；区块链 + 2024年 → AI_NATIVE 第4选项
- [ ] OPENWORLD 方向锁定后 week9+ → 触发「范围蔓延」事件
- [ ] 方向专属事件触发后 → narrationsUsed 包含该事件 id，不会重复触发
- [ ] 方向专属事件选项的 hidden 字段 → 正确修改隐性积分
- [ ] 2026年 → buildDirectionPool 返回 null，背景解锁不生效
- [ ] 无背景选择时（playerBackground=null）→ 所有行为与 patch-19 一致，无回归


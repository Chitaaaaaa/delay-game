# Patch 18：年代×品类联动系统

在 Patch 10 的基础上扩展，完成完整的年代数据、品类枚举、选池规则和特殊年份处理。

---

## 一、品类枚举扩展

### 现有枚举（不变）
```
CASUAL / CARD / SLG / ARPG / MOBA / IDLE / OPENWORLD / ROMANCE / PARTY / AI_NATIVE
```

### 新增枚举
```javascript
const DIRECTIONS = {
  // 现有（保留）
  CASUAL:        "休闲轻度",
  CARD:          "传统卡牌",       // 数值卡牌、无差异化
  SLG:           "策略长线",
  ARPG:          "动作RPG",
  MOBA:          "竞技MOBA",
  IDLE:          "放置挂机",
  OPENWORLD:     "开放世界",
  ROMANCE:       "女性向养成",
  PARTY:         "派对社交",
  AI_NATIVE:     "AI原生",

  // 新增
  ANIME:         "二次元游戏",     // 阴阳师/FGO/LoveLive风，美术+IP+故事驱动
  BATTLE_ROYALE: "战术竞技",       // 吃鸡/大逃杀
  AUTO_CHESS:    "自走棋",         // 2019窗口期品类
  CHESS_CARD:    "棋牌",           // 斗地主/麻将/扑克
  IP_PORT:       "页游转手",       // 端/页游IP移植手游
  SIM:           "模拟经营",       // 江南百景图风
  METAVERSE:     "元宇宙",         // 2021概念品类
  GLOBAL:        "出海全球化",     // 面向海外市场的设计策略
  MINI_GAME:     "小游戏买量",     // 微信生态小游戏
  LEGACY:        "叔系老游戏",     // 面向30+男性的慢节奏/情怀游戏
  PC_MMO:        "重度端游移植",   // 把PC MMO搬上手机
};
```

---

## 二、YEAR_DATA 完整映射表

替换 Patch 10 的 YEAR_DATA，扩展为完整15年（移除2010）。

```javascript
const YEAR_DATA = {
  2012: {
    hot: ["IP_PORT", "CHESS_CARD"],
    mocked: "PC_MMO",
    catchphrase: "页转手是捷径，月入千万不是梦",
    representatives: ["忘仙手游", "世界OL"],
    mockedFlavor: "「你还在做老掉牙的端游？手机用户哪有耐心肝这个。」",
    specialEvents: ["chess_card_jqk"],   // 棋牌JQK翻译梗事件
  },
  2013: {
    hot: ["CARD", "CASUAL"],
    mocked: "SLG",
    catchphrase: "2013是卡牌年，无卡牌不手游",
    representatives: ["我叫MT", "大掌门"],
    mockedFlavor: "「SLG？太复杂了，手机用户不爱动脑子。」",
  },
  2014: {
    hot: ["ANIME", "SLG", "ARPG"],
    mocked: "MOBA",
    catchphrase: "年轻人做二次元，中年人做COK出海赚美金",
    representatives: ["LoveLive学园偶像祭", "列王的纷争"],
    mockedFlavor: "「手机玩MOBA是反人类，操作根本做不了。」",
  },
  2015: {
    hot: ["MOBA", "ARPG"],
    mocked: "CARD",
    catchphrase: "MOBA是下一个风口，2015是重度化元年",
    representatives: ["王者荣耀（公测）", "梦幻西游手游"],
    mockedFlavor: "「卡牌已经烂大街了，没前途。」",
  },
  2016: {
    hot: ["ANIME", "SLG", "MOBA"],
    mocked: "CARD",
    catchphrase: "美术即正义，非酋欧皇出圈",
    representatives: ["阴阳师", "率土之滨"],
    mockedFlavor: "「你的卡牌和阴阳师比……算了，不比了。没美术没剧情，必死。」",
  },
  2017: {
    hot: ["ROMANCE", "SLG", "BATTLE_ROYALE"],
    mocked: "CARD",
    catchphrase: "女性向是蓝海，SLG买量永动机",
    representatives: ["恋与制作人", "乱世王者"],
    mockedFlavor: "「二次元卡牌退烧了，你现在还做这个？」",
    hotWeights: [1.0, 1.0, 0.5],   // BATTLE_ROYALE本年为萌芽，权重低
  },
  2018: {
    hot: ["BATTLE_ROYALE", "ANIME", "IDLE"],
    mocked: "ARPG",
    catchphrase: "大吉大利今晚吃鸡，买量为王ROI至上",
    representatives: ["荒野行动", "刺激战场"],
    mockedFlavor: "「MMO已死，传统ARPG没人肝了。」",
  },
  2019: {
    hot: ["AUTO_CHESS", "IDLE", "CARD"],
    mocked: "OPENWORLD",
    catchphrase: "万物皆可自走棋，窗口期只有3个月",
    representatives: ["多多自走棋", "FGO（二次元基本盘）"],
    mockedFlavor: "「开放世界？成本高，手机带不动，赚不回来。」",
    specialEvents: ["auto_chess_window"],   // 窗口期倒计时事件
  },
  2020: {
    hot: ["OPENWORLD", "IDLE", "SIM"],
    mocked: "CASUAL",
    catchphrase: "原神定义3A手游，开放世界是入场券",
    representatives: ["原神（公测）", "江南百景图"],
    mockedFlavor: "「纯换皮买量？用户审美疲劳了，买量见顶了。」",
    specialEvents: ["capital_wave"],        // 资本浪潮事件
  },
  2021: {
    hot: ["ARPG", "OPENWORLD", "METAVERSE"],
    mocked: "CARD",
    catchphrase: "武侠吃鸡破圈，端手游联动是未来",
    representatives: ["永劫无间（PC端游）", "妄想山海"],
    mockedFlavor: "「没内容留不住人，老套卡牌没未来。」",
  },
  2022: {
    hot: ["SLG", "OPENWORLD", "GLOBAL"],
    mocked: "CARD",
    catchphrase: "动物SLG是蓝海，出海是唯一增量",
    representatives: ["小小蚁国", "原神（持续）"],
    mockedFlavor: "「现在三端互通都是大势所趋了，你还只做国内单端？」",
  },
  2023: {
    hot: ["AI_NATIVE", "PARTY", "OPENWORLD"],
    mocked: "SLG",
    catchphrase: "AI重构生产，UGC是第二曲线",
    representatives: ["逆水寒手游", "蛋仔派对"],
    mockedFlavor: "「UGC什么一看就是骗局，踏踏实实做个SLG……」对方笑了。",
  },
  2024: {
    hot: ["ANIME", "SLG", "MINI_GAME"],
    mocked: "CASUAL",
    catchphrase: "二游卷内容，SLG卷买量，小游戏卷ROI",
    representatives: ["绝区零", "三国：谋定天下", "永劫无间手游（陪跑）"],
    mockedFlavor: "「三端互通光是UI就搞不定，老实点做休闲手游，成本低。」对方不是嘲讽，是真心建议。",
  },
  2025: {
    hot: ["AI_NATIVE", "LEGACY"],
    mocked: "OPENWORLD",
    catchphrase: "AI即内容，内容即留存",
    representatives: ["崩坏：星穹铁道（长线）", "AI叙事类新游"],
    mockedFlavor: "「你还搁那开放世界呢？开放世界你做得完么？」",
  },
  2026: {
    hot: [],
    mocked: null,
    catchphrase: "AI不是功能，是底层",
    representatives: ["AI驱动叙事社交", "空间交互手游"],
    special: "confused_year",   // 特殊年：无方向选择，改为策略应对事件
  },
};
```

---

## 三、选池规则

```javascript
function buildDirectionPool(marketYear) {
  const year = YEAR_DATA[marketYear];

  // 2026特殊年单独处理
  if (year.special === "confused_year") return null;

  const hot = year.hot;      // ["DIR_A", "DIR_B", "DIR_C"] 或更少
  const mocked = year.mocked;

  // hot[0]必出，mocked必出
  // 若只有hot[0]+hot[1]（无hot[2]），pool = [hot[0], hot[1], mocked]
  // 若有hot[0]+hot[1]+hot[2]，pool = [hot[0], mocked, random(hot[1] or hot[2])]
  
  if (hot.length <= 2) {
    return [...hot, mocked].filter(Boolean);
  } else {
    const secondary = hot[1 + Math.floor(Math.random() * (hot.length - 1))];
    return [hot[0], mocked, secondary];
  }
}
```

---

## 四、方向选择事件（替换Patch 10版本）

**触发时机**：月1 week2（不变）

**UI变更**：每个方向选项显示：
- 方向名称
- 一句当年的 pitch flavor（见下方各年文案，本patch占位，内容填充时替换）
- 效果预览：无即时数值效果，只做标记

**选定后**：`gameDirection` 锁定，`directionChosen = true`

---

## 五、方向匹配逻辑（更新Patch 09门槛3）

```javascript
function checkDirectionMatch(gameDirection, marketYear) {
  const { hot, mocked } = YEAR_DATA[marketYear];

  if (gameDirection === hot[0]) return "primary";      // 主热门，完全匹配
  if (hot.slice(1).includes(gameDirection)) return "secondary";  // 次热门，部分匹配
  if (gameDirection === mocked) return "mocked";       // 被嘲笑方向
  return "neutral";                                    // 中性，无加成无惩罚
}
```

**结局门槛影响**（替换Patch 09门槛3逻辑）：
```
primary   → 进入门槛4（综合分判断），阈值45
secondary → 进入门槛4，阈值降为35（容错）
neutral   → 进入门槛4，阈值45（无加成）
mocked    → 触发「叫好不叫座」结局（不进门槛4）
            例外：若综合分 >= 70，即使mocked也给「逆势突围」结局变体文案
            文案：「所有人都说这个方向没有未来。
                   你没有辩解，只是做完了。
                   上线那天，你翻出了当时那个沙龙的聊天记录，没有回复任何人。
                   数据会说话。」
```

---

## 六、同行质疑事件（更新Patch 10版本）

**触发条件**：月2-3，`gameDirection === YEAR_DATA[marketYear].mocked` 时触发，每局最多一次。

**事件结构**（动态生成）：
```javascript
function getMockedEvent(marketYear) {
  const flavor = YEAR_DATA[marketYear].mockedFlavor;
  return {
    id: "peer_mockery",
    name: "同行质疑",
    emoji: "👀",
    color: "#64748b",
    tagline: "「你确定要做这个方向？」",
    situation: "行业沙龙上，有人认出了你做的方向：",
    dialogue: flavor,
    choices: [
      { text: "我们做的不一样。", effects: { morale: 3, bossTrust: 0 },
        result: "他点点头，没再说什么。你知道他不信。" },
      { text: "微笑，换话题。", effects: { morale: 0, bossTrust: 0 },
        result: "你们换了个话题。那句话留在空气里。" },
      { text: "「你说得对，我们在重新评估。」", effects: { morale: -5, bossTrust: 1 },
        result: "他满意地点头。你的老板后来不知从哪听说了这件事，觉得你很务实。" },
    ],
  };
}
```

---

## 七、特殊年份事件

### 2026：行业迷茫年（替换方向选择事件）

月1 week2，不触发方向选择，改为触发专属事件：

```
name: "你要做什么？"
emoji: "🌫️"
tagline: "「这一年，没有人知道答案。」"
situation: "立项会上，老板问了你一个问题："
dialogue: "「你觉得我们应该做什么方向？」
          会议室安静了。
          前几年的风口一个接一个地凉了，资本开始退潮，行业里雷声不断。
          没有人知道下一个风口在哪里——甚至没有人确定还有没有风口。
          你看着白板，上面写着三个选项。"

选项A：「跟上AI，这是唯一确定的方向。」
  gameDirection = AI_NATIVE
  effects: { morale: -3 }
  result: "团队沉默了一下。有人在记事本上写了'AI'，然后划掉了，然后又写上。"

选项B：「先活下去，做能卖出去的东西。」
  gameDirection = LEGACY
  effects: { budget: 5 }
  result: "这是最保守的答案。老板点了点头，没有表现出失望，也没有表现出期待。"

选项C：「我们找一个别人还没做的缝隙——成本低，赌出来就大赚。」
  gameDirection = MINI_GAME
  effects: { morale: 5, bossTrust: -1 }
  result: "他抬头看了你一眼。「小游戏？」他顿了一下，「……行，你来负责。」投资方那边，你知道他们现在更喜欢这个。"
```

2026年无「叫好不叫座」结局判定，方向匹配逻辑跳过门槛3，直接进门槛4。

### 2020：资本浪潮事件

月2-4之间随机触发一次，不绑定方向：

```
name: "资本来了"
emoji: "💰"
tagline: "「只要利润率比银行存款高，他们就愿意投。」"
situation: "你接到了一个陌生电话："
dialogue: "对方自报家门，是某投资机构的合伙人。
          「我们最近在看游戏赛道。你们项目……有没有融资计划？
          只要你告诉我，你提供的利润率比银行存款利率高，我们就可以谈。」
          你看了一眼手里的预算表。"
choices:
  A: 「我们对融资开放，欢迎深入了解。」
     effects: { budget: 20, bossTrust: 1 }
     result: "他很满意。钱进来了。你隐约觉得这笔钱有点烫手。"
     scheduledEvent: { week: +8, id: "capital_pressure" }  // 资本施压后续事件

  B: 「我们暂时不考虑外部融资。」
     effects: { morale: 3 }
     result: "他说了声好，挂了电话。你不知道这个决定对不对。"

  C: 「能不能先了解一下你们的诉求？」
     effects: { budget: 10, bossTrust: 0 }
     result: "谈了两个小时。你拿到了钱，但也多了一个需要汇报的人。"
     scheduledEvent: { week: +6, id: "capital_pressure" }
```

### 2012：棋牌JQK事件

月1-2之间，若 `gameDirection === "CHESS_CARD"` 时触发：

```
name: "翻译问题"
emoji: "🃏"
tagline: "「J应该叫什么？」"
situation: "本地化团队发来了一个紧急问题："
dialogue: "「我们的棋牌游戏要上线，但扑克牌的JQK怎么翻译成中文？
          J叫'武士'？'骑士'？还是就叫'J'？
          Q叫'皇后'还是'女王'？K叫'国王'还是'老K'？
          用户研究显示，35岁以上用户认'老K'，18-25岁用户认'K'……
          这是个紧急问题，今晚要定。」"
choices:
  A: 「J/Q/K，国际化，年轻用户优先。」
     effects: { morale: 3 }
     result: "上线后，有用户投诉说'不中国'。有用户说'终于正常了'。各占一半。"

  B: 「武士/皇后/国王，本土化。」
     effects: { progress: -1 }
     result: "改文案花了一天。上线后没人提这件事。"

  C: 「这不是紧急问题，维持原样先上。」
     effects: { qualityDebt: 5 }
     result: "维持了J/Q/K英文。第一个差评是关于这个的。"
```

### 2020：资本施压后续事件（capital_pressure）

由 2020 资本浪潮事件选A或选C后，追加到 scheduledEvents，6-8周后触发：

```
name: "资本来问账了"
emoji: "📊"
tagline: "「DAU多少？留存怎么样？」"
situation: "投资方合伙人发来一条消息，语气和第一次打电话时完全不同："
dialogue: "「你们上个月的数据我看了。
          DAU没达到我们投前聊的预期。
          留存率……我们需要见一面。
          对了，我有几个建议，你们的方向可能需要调整一下。」
          你看着消息，想起他第一次打电话时的语气。"
choices:
  A: 「好，我们来聊。」
     effects: { bossTrust: -1, morale: -5 }
     result: "见面谈了两个小时。他的「建议」其实是要求。你带着一页修改意见回到公司，
             不知道怎么跟团队说。"
     scheduledEvent: { week: +4, id: "capital_direction_change" }

  B: 「数据我来解释，方向我们不会改。」
     effects: { bossTrust: 1, morale: 3, budget: -10 }
     result: "他沉默了很久。「好，你来负责。」
             你知道这句话的意思——如果后面数据还不行，这是你签字的。"

  C: 「我们需要更多时间，数据还在爬坡。」
     effects: { morale: -3 }
     result: "他接受了。这个月。
             你在日历上标了下次汇报的日期，感觉像是在倒计时。"
     scheduledEvent: { week: +3, id: "capital_pressure" }   // 下次继续催
```

**capital_direction_change 事件**（capital_pressure选A后+4周触发）：
```
situation: "投资方发来了修改后的「建议清单」，格式化成了一份PPT："
dialogue: "第3页：「建议增加付费点设计，参考XX游戏」
          第7页：「建议优化变现路径，DAU转化率目标提升至X%」
          第12页：「建议评估方向调整可行性，当前赛道竞争过于激烈」
          最后一页写着：「以上建议请于两周内给出书面回复。」"
choices:
  A: 「部分接受，付费点我们可以优化。」
     effects: { qualityDebt: 10, budget: 8 }
     result: "你把第3页的意见转给了策划组。他们没有说什么，开始改需求文档。"

  B: 「全部拒绝，按我们的节奏来。」
     effects: { bossTrust: -2, morale: 8 }
     result: "你发了一封非常礼貌的拒绝邮件。团队知道了，有人私下找你说了声谢谢。
             你不知道这件事会有什么后果。"

  C: 「开个会，让团队自己决定接受哪些。」
     effects: { morale: -5, progress: -3 }
     result: "会开了三个小时。最后达成的共识是：什么都没定。但大家都有点累。"
```

### 2019：自走棋窗口期事件

月3触发，若 `gameDirection === "AUTO_CHESS"`：

```
name: "窗口期"
emoji: "⏳"  
tagline: "「只有三个月。」"
situation: "老朋友发来消息："
dialogue: "「自走棋这个品类，我认识的几个团队都在做。
          有人说窗口期只有三个月——做出来就是钱，做不出来就什么都没了。
          你们现在进度怎么样？」
          你看了一眼进度条。"
choices:
  A: 「全力冲刺，窗口期内上线。」
     effects: { progress: 10, morale: -12, qualityDebt: 15 }
     result: "上线了。质量粗糙，但赶上了窗口。"

  B: 「按计划做，质量第一。」
     effects: { morale: 5 }
     result: "你没有改变节奏。三个月后，市场上已经有七款自走棋。"

  C: 「重新评估，窗口期可能已经关了。」
     effects: { progress: -5, bossTrust: 1 }
     result: "你跟老板说了你的判断。他沉默了一会儿，说：'你觉得我们还要继续吗？'"
```

---

## 八、背景职能×方向选择解锁

### 机制说明

方向选择事件默认显示3个选项（hot[0] + mocked + 随机次热门）。
若玩家背景命中解锁条件，**新增第4个选项**，显示在最后，带有小标签「[背景加成]」。

若解锁方向恰好已在默认3个选项中，**不新增槽位**，改为给该方向附加背景bonus文案和小奖励。

2026特殊年不适用此规则（该年无标准方向选择事件）。

---

### 解锁表

| 背景 | 解锁方向 | 生效年份 | 已在池中时 | 选后效果 | 选项pitch文案 |
|------|---------|---------|-----------|---------|-------------|
| 策划出身 | AUTO_CHESS | 2018（提前一年） | 2019已在池 → qualityDebt-5 | matching阈值-5（设计出身更有把握） | 「这个玩法形态你在卡牌设计里隐约想到过。」 |
| 程序出身 | OPENWORLD | 2017-2019 | 2020+已在 → 冲进度效率+10% | matching阈值-5（技术上知道能做到） | 「别人说做不到，但你知道技术上是可行的。」 |
| 美术出身 | ANIME | 2013-2015 | 2016+已在 → 同行质疑morale惩罚减半 | qualityDebt积累速度×0.9 | 「美术品质就是护城河，这个赛道你有感觉。」 |
| PM出身 | GLOBAL | 2019-2021 | 2022+已在 → 向上管理效果×1.2 | budget消耗-5%（流程管理减少浪费） | 「跨地区协作你推过，出海的坑你比别人少踩。」 |
| 跨行业-地产 | SLG | 2012-2016 | 已在 → 预算谈判类事件额外选项（接Patch 15 TODO） | budget+10（甲方谈判经验） | 「长线系统性运营——这个逻辑你在另一个行业做过。」 |
| 跨行业-教培 | ROMANCE | 2015-2017 | 已在 → 关怀行动效果额外×1.1（叠加Patch 15的×1.3） | morale初始+5 | 「情感连接和内容驱动，你比游戏圈的人更懂用户。」 |
| 跨行业-金融 | MINI_GAME | 2022-2023 | 2024已在 → 预算数字精确显示（接Patch 15已有） | budget消耗精确显示，ROI可见 | 「成本低、赔率高——这个结构你一眼算明白了。」 |
| 跨行业-影视 | IP_PORT | 2012-2017 | 已在 → qualityDebt-10（了解IP改编的坑） | qualityDebt-10（见过烂IP改编怎么死的） | 「IP改编的大坑你在影视圈见过，你知道怎么绕。」 |
| 跨行业-区块链 | METAVERSE | 2020-2021 | 已在 → budget+10，bossTrust+1 | bossTrust+1（老板觉得你懂概念） | 「这个概念你比所有人都先见过——至少你是这么认为的。」 |
| 跨行业-区块链 | AI_NATIVE | 2024-2026 | 已在 → 同上 | 同上 | 「从链圈到AI，你擅长在风口里找钱。」 |
| 跨行业-MCN | PARTY | 2021-2024 | 已在 → 老板干预事件频率×0.8 | 向上管理效果额外×1.2（懂流量=懂老板要什么） | 「社交裂变和UGC，你在直播间天天干这个。」 |

---

### 特殊规则：解锁方向 = mocked方向时

部分年份下，解锁方向恰好是当年被嘲笑的方向（例如程序出身在2019解锁OPENWORLD，而2019 mocked正是OPENWORLD）。

此时：
- 正常添加为第4选项，并标注「[背景加成]」
- 同行质疑事件照常触发
- **但morale惩罚减半**（你有技术底气，不那么在意旁人看法）
- 结局判定仍走mocked路径，但逆势突围阈值从综合分70降为60

---

### buildDirectionPool 更新

```javascript
function buildDirectionPool(marketYear, playerBackground, industryBackground) {
  const base = buildBasePool(marketYear);  // 原有3选项逻辑
  const unlock = getBackgroundUnlock(playerBackground, industryBackground, marketYear);

  if (!unlock) return base;

  // 已在基础池中：不加槽位，标记bonus
  if (base.includes(unlock.direction)) {
    return base.map(d => d === unlock.direction
      ? { direction: d, backgroundBonus: unlock.bonus, pitch: unlock.pitch }
      : { direction: d }
    );
  }

  // 不在池中：加为第4选项
  return [
    ...base.map(d => ({ direction: d })),
    { direction: unlock.direction, backgroundBonus: unlock.bonus,
      pitch: unlock.pitch, tag: "背景加成" }
  ];
}
```

---

## 九、接入说明

- **替换** Patch 10 的 `YEAR_DATA` 和 `DIRECTION` 枚举
- **更新** 方向选择事件的选项生成逻辑（使用新 `buildDirectionPool`）
- **更新** Patch 09 门槛3的 `checkDirectionMatch` 逻辑
- **更新** 同行质疑事件使用新的 `getMockedEvent` 动态生成
- **新增** 2026特殊事件、2020资本浪潮、2012棋牌JQK、2019窗口期四个年代专属事件
- 背景职能解锁：占位字段，内容填充阶段接入

---

## 十、本patch暂不实现

- 各方向的专属事件池（品类差异化事件）
- 背景职能×年份解锁的具体选项内容
- 年代旁白文案的完整填充（12个待补年份）

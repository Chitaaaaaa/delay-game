# Patch 34：NPC 人格系统框架

> 前置：Patch 01-33 已完成
> 目标：建立8个常驻人格角色的系统框架——随机命名、关系值、出现频率、
>       品类/规模激活条件。事件内容层（每个人说什么）在后续 patch 补充。

---

## 一、设计原则

- 每局游戏随机生成一批角色，人格类型固定，名字随机
- 角色有独立关系值，关系值影响出现频率和事件结果
- 动机对玩家不透明：同一行为可能来自不同动机，玩家需自行判断
- 意外事件（灵机一动/救火等）由概率最高的在场角色「带来」

---

## 一·五、小厂开局卡牌限制

小厂规模下，以下开局卡牌不可选择：

| 卡牌 | 卡牌ID | 不可选原因 |
|------|--------|----------|
| 秽土转生 | `zombie` | 小厂没有能力接手带历史包袱的僵尸项目 |
| 混搭团队 | `mixed` | 小厂人员结构简单，不存在混搭化学反应的前提 |

**实现方式**：在 CARD_GROUPS 的「你接手的项目」和「你的团队」组中，为对应卡牌添加 `disabledIf` 条件：

```js
{ id: "zombie", ..., disabledIf: (pickedCards) => pickedCards.some(c => c?.id === "small") }
{ id: "mixed",  ..., disabledIf: (pickedCards) => pickedCards.some(c => c?.id === "small") }
```

禁用时卡牌显示为灰色不可点击状态，不影响其他卡牌选择。

---

## 二、新增 state 字段

```js
// 当局角色池（开局生成，全程不变）
characters: [
  {
    id: "char_001",
    name: "王磊",                    // 随机中文姓名
    type: "完美主义",                 // 人格类型（枚举）
    motivation: "利项目",             // 隐藏，玩家不可直接看到
    relationship: 0,                  // -3 ~ +3，初始 0
    active: true,                     // false = 已离场
    history: [],                      // 已发生的事件 id 列表
  },
  // ...
],

// directionClarity：方向感清晰度
directionClarity: 50,                 // 0~100，初始值见下文
```

---

## 三、人格类型枚举

```
常驻人格（8种）：
  幻想家 / 空中楼阁 / 完美主义 / 布道者 / 自由发挥 / 远见 / 铁头功 / 伞兵

意外事件类型（6种，不单独生成角色，由在场角色触发）：
  灵机一动 / 救火 / 减员 / 甩锅 / 屎山 / 雷公
```

---

## 四、开局角色生成

### 4.1 激活规则

根据 studioScale 过滤：

| 人格 | 小厂 | 中厂 | 大厂 |
|------|------|------|------|
| 幻想家 | ✓ | ✓ | ✓ |
| 完美主义 | ✓ | ✓ | ✓ |
| 布道者 | ✓ | ✓ | ✓ |
| 自由发挥 | ✓ | ✓ | ✓ |
| 远见 | 仅大体量品类 | ✓ | ✓ |
| 铁头功 | ✗ | ✓ | ✓ |
| 空中楼阁 | ✗ | ✓ | ✓ |
| 伞兵 | ✗ | ✓ | ✓ |

根据 gameDirection 过滤（品类不匹配则不激活）：

| 人格 | 仅在以下品类激活 |
|------|----------------|
| 远见 | OPENWORLD / ARPG / SLG / PC_MMO（大体量以上） |
| 自由发挥 | ARPG / SLG / CARD / OPENWORLD |
| 其余6个 | 全品类 |

### 4.2 名字生成

从预设中文姓名池随机抽取，每局不重复。姓名池另行定义（约50个）。

---

## 五、directionClarity 初始值

```js
function getInitialDirectionClarity(gameDirection, studioScale) {
  const tierBase = {
    small:  70,   // 小体量
    mid:    50,   // 中体量
    large:  35,   // 大体量
    xlarge: 20,   // 特大体量
  };
  const scalePenalty = { small: 0, mid: 5, large: 15 };
  const tier = getScaleTier(getProjectTeamSize(gameDirection, studioScale));
  return tierBase[tier] - scalePenalty[studioScale];
}
```

**示例：**
- CASUAL 小厂（小体量）：70 - 0 = 70
- CASUAL 大厂（中体量）：50 - 15 = 35
- ARPG 小厂（大体量）：35 - 0 = 35
- OPENWORLD 任意规模（特大体量）：20 - penalty

---

## 六、出现频率机制

每周 planning 阶段开始时，对每个 active 角色计算「本周出现权重」：

```js
function getAppearanceWeight(char, state) {
  let weight = 1.0;

  // 关系值影响
  weight += char.relationship * 0.3;   // 关系+3 → 权重×1.9；关系-3 → 权重×0.1

  // 人格触发条件（基础倾向）
  weight *= getPersonalityWeight(char.type, state);

  return Math.max(0.05, weight);       // 最低保留 5% 出现机会
}
```

### 6.1 各人格的基础倾向权重函数

```js
function getPersonalityWeight(type, state) {
  const tier = getScaleTier(state.projectHeadcount);
  switch(type) {
    case "完美主义":
      return state.qualityDebt >= 3 ? 2.0
           : state.qualityDebt >= 1 ? 1.3 : 0.8;

    case "幻想家":
      return (state.week <= 8 || state.directionClarity < 40) ? 1.8 : 0.9;

    case "远见":
      return (["xlarge","large"].includes(tier) && state.week <= 10) ? 1.8 : 0.5;

    case "布道者":
      return (state.morale < 50 || state.projectHeadcount > 10) ? 1.6 : 0.8;

    case "铁头功":
      return (state.teamSlots.length >= 4 || state.projectHeadcount > 15) ? 1.5 : 0.7;

    case "自由发挥":
      return 1.0;   // 品类已在激活阶段过滤，频率均等

    case "空中楼阁":
      return (state.budget < 40 || isMilestoneWeek(state.week)) ? 1.8 : 0.9;

    case "伞兵":
      return 0;     // 伞兵不通过权重系统出现，见第七节
  }
}
```

---

## 七、伞兵特殊机制

伞兵不参与普通出现频率计算，有独立触发逻辑：

```js
// 每周末检查
if (state.bossTrust < 3) {
  state.lowTrustStreak = (state.lowTrustStreak || 0) + 1;
} else {
  state.lowTrustStreak = 0;
}

// 入场：连续低信任达到阈值
const threshold = state.studioScale === "large" ? 2 : 3;
if (state.lowTrustStreak >= threshold && !isbingActivated(state)) {
  activateParatrooper(state);   // 触发伞兵入场事件
}

// 离场A（玩家赢）：bossTrust >= 7 持续 3 周
// 离场B（玩家输）：进入专属结局
```

新增 state 字段：`lowTrustStreak: 0`

---

## 八、关系值变化来源

| 事件 | 关系变化 |
|------|---------|
| 玩家在该角色事件中选择「对他有利」的选项 | +1 |
| 玩家选择「忽视/对抗」该角色 | -1 |
| 该角色带来的意外事件被玩家妥善处理 | +1 |
| 甩锅事件归咎于该角色 | -1 |
| 伞兵：玩家 bossTrust 下降时 | +1（他在坐收渔利）|

关系值范围：-3 ~ +3，不超界。

---

## 九、意外事件归因

意外事件发生时，从在场角色中按以下亲和性选出「责任人」：

| 意外类型 | 高亲和人格 |
|---------|-----------|
| 灵机一动 | 幻想家 > 远见 |
| 救火 | 空中楼阁（或由 Tom/老板直接通知，无角色） |
| 减员 | 任意在场角色（随机） |
| 甩锅 | 关系值最低的在场角色 |
| 屎山 | 完美主义 > 远见 |
| 雷公 | 无归因（纯外部事件，无责任人） |

---

## 十、不改的内容（本 patch 范围）

- 角色的具体事件文案（另出 patch）
- 伞兵的具体剧情弧线文案（另出 patch）
- 现有所有事件的触发逻辑（另出 patch 逐步迁移到角色系统）
- 名字池定义（另出 patch）

---

## 十一、验证点

- [ ] 开局根据 studioScale + gameDirection 正确生成角色池
- [ ] 小厂无铁头功、空中楼阁、伞兵
- [ ] 远见仅在大体量以上品类激活
- [ ] 自由发挥仅在 ARPG/SLG/CARD/OPENWORLD 激活
- [ ] directionClarity 初始值符合品类×厂商公式
- [ ] 关系值 +3 时角色出现权重明显高于关系值 -3
- [ ] bossTrust < 3 持续 N 周后伞兵入场（大厂 N=2，其余 N=3）
- [ ] 甩锅事件归咎于关系值最低的角色
- [ ] 雷公无归因角色

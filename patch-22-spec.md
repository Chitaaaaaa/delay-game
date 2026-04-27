# Patch 22：方向×团队规模系统

> 前置：Patch 01-21 已完成
> 核心设定：slot = 核心团队成员（组长/负责人），项目团队规模由方向决定

---

## 一、核心设定

### 1.1 两个团队

```
核心团队 = 你直接管的人（slot，上限 6 人）
项目团队 = 整个项目的人（由方向决定，玩家看得见数字）

制作人的管理对象是组长，不是每个写代码的人。
招一个"程序组长"，等于为 15 人的程序组找到了管理者。
缺一个组长，下面的人没人管。
```

### 1.2 UI 更新

现有：「团队 3/6」
改后：「核心团队 3/6 · 项目 -- 人」（方向未定时显示 --）

```jsx
<span>核心团队 {state.teamSlots.length}/6</span>
{state.gameDirection && DIRECTION_TEAM_SCALE[state.gameDirection] && (
  <span style={{ color: "#666", marginLeft: 8 }}>
    · 项目 {DIRECTION_TEAM_SCALE[state.gameDirection].projectTeamSize}人
  </span>
)}
```

---

## 二、DIRECTION_TEAM_SCALE 常量

```javascript
const DIRECTION_TEAM_SCALE = {
  MINI_GAME:     { projectTeamSize: 5,  budgetDrainMultiplier: 0.5,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  CASUAL:        { projectTeamSize: 8,  budgetDrainMultiplier: 0.6,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  IDLE:          { projectTeamSize: 8,  budgetDrainMultiplier: 0.6,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  CHESS_CARD:    { projectTeamSize: 6,  budgetDrainMultiplier: 0.5,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  ROMANCE:       { projectTeamSize: 12, budgetDrainMultiplier: 0.8,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  AUTO_CHESS:    { projectTeamSize: 15, budgetDrainMultiplier: 0.9,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  CARD:          { projectTeamSize: 15, budgetDrainMultiplier: 0.9,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  SIM:           { projectTeamSize: 18, budgetDrainMultiplier: 1.0,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  LEGACY:        { projectTeamSize: 18, budgetDrainMultiplier: 1.0,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  SLG:           { projectTeamSize: 25, budgetDrainMultiplier: 1.2,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  ANIME:         { projectTeamSize: 30, budgetDrainMultiplier: 1.3,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  PARTY:         { projectTeamSize: 25, budgetDrainMultiplier: 1.2,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  ARPG:          { projectTeamSize: 35, budgetDrainMultiplier: 1.4,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  GLOBAL:        { projectTeamSize: 40, budgetDrainMultiplier: 1.5,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  AI_NATIVE:     { projectTeamSize: 35, budgetDrainMultiplier: 1.4,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  METAVERSE:     { projectTeamSize: 45, budgetDrainMultiplier: 1.6,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  IP_PORT:       { projectTeamSize: 40, budgetDrainMultiplier: 1.5,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  BATTLE_ROYALE: { projectTeamSize: 50, budgetDrainMultiplier: 1.7,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  MOBA:          { projectTeamSize: 50, budgetDrainMultiplier: 1.7,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  OPENWORLD:     { projectTeamSize: 60, budgetDrainMultiplier: 1.8,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  PC_MMO:        { projectTeamSize: 55, budgetDrainMultiplier: 1.8,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
};
```

字段说明：
- `projectTeamSize`：项目团队总人数（叙事用，UI 显示）
- `budgetDrainMultiplier`：预算周消耗倍率（核心数值杠杆）
- `sweetSpot`：核心团队效率最高的人数
- `minViable`：低于此人手不足事件触发
- `overcrowd`：超过此人浮于事事件触发

---

## 三、getTeamProgressCoeff 更新

```javascript
function getTeamProgressCoeff(slots, gameDirection) {
  const count = slots.length;
  const profile = gameDirection ? DIRECTION_TEAM_SCALE[gameDirection] : null;

  if (!profile) {
    if (count >= 4) return 1.0;
    if (count === 3) return 0.85;
    if (count === 2) return 0.65;
    if (count === 1) return 0.4;
    return 0;
  }

  if (count === 0) return 0;
  if (count === profile.sweetSpot) return 1.0;

  if (count < profile.sweetSpot) {
    const gap = profile.sweetSpot - count;
    return Math.max(0.3, 1.0 - gap * 0.2);
  }

  if (count > profile.sweetSpot) {
    const excess = count - profile.sweetSpot;
    return Math.max(0.7, 1.0 - excess * 0.1);
  }

  return 1.0;
}
```

调用处更新：所有 `getTeamProgressCoeff(s.teamSlots)` 改为 `getTeamProgressCoeff(s.teamSlots, s.gameDirection)`。

---

## 四、预算消耗按方向缩放

在 handleChoice 的预算结算处，追加方向倍率：

```javascript
const directionDrainMult = prev.gameDirection
  ? (DIRECTION_TEAM_SCALE[prev.gameDirection]?.budgetDrainMultiplier || 1.0)
  : 1.0;
const weeklyDrain = Math.round(
  getWeeklyBudgetDrain(month) * getKpiBudgetMultiplier(prev.kpiState) * directionDrainMult
);
```

效果对比（月5-6，kpiState=normal）：

```
MINI_GAME:  -6 x 0.5  = -3/周
默认(无方向): -6 x 1.0  = -6/周
SLG:        -6 x 1.2  = -7/周
ANIME:      -6 x 1.3  = -8/周
OPENWORLD:  -6 x 1.8  = -11/周
```

---

## 五、方向专属团队事件

### 5.1 人手不足事件

触发条件：`teamSlots.length < minViable`，week>=5，每局最多一次，方向锁定后。

```javascript
function getTeamShortageEvent(direction, count, profile) {
  const size = profile.projectTeamSize;
  const need = profile.sweetSpot;
  return {
    id: "team_shortage",
    name: "人手不足",
    emoji: "👤",
    color: "#f97316",
    tagline: "有些职能根本没人管",
    situation: "你看着排期表，发现——",
    dialogue: `${size}人的项目，核心管理层只有${count}个人。\n有些职能直接没人管，下面的人不知道该听谁的。\n${count < need - 1 ? "现在不是效率问题，是有些事情根本没人做。" : "勉强能转，但每个人都在超负荷。"}`,
    choices: [
      {
        text: "赶工补上，核心团队顶上去。",
        effects: { progress: 3, morale: -8, qualityDebt: 10 },
        result: "你让每个人多管一摊。进度是动了，但粗糙得让人心虚。",
        hidden: { grit: 1 },
      },
      {
        text: "紧急招人，预算不是现在省的时候。",
        effects: { budget: -15, morale: 3 },
        result: "你批了招聘。人还没到，但团队知道你在解决问题。",
        hidden: { people: 1 },
      },
      {
        text: "调整目标，做少做精。",
        effects: { progress: -5, morale: 3, qualityDebt: -5 },
        result: "你砍了一些非核心需求。团队松了口气，但老板问你怎么进度慢了。",
        hidden: { judgment: 1 },
      },
    ],
  };
}
```

### 5.2 人浮于事事件

触发条件：`teamSlots.length > overcrowd`，week>=8，每局最多一次。

```javascript
function getTeamOvercrowdEvent(direction, count, profile) {
  const size = profile.projectTeamSize;
  return {
    id: "team_overcrowd",
    name: "人浮于事",
    emoji: "🪑",
    color: "#94a3b8",
    tagline: "有人在工位上刷手机",
    situation: "你路过办公区，注意到——",
    dialogue: `${count}个核心管理层，${size}人的项目。\n有些人在工位上刷手机。不是他们不努力，是不知道该干什么。\n指挥链太长了，决策比执行慢。`,
    choices: [
      {
        text: "精简团队，只留关键岗。",
        effects: { morale: -10, budget: 8 },
        result: "你裁了两个人。剩下的效率反而上来了，但没人说你好。",
        hidden: { people: -1, grit: 1 },
      },
      {
        text: "给闲置的人找事做——开拓新方向。",
        effects: { progress: 5, budget: -8, qualityDebt: 5 },
        result: "多了几个副项目。主进度快了点，但精力更分散了。",
        hidden: { judgment: -1 },
      },
      {
        text: "不管，让它自然消化。",
        effects: { morale: -3, budget: -5 },
        result: "多出来的人慢慢找到了位置。也可能没有。预算在烧。",
        hidden: {},
      },
    ],
  };
}
```

### 5.3 pickEvent 触发逻辑

在 pickEvent 中追加，放在方向专属事件注入（patch-20 的 DIRECTION_SPECIFIC_EVENTS）之后：

```javascript
if (s.gameDirection && s.directionChosen) {
  const profile = DIRECTION_TEAM_SCALE[s.gameDirection];
  if (profile && s.teamSlots.length < profile.minViable
      && s.week >= 5 && !s.narrationsUsed?.includes("team_shortage")) {
    return getTeamShortageEvent(s.gameDirection, s.teamSlots.length, profile);
  }
  if (profile && s.teamSlots.length > profile.overcrowd
      && s.week >= 8 && !s.narrationsUsed?.includes("team_overcrowd")) {
    return getTeamOvercrowdEvent(s.gameDirection, s.teamSlots.length, profile);
  }
}
```

### 5.4 handleChoice 处理

team_shortage 和 team_overcrowd 事件触发后，将 id 加入 narrationsUsed。hidden 处理沿用 patch-21 的通用逻辑。

---

## 六、招聘角色清理

### 6.1 移除 producer 和 other

现有招聘池：`['engineer', 'designer', 'qa', 'producer', 'other']`

改为：`['engineer', 'designer', 'qa']`

理由：你已经是制作人，不需要再招一个制作人；"其他"太模糊，核心团队每个 slot 都应该是明确职能的组长。

```javascript
// line 1770
const roles = ['engineer', 'designer', 'qa'];
```

### 6.2 开局团队角色替换

| 开局卡 | 现有配置 | 修改 |
|--------|---------|------|
| 老团队 v4 | role: 'producer' | 改为 role: 'qa' |
| 混搭 m3 | role: 'other' | 改为 role: 'qa' |

---

## 七、实现提示词

1. 新增 DIRECTION_TEAM_SCALE 常量（21 个方向），放在 DIRECTIONS 之后。

2. 更新 getTeamProgressCoeff：增加 gameDirection 参数，按 sweetSpot 计算效率系数。无方向时回退旧逻辑。更新所有调用处（handleChoice line 2503、危机安抚 line 256）。

3. handleChoice 预算结算处追加 directionDrainMultiplier：从 DIRECTION_TEAM_SCALE 读取，与 getWeeklyBudgetDrain 和 getKpiBudgetMultiplier 连乘。

4. UI：「团队 X/6」改为「核心团队 X/6 · 项目 N人」，项目人数从 DIRECTION_TEAM_SCALE 读取，方向未定时显示「--」。

5. 新增 getTeamShortageEvent 和 getTeamOvercrowdEvent。pickEvent 中追加触发逻辑。

6. 招聘角色池从 5 个改为 3 个：['engineer', 'designer', 'qa']。

7. 开局团队：v4 role 从 producer 改 qa；m3 role 从 other 改 qa。

**验证点：**
- [ ] OPENWORLD 方向锁定后，UI 显示「核心团队 3/6 · 项目 60人」
- [ ] MINI_GAME 方向锁定后，UI 显示「核心团队 2/6 · 项目 5人」
- [ ] 方向未定时，UI 显示「核心团队 X/6 · 项目 -- 人」
- [ ] OPENWORLD + 5人 → teamCoeff = 1.0；+2人 → teamCoeff = 0.4
- [ ] MINI_GAME + 2人 → teamCoeff = 1.0；+5人 → teamCoeff = 0.7
- [ ] OPENWORLD 月5-6 预算周消耗 = -11；MINI_GAME = -3
- [ ] OPENWORLD + 3人 + week>=5 → 触发「人手不足」
- [ ] MINI_GAME + 5人 + week>=8 → 触发「人浮于事」
- [ ] 招聘候选人不出现 producer 和 other
- [ ] 老团队开局无 producer

---

## 八、本 patch 不实现

- 初始预算按方向自动调整（OPENWORLD 起始预算应更高——待手感测试后决定）
- 方向锁定后的角色推荐提示（"这个方向建议多招策划"）
- 不同方向对特定角色的效率加成（ANIME+designer 更强）
- 事件零和重平衡（待讨论后单独 patch）

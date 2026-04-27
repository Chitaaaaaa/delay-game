# Patch 08 实现提示词：人员管理系统

## 任务说明

请阅读以下两个文件，按 spec 修改游戏代码：

- 游戏主文件：`delay-game.jsx`
- 功能规格：`patch-08-09-spec.md`（只实现 Patch 08 部分，Patch 09 qualityDebt 已完成）

假设 Patch 01–07、09–19 已全部完成。本 patch 补全 TeamSlot 系统的三个行动 UI + 逻辑，以及人头数→进度效率系数。

---

## 实现步骤

### 步骤一：确认 TeamMember 数据结构

确认 `buildInitialState` 中已有 `teamSlots: []`。若没有，新增：

```javascript
teamSlots: [],   // TeamMember[]，上限6人
```

TeamMember 对象结构：

```javascript
{
  id: string,                  // 唯一id，如 `member_${Date.now()}`
  role: 'engineer' | 'designer' | 'producer' | 'qa' | 'other',
  seniority: 'veteran' | 'mid' | 'fresh',
  source: 'initial' | 'campus' | 'social',
  contribution: {
    progressEfficiency: number,   // 影响进度行动产出
    moraleBase: number,           // 每周士气基线贡献
    budgetCoeff: number,          // 影响预算消耗系数
  },
  hiddenType: null,              // 占位字段，内容填充阶段接入
  joinedWeek: number,            // 加入时的周数，用于计算新人带人成本
}
```

---

### 步骤二：开局团队卡牌初始化

在开局卡牌选择结算时，根据团队卡牌选项初始化 `teamSlots`：

**老团队**（4人，全 veteran）：
```javascript
// 初始化4个veteran成员，morale += 15
// 每个成员：progressEfficiency: 1.0, moraleBase: 5, budgetCoeff: 1.0
```

**新团队**（2人，mid/fresh）：
```javascript
// 初始化2个成员（1 mid + 1 fresh），morale -= 15
// 前4周（week <= 4）推进进度行动的产出系数额外 ×0.7（磨合惩罚，新增state字段 newTeamPenaltyWeeks: 4）
// progressEfficiency: 0.7（mid）/ 0.5（fresh）
```

**混搭**（3人：2 veteran + 1 fresh）：
```javascript
// 初始化3个成员，随机决定化学反应：
const roll = Math.random();
if (roll < 0.60) { /* 无额外效果 */ }
else if (roll < 0.85) { /* 进度效率+10%：newTeamChemistryBonus: 1.1 */ }
else { /* morale -= 5 */ }
```

---

### 步骤三：Slot数量 → 推进进度行动效率系数

在「冲进度」行动的进度产出计算处，读取当前 teamSlots 长度：

```javascript
function getTeamSizeMultiplier(teamSize) {
  if (teamSize >= 4) return 1.0;
  if (teamSize === 3) return 0.85;
  if (teamSize === 2) return 0.65;
  if (teamSize === 1) return 0.4;
  return 0;  // 0人时行动不可用
}

const teamSize = state.teamSlots.length;
// 0人时「冲进度」按钮置灰/不可用
```

此系数与 Patch 19 的士气效率系数叠加：
```javascript
finalProgress = baseProgress
              × getMoraleEfficiency(state.morale)
              × getTeamSizeMultiplier(teamSize)
              × (state.newTeamChemistryBonus || 1.0);
```

---

### 步骤四：校招行动

**出现条件**：week <= 8（月1-2），planning 阶段可见；week > 8 后从行动列表消失。

**AP成本**：1

**流程**：

1. 玩家点击「校招」按钮，弹出候选人面板（modal 或内联展开）
2. 随机生成 1–2 名候选人，每个展示：
   - role（随机）
   - seniority = fresh（固定）
   - 2–3 个履历标签（从预设列表随机抽，如「算法竞赛银牌」「设计学院优等生」「实习经历丰富」等，纯显示用，暂无效果）
3. 玩家选「录用」或「跳过」
4. 录用后：
   - 将成员加入 `teamSlots`（上限6人，已满则校招按钮置灰）
   - `state.ap -= 1`
   - 新成员 `joinedWeek = state.week`，前6周 progressEfficiency ×0.5（带人成本，静默生效）

候选人生成函数：

```javascript
function generateCandidate(source) {
  const roles = ['engineer', 'designer', 'producer', 'qa', 'other'];
  const role = roles[Math.floor(Math.random() * roles.length)];
  return {
    id: `member_${Date.now()}_${Math.random()}`,
    role,
    seniority: source === 'campus' ? 'fresh' : (Math.random() < 0.5 ? 'mid' : 'veteran'),
    source,
    contribution: {
      progressEfficiency: source === 'campus' ? 0.6 : (Math.random() * 0.4 + 0.7),
      moraleBase: Math.random() * 3,
      budgetCoeff: 1.0,
    },
    hiddenType: null,
    joinedWeek: state.week,
  };
}
```

---

### 步骤五：社招行动

**出现条件**：全程 planning 阶段可用

**AP成本**：2

**预算消耗**：-15（在行动按钮上显示）

**流程**：同校招，但：
- seniority 为 mid 或 veteran
- 录用后有 30% 概率 `hiddenType = 'troublemaker'`（静默标记，当前无效果，内容填充阶段接入）
- 无带人成本（不需要 ×0.5 惩罚）

---

### 步骤六：清洗行动

#### 主动清洗（planning 阶段）

**AP成本**：2

**流程**：

1. 点击「清洗人员」按钮，弹出当前 teamSlots 列表
2. 每条显示：role / seniority / contribution 方向箭头（不显示数字）
   ```
   contribution 方向判断：
     progressEfficiency >= 0.9 → ↑ 进度
     progressEfficiency < 0.7  → ↓ 进度
     moraleBase >= 3            → ↑ 士气
   ```
3. 玩家选择目标成员，点击「确认清洗」
4. 执行清洗结算（见下）

#### 被动清洗（事件选项中触发）

- AP成本：0
- 士气额外 -5（公开冲突后遗症）
- 其余结算相同

#### 共用结算逻辑

```javascript
function resolveLayoff(memberId, isPassive = false) {
  state.teamSlots = state.teamSlots.filter(m => m.id !== memberId);
  state.bossTrust = Math.max(0, state.bossTrust - 1);
  state.morale = Math.max(0, state.morale - 10 - (isPassive ? 5 : 0));
  // people 维度扣分（Patch 19 隐性积分）
  state.people = Math.max(0, state.people - 2);
}
```

---

### 步骤七：新人带人成本

在「冲进度」行动产出计算时，对 `joinedWeek` 内6周的成员应用带人系数：

```javascript
// 计算有效团队进度效率（考虑新人带人成本）
function getEffectiveTeamEfficiency(teamSlots, currentWeek) {
  if (teamSlots.length === 0) return 0;
  const avgEfficiency = teamSlots.reduce((sum, m) => {
    const weeksSinceJoin = currentWeek - m.joinedWeek;
    const onboardingMultiplier = (m.source === 'campus' && weeksSinceJoin < 6) ? 0.5 : 1.0;
    return sum + m.contribution.progressEfficiency * onboardingMultiplier;
  }, 0) / teamSlots.length;
  return avgEfficiency;
}
```

---

## UI 规格

- 校招/社招：弹出候选人卡片，每张卡片显示 role + seniority + 履历标签 + 「录用」「跳过」按钮
- 清洗：弹出团队列表，每行显示 role + seniority + contribution 方向箭头 + 「清洗」按钮
- 团队状态：planning 阶段底部或侧边显示当前 teamSlots，格式：`[role] [seniority] [↑↓箭头]`
- teamSlots 满6人时，校招/社招按钮置灰并提示「团队已满」

---

## 不实现（本 patch）

- hiddenType 触发逻辑（内容填充阶段）
- troublemaker 事件池（内容填充阶段）
- TeamMember 的 budgetCoeff 对预算消耗的影响（内容填充阶段）
- moraleBase 的每周士气贡献（可选，实现较简单：每周结算时 `morale += sum(members.moraleBase)`）

---

## 验证点

- [ ] 开局选老团队 → 4个 veteran 进入 teamSlots，morale+15
- [ ] 开局选新团队 → 2人，morale-15，前4周推进进度产出明显偏低
- [ ] 月1-2 planning 显示「校招」按钮，月3起消失
- [ ] 录用校招新人后，前6周该成员进度贡献减半
- [ ] 社招消耗 2AP + 15预算
- [ ] 清洗后：bossTrust-1，morale-10，成员从列表消失
- [ ] teamSlots 为 0 人时「冲进度」按钮不可用
- [ ] teamSlots 为 2 人时冲进度产出约为满员的 65%

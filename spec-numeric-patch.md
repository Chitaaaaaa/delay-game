# Spec：数值补丁 A — 方向预算调整 + qualityDebt 进度倒退

> 两个独立改动，可分开验证

---

## 一、方向确定时预算自动调整

### 1.1 触发时机

`direction_select` / `direction_forced` / `confused_year_strategy` 任意一个方向确认事件处理完成后，立即按方向的 `budgetDrainMultiplier` 计算预算 delta。

### 1.2 档位映射

```javascript
function getDirectionBudgetDelta(direction) {
  const mult = DIRECTION_TEAM_SCALE[direction]?.budgetDrainMultiplier || 1.0;
  if (mult >= 1.7) return +35;
  if (mult >= 1.4) return +25;
  if (mult >= 1.1) return +15;
  if (mult >= 0.7) return 0;
  return -15;
}
```

对应实际结果：

| 方向 | 起始预算 |
|------|---------|
| MINI_GAME, CHESS_CARD, CASUAL, IDLE | 85 |
| ROMANCE, AUTO_CHESS, CARD, SIM, LEGACY | 100 |
| SLG, PARTY, ANIME | 115 |
| ARPG, GLOBAL, AI_NATIVE, IP_PORT, METAVERSE | 125 |
| BATTLE_ROYALE, MOBA, OPENWORLD, PC_MMO | 135 |

> 注：以上为基准值，背景卡加成（PM +15，跨行业 +20）叠加在此之上。

### 1.3 接入位置

在 `handleChoice` 处理方向确认事件的 `setState` 中，追加：

```javascript
const dirBudgetDelta = getDirectionBudgetDelta(choice.direction);
// 合并进现有的 budget 计算：
budget: Math.max(0, Math.min(150, prev.budget + (bonusEffects.budget || 0) + dirBudgetDelta)),
```

### 1.4 叙事文案

在方向选择结果（`result` 字段之后）追加一行小字提示，仅当 delta ≠ 0 时显示：

| delta | 文案 |
|-------|------|
| +35 | 「老板批了立项，大项目该有这个投入。预算+35。」 |
| +25 | 「立项通过，追加了启动资金。预算+25。」 |
| +15 | 「预算批下来了。预算+15。」 |
| -15 | 「低成本项目，老板说能省就省。预算-15。」 |

---

## 二、qualityDebt → 月结进度倒退

### 2.1 机制说明

每月结算时，若 qualityDebt 超过阈值，当月进度被强制扣减。叙事依据：积累的技术债在月底集中爆发，团队被迫花时间修问题而不是推进度。

### 2.2 扣减档位

```javascript
function getQualityDebtProgressDrain(qualityDebt) {
  if (qualityDebt >= 80) return 10;
  if (qualityDebt >= 60) return 6;
  if (qualityDebt >= 40) return 3;
  return 0;
}
```

### 2.3 接入位置

在 `dismissMonthSummary`（月结函数）中，`newProgress` 计算之后追加：

```javascript
const qdDrain = getQualityDebtProgressDrain(prev.qualityDebt);
if (qdDrain > 0) newProgress = Math.max(0, newProgress - qdDrain);
```

### 2.4 月结显示文案

在月结 summary 文案中，当 `qdDrain > 0` 时追加一条：

| qualityDebt | 文案 |
|------------|------|
| 40-59 | 「这个月修了不少本不该出现的问题。进度 -3。」 |
| 60-79 | 「技术债开始反噬。团队花了大量时间救火。进度 -6。」 |
| ≥ 80 | 「积累的问题在这个月集中爆发了。进度 -10。」 |

---

## 三、验证点

- [ ] 选 OPENWORLD → 方向确认后预算增加 35
- [ ] 选 MINI_GAME → 方向确认后预算减少 15
- [ ] 选 SIM → 预算无变化（delta = 0，无文案提示）
- [ ] qualityDebt = 35，月结 → 进度无扣减
- [ ] qualityDebt = 45，月结 → 进度 -3，显示对应文案
- [ ] qualityDebt = 65，月结 → 进度 -6
- [ ] qualityDebt = 85，月结 → 进度 -10
- [ ] 进度倒退后不低于 0（Math.max 保护）

---

## 四、开发提示词

请阅读以下两个文件，按 spec 修改游戏代码：

- 游戏主文件：`delay-game.jsx`
- 功能规格：`spec-numeric-patch.md`

共两个独立改动，请分别完成后验证：

1. 新增 `getDirectionBudgetDelta` 函数，在方向确认事件的 setState 中追加预算 delta，delta ≠ 0 时在结果区显示文案
2. 新增 `getQualityDebtProgressDrain` 函数，在月结函数中计算进度扣减，扣减 > 0 时在月结 summary 追加文案

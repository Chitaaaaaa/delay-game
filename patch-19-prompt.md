# Patch 19 实现提示词

## 任务说明

请阅读以下两个文件，按 spec 修改游戏代码：

- 游戏主文件：`delay-game.jsx`
- 功能规格：`patch-19-spec.md`

假设 Patch 01–18 已全部完成。本 patch 涉及数值系统的较大改动，请严格按顺序执行，每步完成后确认逻辑再继续。

---

## 实现步骤

### 步骤一：预算加速消耗

在每周结算函数中新增固定预算消耗，根据当前月份计算：

```javascript
function getWeeklyBudgetDrain(month) {
  if (month <= 2) return 2;
  if (month <= 4) return 4;
  return 6;
}
```

每周结算时执行：`state.budget -= getWeeklyBudgetDrain(state.month)`

此消耗在行动结算和事件结算之外额外扣除，不受任何行动影响。

---

### 步骤二：士气分段效率系数

找到「冲进度」行动的进度产出计算位置，包裹一个效率系数：

```javascript
function getMoraleEfficiency(morale) {
  if (morale >= 80) return 1.2;
  if (morale >= 50) return 1.0;
  if (morale >= 35) return 0.8;
  if (morale >= 20) return 0.6;
  return 0.4;
}
// 行动产出：baseProgress × getMoraleEfficiency(state.morale)
```

**只作用于「冲进度」行动**，事件直接给的 progress 不受影响。

---

### 步骤三：统一士气衰减公式

新增每周士气衰减函数，替换原有的固定衰减值：

```javascript
function getMoraleDecay(qualityDebt, teamSize, month) {
  const base = 1;
  const qualityPressure = Math.floor(qualityDebt / 30);
  const teamBurden = Math.max(0, teamSize - 3) * 0.5;
  const phasePressure = Math.floor((month - 1) / 2);
  return base + qualityPressure + teamBurden + phasePressure;
}

// teamSize 计算方式：
const teamSize = state.teamSlots.filter(s => s !== null).length;
```

人心分的衰减加速倍率：

```javascript
function getPeopleDecayMultiplier(peopleScore) {
  if (peopleScore >= 5) return 1.0;
  if (peopleScore >= 3) return 1.2;
  return 1.5;
}
```

高信任缓冲：

```javascript
const trustBuffer = state.bossTrust >= 8 ? 0.8 : 1.0;
```

每周士气衰减最终值：

```javascript
const weeklyDecay = getMoraleDecay(state.qualityDebt, teamSize, state.month)
                  * getPeopleDecayMultiplier(state.people)
                  * trustBuffer;
state.morale = Math.max(0, state.morale - weeklyDecay);
```

---

### 步骤四：低士气→bossTrust 月底传导

在月底结算函数中追加：

```javascript
if (state.morale < 20) {
  state.bossTrust = Math.max(0, state.bossTrust - 2);
  // 追加月结文案："他不仅听说了团队状态，还收到了离职申请。"
} else if (state.morale < 35) {
  state.bossTrust = Math.max(0, state.bossTrust - 1);
  // 追加月结文案："他听说了团队的状态。"
}
```

---

### 步骤五：关怀/安抚行动递减效应

新增两个行动的效果计算函数：

```javascript
// 危机安抚（2AP）
function getCrisisComfortEffect(useCount) {
  return Math.max(10, Math.round(25 / (1 + 0.3 * useCount)));
}

// 团队关怀（1AP）
function getTeamComfortEffect(useCount) {
  return Math.max(5, Math.round(10 / (1 + 0.2 * useCount)));
}
```

- 将现有行动的固定士气回复值替换为上述函数调用
- 每次使用后对应计数器 +1：`state.crisisComfortCount++` / `state.teamComfortCount++`
- productHealth ↓↓ 的回复打折（×0.7）叠加在递减后的值上（见步骤六）

---

### 步骤六：修订 productHealth ↓↓ 效果（修订 Patch 17）

找到 productHealth ↓↓ 状态的效果处理位置，**删除**每周 -2 士气的逻辑：

```javascript
// 删除这一行（或等价逻辑）：
// if (productHealth === "↓↓") state.morale -= 2;
```

保留以下两项效果（在对应位置检查 productHealth 状态时应用）：
- 士气回复行动效果 ×0.7
- 负面事件的士气伤害 ×1.2

其他 productHealth 档次效果不变。

---

### 步骤七：新增 state 字段

在 `buildInitialState` 中新增以下字段：

```javascript
// 隐性积分（五维度，各 0-10）
honesty: 10,
people: 10,
quality: 10,
judgment: 10,
grit: 10,

// 行动递减计数器
crisisComfortCount: 0,
teamComfortCount: 0,

// boss_talk 替代标志（Patch 07 boss_talk 未实装时使用）
bossTrustHitZero: false,

// 维度临界提示已触发标记
honestyHintShown: false,
peopleHintShown: false,
qualityHintShown: false,
```

在 bossTrust 归零时设置标志：
```javascript
if (state.bossTrust <= 0 && !state.bossTrustHitZero) {
  state.bossTrustHitZero = true;
}
```

---

### 步骤八：隐性积分触发点接入

按 spec 第四节的加减分规则，在对应行为结算时更新对应维度分值：

**诚实维度（honesty）**：
- milestone 选B：`+2`
- milestone 选C：`+1`
- 进度泡沫事件（water_reveal）选A如实汇报：`+2`
- milestone 选A且有水分：`-3`
- 掺水被发现：`-2`

**人心维度（people）**：
- 获得心腹：`+3`
- 清醒的人事件选C（帮转岗）：`+3`
- milestone 选C用心腹：`+1`
- 失去心腹：`-4`
- 清洗人员：`-2`

**品质维度（quality）**：
- 技术健康检查行动每次执行：`+1`
- 月底结算时：若 `qualityDebt > 50`，`quality -= 1`

**判断维度（judgment）**：
- 方向匹配 primary：`+5`（方向选定后即时结算）
- 方向匹配 secondary：`+3`
- 拒绝跟风热事件（坚守方向选项）：`+2`
- 方向匹配 mocked：`-3`
- 跟风热事件后放弃原方向：`-2`

**韧性维度（grit）**：
- 每次触发紧急融资行动：`-2`
- boss_talk 触发（或 `bossTrustHitZero` 变为 true 时）：`-3`

所有维度分值限制在 `[0, 10]`。

---

### 步骤九：隐性积分→结局档次

在结局判定逻辑中，通过四道门后计算总分并决定档次：

```javascript
function getHiddenScore(state) {
  return state.honesty + state.people + state.quality + state.judgment + state.grit;
}

function getEndingTier(hiddenScore) {
  if (hiddenScore >= 40) return "legendary";   // 传奇
  if (hiddenScore >= 30) return "excellent";   // 优秀
  if (hiddenScore >= 20) return "profitable";  // 大赚特赚
  return "average";                            // 中规中矩（保底）
}
```

各档次结局文案方向（具体文案内容填充阶段补充）：
- 传奇（40–50）："你做到了，而且你知道为什么。"
- 优秀（30–39）："你做到了。有些人知道代价。"
- 大赚特赚（20–29）："你做到了。但你不确定值不值得。"
- 中规中矩（<20）："你做到了。但有些东西，活不了。"

---

### 步骤十：维度临界提示文案

在以下时机检查是否需要追加提示文案（每种提示每局只追加一次）：

```javascript
// 诚实分 < 3，在下一次 milestone 结果页追加
if (state.honesty < 3 && !state.honestyHintShown) {
  resultText += "\n\n「你在会议上越来越熟练了。熟练到有时候你自己也分不清，哪些是真的，哪些是说出来的。」";
  state.honestyHintShown = true;
}

// 人心分 < 3，在下一次月结文案追加
if (state.people < 3 && !state.peopleHintShown) {
  monthEndText += "\n\n「走廊里遇到的人越来越少了。你不太确定，是他们不在了，还是他们不想跟你说话了。」";
  state.peopleHintShown = true;
}

// 品质分 < 3，在下一次随机事件结果追加
if (state.quality < 3 && !state.qualityHintShown) {
  eventResultText += "\n\n「有人在内网发了一篇匿名帖：『这个游戏的核心玩法，你自己玩过吗？』没有人回复。帖子第二天被删了。」";
  state.qualityHintShown = true;
}
```

---

## 注意事项

1. **不实现**诚实分迟滞惩罚回路（progressDebt 机制，待策划确认）
2. **不实现**全量事件选项的隐性维度改造——milestone 和高频事件优先，其他事件的隐性维度在内容填充阶段处理
3. 预算加速消耗的初始值**不在本 patch 调整**，先跑通逻辑看手感
4. 隐性积分 UI **不显示**，不需要在任何面板展示数字

---

## 验证点

- [ ] 月5-6 每周自动扣6预算，与行动花费叠加后后期压力明显
- [ ] 士气低于 20 时，「冲进度」行动效果明显变差（×0.4）
- [ ] 月5，6人，qualityDebt=70 时，每周士气衰减约 6-7
- [ ] 危机安抚第3次使用后效果明显低于第1次
- [ ] productHealth ↓↓ 时不再每周自动 -2 士气（只有关怀打折和事件伤害放大）
- [ ] 通关后结局页面根据隐性积分显示不同档次文案
- [ ] 诚实分降到 3 以下时，下一次 milestone 结果出现对应提示文案

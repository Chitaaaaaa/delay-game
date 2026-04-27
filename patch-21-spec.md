# Patch 21：旧事件修复 + KPI加强 + TeamSlot系数接入

> 前置：Patch 01-20 已完成
> 三个独立改动打包，每个可独立验证

---

## 一、旧事件修复：花钱买士气加QD + 赶工选项补QD + milestone A选项补代价

### 1.1 修改原则

- 花钱/加人换士气 → 补 qualityDebt（用资源压问题=技术债积累）
- 赶工/妥协/绕过 → 补 qualityDebt（这是核心设定，不可缺）
- milestone 选项A「展示/确认/压报告」→ 补 hidden.honesty:-1（不诚实的选择）
- 只改 effects，不改叙事文案
- hidden 字段新增，沿用 patch-20 的 `dir_` 事件处理逻辑（在 handleChoice 中 `if (event?.id?.startsWith('dir_') || choice.hidden)` 判断）

### 1.2 花钱买士气 → 补 qualityDebt

| 事件 | 选项 | 现有 effects | 新增 |
|------|------|-------------|------|
| quitter 减员 | C: 给他批一个月调整假 | budget:-10, morale:+15 | qualityDebt:+8 |
| firefighter 救火队 | C: 换延期批复+资源补偿 | progress:-2, morale:-3, budget:+12 | qualityDebt:+5 |
| cowboy 自由发挥 | A: 给他自由 | progress:-6, morale:+15, budget:-8 | qualityDebt:+5 |
| thunder 雷公 | C: 改用备用方案 | progress:-1, morale:+10, budget:-18 | qualityDebt:+8 |

### 1.3 赶工/妥协/绕过 → 补 qualityDebt

| 事件 | 选项 | 现有 effects | 新增 |
|------|------|-------------|------|
| paratrooper 伞兵 | A: 当然！洗耳恭听 | progress:-8, morale:-8, budget:+10 | qualityDebt:+15 |
| impulse 灵机一动 | A: 好！美术程序都动起来 | progress:0, morale:-10, budget:+10 | qualityDebt:+8 |
| corp_approval 18层审批 | C: 先做完再说，回头补审批 | progress:+2, morale:-5 | qualityDebt:+8 |
| water_reveal 进度修正 | C: 维持上报数字，私下修正 | progress:-3, morale:+3 | qualityDebt:+5 |
| market_trend 跟风热 | A: 全盘跟风，重做 | progress:-9, morale:+5, budget:-10 | qualityDebt:+10 |
| corp_kpi KPI季 | A: 赶工冲KPI | progress:-3, morale:-8 | qualityDebt:+5 |
| bet_deal 对赌协议 | A: 拼了，接受对赌 | progress:-2, morale:-8 | qualityDebt:+5 |
| stock_trap 股票绑架 | A: 短期冲进度保股价 | progress:+2, morale:-5, budget:-15 | qualityDebt:+5 |
| brooks_law 救场招人 | A: 紧急招人 | progress:-6, morale:-8, budget:-15 | qualityDebt:+8 |

### 1.4 有明显最优解的选项 → 补 qualityDebt 打平

| 事件 | 选项 | 现有 effects | 新增 |
|------|------|-------------|------|
| castle 空中楼阁 | C: 把现有进度包装成Demo | progress:-2, morale:+5, budget:+10 | qualityDebt:+8 |
| paratrooper 伞兵 | C: 邀请他深入了解现状 | progress:+5, morale:+5 | qualityDebt:+5 |
| meeting 铁头功 | C: 出钱请外包 | progress:+3, morale:-8, budget:-8 | qualityDebt:+3 |
| kpi_review KPI施压 | B: 拿数据反驳 | progress:+2, morale:+5, bossTrust:+1 | qualityDebt:+3 |
| manpower 人海战术 | B: 小规模支援 | progress:+5, morale:+5 | qualityDebt:+5 |

### 1.5 Milestone A 选项补 hidden.honesty

milestone 事件目前没有 id 字段，需先补 id（m1_review 到 m5_review），然后给每个 A 选项加 `hidden: { honesty: -1 }`。

| month | 事件名 | id | 选项A新增 |
|-------|--------|------|----------|
| 1 | 立项启动评审 | m1_review | hidden: { honesty: -1 } |
| 2 | MVP评审 | m2_review | hidden: { honesty: -1 } |
| 3 | 基础闭环评审 | m3_review | hidden: { honesty: -1 } |
| 4 | 内容量产评审 | m4_review | hidden: { honesty: -1 } |
| 5 | 整体验收评审 | m5_review | qualityDebt: +5, hidden: { honesty: -1 } |

### 1.6 handleChoice hidden 处理扩展

现有 patch-20 的 hidden 处理仅判断 `event?.id?.startsWith('dir_')`，需扩展为：

```javascript
if (choice.hidden) {
  Object.entries(choice.hidden).forEach(([key, val]) => {
    if (newState[key] !== undefined) {
      newState[key] = Math.max(0, Math.min(10, newState[key] + val));
    }
  });
}
```

移除 `dir_` 前缀限制，任何事件选项都可以有 hidden 字段。

---

## 二、预算消耗 UI 反馈 + 士气衰减感知增强

### 2.1 预算周消耗显示

预算的每周固定消耗已在代码中生效（`getWeeklyBudgetDrain`），但玩家看不到。修改方式：

在 handleChoice 结果结算后，追加显示周消耗 EffectBadge。在 `lastWorkEffect` 对象中新增 `weeklyDrain` 字段：

```javascript
// 在 handleChoice 中，budget 结算后
const weeklyDrain = getWeeklyBudgetDrain(month);
// 传给 lastWorkEffect
lastWorkEffect.weeklyDrain = -weeklyDrain;
```

在 UI 层（EffectBadge 渲染区域），追加显示：

```jsx
{lastWorkEffect.weeklyDrain && (
  <EffectBadge value={lastWorkEffect.weeklyDrain} label="周消耗" />
)}
```

### 2.2 士气衰减显示

士气衰减已在代码中生效，但感知弱。修改方式：

**方案A：士气条显示数字**（像 bossTrust 那样有 displayValue）

```jsx
<StatBar label="💪 士气" value={state.morale}
  displayValue={Math.round(state.morale)} color="#fb923c" ... />
```

**方案B：月结总结显示士气消耗**

在月结总结（dismissMonthSummary）的文案中追加一行：

```javascript
const moraleDecayThisMonth = /* 计算当月4周的总衰减量 */;
// 追加到月结显示：`本月士气自然消耗：-${moraleDecayThisMonth}`
```

两个方案都做。方案A 改 StatBar 的 displayValue 传参，方案B 在月结数据中追加 moraleDecay 字段。

---

## 三、KPI松紧全套

### 3.1 现状

kpiState 仅影响事件池配比（tight +corp事件，loose +creative事件），玩家感知弱。

### 3.2 新增效果

| 效果 | tight | loose | 代码位置 |
|------|-------|-------|---------|
| 预算周消耗倍率 | ×1.3 | ×0.9 | getWeeklyBudgetDrain 调用处 |
| 月结 bossTrust | 额外-1 | 额外+1 | dismissMonthSummary |
| 事件 morale 负面效果 | ×1.15 | ×0.9 | handleChoice moraleDelta 计算 |
| UI 状态提示 | "老板盯得紧" | "老板放权" | statsRow 下方 |

### 3.3 预算周消耗倍率

```javascript
function getKpiBudgetMultiplier(kpiState) {
  if (kpiState === "tight") return 1.3;
  if (kpiState === "loose") return 0.9;
  return 1.0;
}

// handleChoice 中，替换原有的 getWeeklyBudgetDrain(month)
const weeklyDrain = Math.round(getWeeklyBudgetDrain(month) * getKpiBudgetMultiplier(prev.kpiState));
```

### 3.4 月结 bossTrust 传导

在 dismissMonthSummary 中，现有 `newBossTrust` 计算之后追加：

```javascript
if (newKpiState === "tight") newBossTrust = Math.max(0, newBossTrust - 1);
if (newKpiState === "loose") newBossTrust = Math.min(10, newBossTrust + 1);
```

叙事依据：tight 时老板持续施压，信任自然磨损；loose 时放权，信任积累。

### 3.5 事件 morale 负面效果倍率

在 handleChoice 中，现有 moraleDelta 计算处追加：

```javascript
// 现有：moraleDelta = Math.round(moraleDelta * healthTier.dmgMult)
// 追加：KPI tight 时负面效果放大
if (moraleDelta < 0) {
  const kpiMult = prev.kpiState === "tight" ? 1.15 : prev.kpiState === "loose" ? 0.9 : 1.0;
  moraleDelta = Math.round(moraleDelta * kpiMult);
}
// 然后 * healthTier.dmgMult
moraleDelta = Math.round(moraleDelta * healthTier.dmgMult);
```

叙事依据：tight 时团队压力更大，同一事件造成的士气打击更重。

### 3.6 UI 状态提示

在 statsRow 下方（产品健康度行之前），新增 KPI 状态提示行：

```jsx
{state.kpiState !== "normal" && (
  <div style={{ padding: "6px 18px", fontSize: 12, fontFamily: "monospace",
    color: state.kpiState === "tight" ? "#f87171" : "#4ade80",
    background: state.kpiState === "tight" ? "#1a0505" : "#051a05" }}>
    {state.kpiState === "tight" && "⚠ 老板盯得紧：预算消耗+30%，士气伤害+15%"}
    {state.kpiState === "loose" && "✦ 老板放权：预算消耗-10%，士气伤害-10%"}
  </div>
)}
```

---

## 四、TeamSlot 产出系数接入

### 4.1 一行乘法

当前 `getTeamProgressCoeff` 已定义但未在进度计算中生效。在 handleChoice 的进度计算行中：

```javascript
// 现有（line 2503）：
let newProgress = Math.min(100, Math.max(0, prev.progress + BASE_PROGRESS + (choice.effects.progress || 0) + mode.progressBonus + pb - hirePenalty));

// 改为：
const teamCoeff = getTeamProgressCoeff(prev.teamSlots);
let newProgress = Math.min(100, Math.max(0, prev.progress + Math.round(BASE_PROGRESS * teamCoeff) + (choice.effects.progress || 0) + mode.progressBonus + pb - hirePenalty));
```

注意：`teamCoeff` 变量已在 line 2502 声明，只需要在 BASE_PROGRESS 处乘上去。`choice.effects.progress` 不乘 teamCoeff（事件直接给的进度不受团队规模影响）。

---

## 五、实现提示词

1. 修改 EVENTS 数组中 14 个事件的 effects（见 1.2、1.3、1.4 节表格），给指定选项追加 qualityDebt 字段。

2. 给 MILESTONE_EVENTS 的 5 个事件补 id 字段（m1_review 到 m5_review），给 A 选项追加 `hidden: { honesty: -1 }`，月5-A 追加 `qualityDebt: 5`。

3. 扩展 handleChoice 中 hidden 处理：移除 `startsWith('dir_')` 限制，改为任何 `choice.hidden` 存在时都执行隐性积分变化。

4. 预算 UI 反馈：在 handleChoice 中计算 weeklyDrain 并存入 lastWorkEffect，UI 层追加 EffectBadge 显示。

5. 士气条显示数字：StatBar 组件传 displayValue={Math.round(state.morale)}。

6. 月结士气消耗显示：在 dismissMonthSummary 中计算当月 4 周总衰减量，追加到月结显示数据。

7. 新增 `getKpiBudgetMultiplier` 函数，在 handleChoice 预算结算处替换原有 getWeeklyBudgetDrain 调用。

8. dismissMonthSummary 中追加 tight/loose 的 bossTrust 传导。

9. handleChoice 中 moraleDelta 负面效果计算追加 KPI 倍率。

10. statsRow 下方新增 KPI 状态提示行。

11. TeamSlot 乘法：handleChoice 进度计算中 `BASE_PROGRESS` 改为 `Math.round(BASE_PROGRESS * teamCoeff)`。

**验证点：**
- [ ] quitter 选C → qualityDebt 增加 8
- [ ] paratrooper 选A → qualityDebt 增加 15
- [ ] milestone 月1 选A → honesty 降低 1
- [ ] milestone 月5 选A → honesty 降低 1 且 qualityDebt 增加 5
- [ ] 任意事件选有 hidden 的选项 → 隐性积分正确变化（不限于 dir_ 前缀事件）
- [ ] 预算结果页显示 "-X 周消耗" EffectBadge
- [ ] 士气条显示具体数字
- [ ] 月结总结显示 "本月士气自然消耗：-X"
- [ ] kpiState=tight 时：预算周消耗为正常的 1.3 倍，事件 morale 负面效果 ×1.15
- [ ] kpiState=loose 时：预算周消耗为正常的 0.9 倍，事件 morale 负面效果 ×0.9
- [ ] tight 月结 → bossTrust 额外 -1；loose 月结 → bossTrust 额外 +1
- [ ] 状态栏显示 KPI 提示（tight 红色 / loose 绿色 / normal 不显示）
- [ ] 2人团队 → BASE_PROGRESS 从 3 降为 Math.round(3 × 0.65) = 2
- [ ] 4人团队 → BASE_PROGRESS 仍为 3（×1.0）
- [ ] 事件直接给的 progress 不受 teamCoeff 影响

---

## 六、本 patch 不实现

- 事件选项零和重平衡（待讨论）
- 不同赛道的团队人数差异（待讨论）
- 旧事件 hidden 维度全面覆盖（本次只改 milestone）
- 旧事件叙事文案修改

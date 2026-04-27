# Patch 11b：KPI联动 + milestone对赌检查 + IP保护选项

> 前置：patch-11-spec.md（KPI系统和IP系统的完整设计），patch-11 原有实现
> 本 spec 只补三件之前未接入的事项

---

## 一、KPI松紧×事件权重联动

在事件抽取逻辑中，根据 `state.kpiState` 对事件权重做乘数调整。

### 事件分类

**管理层干预类**（tight时 ×1.3，loose时 ×0.7）：
```
corp_kpi / corp_approval / kpi_review / manpower / bet_deal / market_trend /
thunder / zombie_reveal / water_reveal / stock_trap / blamer / quitter /
brooks_law / paratrooper / meeting / firefighter
```

**创意类**（loose时 ×1.3，tight时 ×0.7）：
```
dreamer / impulse / castle / visionary / cowboy / legacy /
perfectionist / preacher / lucid_p1
```

**不参与权重调整**（固定触发，跳过）：
```
trust_decay_hidden_progress / trust_decay_promise_broken / hire_reveal
```

### 实现方式

```javascript
function getEventWeight(eventId, kpiState) {
  const mgmt = ["corp_kpi","corp_approval","kpi_review","manpower","bet_deal",
    "market_trend","thunder","zombie_reveal","water_reveal","stock_trap",
    "blamer","quitter","brooks_law","paratrooper","meeting","firefighter"];
  const creative = ["dreamer","impulse","castle","visionary","cowboy","legacy",
    "perfectionist","preacher","lucid_p1"];

  if (kpiState === "tight") {
    if (mgmt.includes(eventId)) return 1.3;
    if (creative.includes(eventId)) return 0.7;
  }
  if (kpiState === "loose") {
    if (mgmt.includes(eventId)) return 0.7;
    if (creative.includes(eventId)) return 1.3;
  }
  return 1.0;
}
```

权重只影响随机抽取概率，不影响事件内容和选项。

---

## 二、milestone 对赌检查

每月 milestone 结算时，在现有流程后追加对赌检查。

### 目标增量

每月目标进度增量：**16**（约等于24周打满100%的月均值）

### 检查逻辑

```javascript
function checkKpiAfterMilestone(state, progressLastMonth) {
  const increment = state.progress - progressLastMonth;
  const target = 16;

  if (increment >= target * 1.25) {
    // 超额25%以上，记为超额月
    return { kpiBoost: true };
  } else if (increment < target) {
    // 未达标，收紧一档
    return { kpiTighten: true };
  }
  return {};
}
```

**收紧规则**：
- 未达标 → kpiState 收紧一档（loose→normal，normal→tight，tight不变）
- 连续2个月超额 → 缓解一档（tight→normal，normal→loose，loose不变）

**向上管理缓解**：
- 向上管理行动（manage_up）每次执行时，`state.manageUpCount += 1`
- 累计达3次后，下一次 milestone 有50%概率额外缓解一档，并重置计数

### 月结追加文案

kpiState 收紧时，在月结文案末尾追加（根据状态）：

```
normal → tight：
「他这个月找你谈了两次。语气越来越短。你知道这意味着什么。」

loose → normal：
「空气开始变了。不明显，但你感觉得到。」
```

kpiState 缓解时不追加文案（玩家感受到的是压力减少，不需要点明）。

---

## 三、IP方保护型第三选项

### 触发条件

资源掠夺类事件（`manpower` / `brooks_law` / `paratrooper`）渲染选项时，检查：

```javascript
state.ipType === 'strong' && state.ipProtectCount > 0
```

满足则在现有选项末尾追加第三选项。

### 选项内容

```javascript
{
  text: "IP方介入",
  effects: {},   // 无数值效果
  result: "你的手机震了一下。是IP方的法务。他们发来一封邮件，措辞非常礼貌，意思非常明确：这个项目的资源不能动。你第一次感谢一份律师函。",
  onSelect: s => ({ ...s, ipProtectCount: s.ipProtectCount - 1 }),
  // 同时取消本次资源掠夺事件的效果：不执行该事件其他选项的 effects
}
```

选择「IP方介入」后，本次事件的资源掠夺效果**完全取消**（progress/morale/budget 均不变）。

### IP方关系耗尽提示

`ipProtectCount` 降为0时，在下一个事件结果文案后追加：

```
「IP方的法务说，他们已经帮你们挡了两次了。他顿了一下，没有说第三句话。你听懂了。」
```

### 新增 state 字段

```javascript
ipProtectCount: 2,   // 初始2次，仅 ipType === 'strong' 时有意义
manageUpCount: 0,    // 向上管理累计次数，milestone缓解后重置
kpiBoostMonths: 0,   // 连续超额月数，达2时缓解一档后清零
progressLastMonth: 0 // 上月末进度，月底结算前记录
```

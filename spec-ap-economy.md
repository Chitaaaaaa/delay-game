# Spec：AP 经济重构

> 核心原则：1AP = 5单位资源，跨士气/进度/预算统一换算
> 每个动作每回合只能执行一次
> 向上管理改为概率机制

---

## 一、统一换算基准

**K = 5**：1AP 兑换 5 单位任意资源。多 AP 动作线性缩放，无效率溢价。

---

## 二、BASE_PROGRESS 调整

将 `BASE_PROGRESS` 从 `3` 改为 `1`。

自动进度只代表"时间在走"，不是真正的推进贡献。玩家必须主动花 AP 冲进度，否则无法在 24 周内达到 100。

---

## 三、行动产出重新校准

按 K=5 重写以下行动的 `apply` 函数输出值，只改主要产出数字，不改 AP 成本和可用条件：

| 行动 | AP | 当前主产出 | 改后主产出 |
|------|----|-----------|-----------|
| 团队关怀 | 1 | 士气 +10 | 士气 +5 |
| 危机安抚 | 2 | 士气 +25 | 士气 +10 |
| 冲进度 | 2 | 进度 +3×teamCoeff×moraleEff | 进度 +10（固定，不再乘效率系数）|

> 说明：冲进度的士气副作用（-4）保留不变。进度不再乘 teamCoeff 和 moraleEff，这两个系数改为影响其他地方（待后续 patch 接入）。

---

## 四、每回合每个动作只能执行一次

### 4.1 新增 state 字段

在 `buildInitialState` 和所有 `resetState` 中新增：

```javascript
usedActions: [],   // 本回合已使用的 action id 列表
```

### 4.2 每周重置

在 `handleChoice` 执行完成、进入下一周时（`newWeek` 计算之后），重置：

```javascript
usedActions: [],
```

### 4.3 动作可用性判断

在 `ActionMenu` 中，现有 `available` 过滤之后，追加：

```javascript
const available = ACTIONS
  .filter(a => a.available(state, ctx))
  .filter(a => !state.usedActions.includes(a.id));
```

### 4.4 动作执行后记录

在 `takeAction` 中，执行 `action.apply` 之后，追加：

```javascript
setState(prev => ({ ...prev, usedActions: [...prev.usedActions, action.id] }));
```

---

## 五、向上管理改为概率机制

### 5.1 概率规则

| bossTrust 当前值 | 成功率 | 成功结果 | 失败结果 |
|----------------|--------|---------|---------|
| ≥ 7 | 75% | bossTrust +1 | bossTrust -1 |
| 4–6 | 65% | bossTrust +1 | bossTrust -1 |
| ≤ 3 | 50% | bossTrust +1 | bossTrust -1 |

### 5.2 实现方式

将 `向上管理` 的 `apply` 函数改为：

```javascript
apply: s => {
  const successRate = s.bossTrust >= 7 ? 0.75 : s.bossTrust <= 3 ? 0.50 : 0.65;
  const success = Math.random() < successRate;
  return {
    ...s,
    bossTrust: Math.max(0, Math.min(10, s.bossTrust + (success ? 1 : -1))),
    lastManageUpResult: success ? "success" : "fail",
  };
}
```

### 5.3 结果反馈 UI

新增 `lastManageUpResult` 字段（初始值 `null`，每周重置为 `null`）。

在行动结果区域，当 `lastManageUpResult` 不为 `null` 时展示：
- 成功：`「上面对你的工作表示认可。」+1 信任`（绿色）
- 失败：`「上面今天没有心情听你汇报。」-1 信任`（红色）

---

## 六、验证点

- [ ] 团队关怀 1AP → 士气 +5（不再是 +10）
- [ ] 危机安抚 2AP → 士气 +10（不再是 +25）
- [ ] 冲进度 2AP → 进度 +10（固定值，不受 moraleEff 影响）
- [ ] 不花行动点的周：进度 +1（BASE_PROGRESS = 1）
- [ ] 同一回合内，已用过的行动变灰、不可再点
- [ ] 进入下一周后，所有行动恢复可用
- [ ] 向上管理：bossTrust ≥ 7 时成功率约 75%（多次测试验证）
- [ ] 向上管理：bossTrust ≤ 3 时成功率约 50%
- [ ] 向上管理结果有文案反馈，成功绿色，失败红色

---

## 七、本 spec 不包含

- qualityDebt 对进度效率的影响（后续接入）
- teamCoeff 对进度的影响（待 TeamSlot 系统完善后接入）
- 预算回补行动（目前无此行动，不新增）
- 关怀/安抚的跨局递减效应（保留现有逻辑不动）

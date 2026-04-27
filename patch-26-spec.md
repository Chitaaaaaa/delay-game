# Patch 26：T3级背景bonus

> 前置：Patch 01-25 已完成
> 背景：patch-20 UNLOCK_TABLE 中有两个 T3 bonus 标记为 inPoolBonus: null
> T3 定义：不是数值乘数，而是结构性bonus——改变某个事件的选项结构或UI显示

---

## 一、两个 T3 bonus

| 背景 | 方向 | T3 bonus | 类型 |
|------|------|---------|------|
| outsider + realestate | SLG | 预算谈判额外选项 | 事件选项注入 |
| outsider + finance | MINI_GAME | 预算精确显示 | UI 信息增强 |

---

## 二、地产+SLG：预算谈判额外选项

### 2.1 设计

当玩家背景是 outsider + realestate，且选择了 SLG 方向时，firefighter 事件（救火队）获得第4个选项。

叙事逻辑：地产背景的制作人，在"被抽调资源"这种事上谈判经验比游戏圈的人强。他懂得怎么用"置换"而不是"对抗"来处理资源争夺。

### 2.2 firefighter 事件修改

现有 firefighter 有3个选项。当 `playerBackground === "outsider" && industryBackground === "realestate" && gameDirection === "SLG"` 时，追加第4选项：

```javascript
if (state.playerBackground === "outsider" && state.industryBackground === "realestate" && state.gameDirection === "SLG") {
  // 追加第4选项到 firefighter 事件的 choices
  extraChoice = {
    text: "提出置换方案——我们借出美术，他们让出技术资源。",
    effects: { progress: -2, morale: 3, budget: 5, bossTrust: 2 },
    hidden: { judgment: 1, people: 1 },
    result: "对方没想到你会提这个。美术借出去了，但技术组借到了两个后端——正好你们缺服务器端的人。上面觉得你会办事。"
  };
}
```

零和验证：p-2 + m+3 + b+5 + bT+2 = +8。太正了。调整：p-2, m+1, b+3, bT+1 = +3。OK。

修正后：

```javascript
extraChoice = {
  text: "提出置换方案——我们借出美术，他们让出技术资源。",
  effects: { progress: -2, morale: 1, budget: 3, bossTrust: 1 },
  hidden: { judgment: 1, people: 1 },
  result: "对方没想到你会提这个。美术借出去了，但技术组借到了两个后端——正好你们缺服务器端的人。上面觉得你会办事。"
};
```

### 2.3 实现方式

在 pickEvent 中，当返回 firefighter 事件时，检查条件并注入第4选项：

```javascript
if (event.id === "firefighter" && s.playerBackground === "outsider" && s.industryBackground === "realestate" && s.gameDirection === "SLG") {
  event = {
    ...event,
    choices: [...event.choices, {
      text: "提出置换方案——我们借出美术，他们让出技术资源。",
      effects: { progress: -2, morale: 1, budget: 3, bossTrust: 1 },
      hidden: { judgment: 1, people: 1 },
      result: "对方没想到你会提这个。美术借出去了，但技术组借到了两个后端——正好你们缺服务器端的人。上面觉得你会办事。"
    }]
  };
}
```

注意：不可修改原 EVENTS 数组中的 firefighter 对象（引用共享），需浅拷贝。

### 2.4 UNLOCK_TABLE 更新

```javascript
// 原
{ playerBackground: "outsider", industryBackground: "realestate", direction: "SLG",
  inPoolBonus: null }

// 改
{ playerBackground: "outsider", industryBackground: "realestate", direction: "SLG",
  inPoolBonus: { firefighterExtraChoice: true } }
```

---

## 三、金融+MINI_GAME：预算精确显示

### 3.1 设计

当玩家背景是 outsider + finance，且选择了 MINI_GAME 方向时，预算 UI 显示精确数值和下周预测。

叙事逻辑：金融背景的制作人，对数字敏感，能看清楚钱的流向——别人只看到"预算 67"，他能看到"当前67，下周-3，5周后耗尽"。

### 3.2 UI 修改

现有预算显示：进度条 + 数字

MINI_GAME + finance 背景时，追加两行：

```jsx
{state.playerBackground === "outsider" && state.industryBackground === "finance" && state.gameDirection === "MINI_GAME" && (
  <div style={{ fontSize: 11, color: "#555", marginTop: 2, fontFamily: "monospace" }}>
    <div>周消耗: -{Math.round(getWeeklyBudgetDrain(currentMonth) * getKpiBudgetMultiplier(state.kpiState) * (DIRECTION_TEAM_SCALE[state.gameDirection]?.budgetDrainMultiplier || 1))}</div>
    <div>预计剩余: {Math.max(0, Math.floor(state.budget / Math.max(1, getWeeklyBudgetDrain(currentMonth) * getKpiBudgetMultiplier(state.kpiState) * (DIRECTION_TEAM_SCALE[state.gameDirection]?.budgetDrainMultiplier || 1))))}周</div>
  </div>
)}
```

### 3.3 信息价值

这个 T3 bonus 给玩家提供了其他背景看不到的信息：
- 每周精确消耗量（其他玩家只能通过观察预算变化来推算）
- 剩余周数预测（其他玩家需要心算）

这不是数值优势——不影响任何计算——但给了信息优势，帮助做决策（比如"还有4周就没钱了，我不能选花钱的选项"）。

### 3.4 UNLOCK_TABLE 更新

```javascript
// 原
{ playerBackground: "outsider", industryBackground: "finance", direction: "MINI_GAME",
  selectBonus: { budgetPrecisionDisplay: true },
  inPoolBonus: null }

// 改
{ playerBackground: "outsider", industryBackground: "finance", direction: "MINI_GAME",
  selectBonus: { budgetPrecisionDisplay: true },
  inPoolBonus: { budgetPrecisionDisplay: true } }
```

---

## 四、getBackgroundBonus 支持布尔型 bonus

现有 getBackgroundBonus 只返回数值。需支持布尔型：

```javascript
function hasBackgroundBonus(state, key) {
  if (!state.backgroundBonuses) return false;
  for (const bonus of state.backgroundBonuses) {
    if (bonus[key] !== undefined) return true;
  }
  return false;
}
```

UI 中使用 `hasBackgroundBonus(state, "budgetPrecisionDisplay")` 替代硬编码背景检查。

---

## 五、实现提示词

1. **UNLOCK_TABLE 更新**：将地产+SLG 的 inPoolBonus 从 null 改为 `{ firefighterExtraChoice: true }`，将金融+MINI_GAME 的 inPoolBonus 从 null 改为 `{ budgetPrecisionDisplay: true }`。

2. **firefighter 额外选项**：在 pickEvent 返回事件后，检查 event.id === "firefighter" && hasBackgroundBonus(s, "firefighterExtraChoice")，若命中则浅拷贝事件并追加第4选项。不修改原 EVENTS 数组。

3. **预算精确显示**：在预算 UI 组件中，检查 hasBackgroundBonus(state, "budgetPrecisionDisplay")，若命中则追加两行小字：周消耗量和预计剩余周数。计算公式使用 getWeeklyBudgetDrain × getKpiBudgetMultiplier × budgetDrainMultiplier。

4. **hasBackgroundBonus 函数**：新增，检查 backgroundBonuses 中是否存在指定 key。用于 UI 和 pickEvent 中替代硬编码的背景类型检查。

5. 不需要修改 handleChoice——extraChoice 的 effects/hidden 走通用逻辑。

**验证点：**
- [ ] outsider + realestate + SLG → firefighter 事件有4个选项
- [ ] 其他背景 + SLG → firefighter 事件仍为3个选项
- [ ] outsider + realestate + 非SLG → firefighter 事件仍为3个选项
- [ ] 第4选项 effects: p-2,m+1,b+3,bT+1 → sum=+3
- [ ] outsider + finance + MINI_GAME → 预算旁显示周消耗和剩余周数
- [ ] 其他背景 + MINI_GAME → 不显示额外信息
- [ ] hasBackgroundBonus 不影响现有 getBackgroundBonus 数值读取

---

## 六、本 patch 不实现

- 其他行业背景的 T3 bonus（影视+IP_PORT、区块链+METAVERSE 等——现有 inPoolBonus 已足够）
- 更多事件的背景专属选项注入（只做 firefighter 一个示范）
- 预算精确显示的进阶版（预测考虑未来事件支出、morale 对预算的影响等）
- 非 outsider 背景的 T3 bonus（designer/engineer/artist/pm——T2 bonus 已足够差异化）

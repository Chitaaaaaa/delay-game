# Patch 28：人海战术 → teamSlots 接入

> 前置：Patch 01-27 已完成
> 问题：manpower 事件的 choice.action 字段（"large"/"small"）从未被 handleChoice 读取；
>       接受扩张之后 teamSlots 没有任何变化，叙事与数据脱节

---

## 一、现状

```
manpower 事件选择"好，全部招进来"（action: "large"）
  → handleChoice 只处理 effects（progress/morale/budget）
  → choice.action 字段完全被忽略
  → teamSlots 不变
  → hireBurdenWeeksLeft 不变（如果本来就没有被设置的话）

hire_reveal 事件（已有机制）
  → 只给出叙事揭晓 + stat 变化
  → 同样不修改 teamSlots
```

---

## 二、设计

### 2.1 manpower 接受路径

在 `handleChoice` 中，当 `event.id === "manpower"` 且 `choice.action` 为 `"large"` 或 `"small"` 时，除现有 effects 外，额外执行：

**action = "large"（全部招进来）**
- 向 `scheduledEvents` 追加 3 个 hire_reveal，分别在 `+1 / +2 / +3` 周触发
- 设置 `hireScale = "large"`（已有字段，影响 hire_reveal 内的渗透概率）
- 设置 `hireBurdenWeeksLeft = 4`，`hireBurdenRate = 3`（带教负担）

**action = "small"（只招 2 个关键岗位）**
- 向 `scheduledEvents` 追加 2 个 hire_reveal，分别在 `+1 / +2` 周触发
- 设置 `hireScale = "small"`
- 设置 `hireBurdenWeeksLeft = 2`，`hireBurdenRate = 2`

**action 为其他值（拒绝/IP介入 等）**
- 不做 teamSlots 相关处理

### 2.2 hire_reveal 处理：补充 teamSlots 写入

hire_reveal 揭晓时（玩家点击单一选项确认），在现有 stat effects 之外，额外向 teamSlots 追加一名成员：

```js
// 生成方式与 takeAction 中的 campus/social recruit 一致：
// role：使用 patch-29 的加权随机（见 patch-29-spec）
// seniority：从 ['junior', 'mid', 'senior'] 均等随机
// id：Date.now() 或 uuid

const newMember = {
  id: Date.now(),
  role: weightedRandomRole(),        // patch-29 中定义
  seniority: randomSeniority(),
  contribution: computeContribution(role, seniority, gameDirection),
};
newTeamSlots = [...prev.teamSlots, newMember];
```

**特殊情况：**
- `hireResult.type === "code"` 或 `"morale"` 时：成员仍然加入 teamSlots，但同时设置 `problemEmployee`（已有逻辑），表示这个人"在团队里但是个麻烦"
- `hireResult.type === "god"` 时：成员加入，额外给 `progressBonus +1`（已有逻辑保留）

### 2.3 teamSlots 上限保护

teamSlots 当前设计上限为 6。hire_reveal 写入前检查：

```js
if (prev.teamSlots.length >= 6) {
  // 不加人，但 stat effects 照常执行
  // 可追加一条叙事提示："团队已满员，新人直接分配到了项目组。"
}
```

---

## 三、brooks_law（救场招人）同步处理

brooks_law 事件与 manpower 性质相同（被迫招人），但 choices 可能没有 `action` 字段。

处理方式：在 handleChoice 中，当 `event.id === "brooks_law"` 时，按选项 index 判断：
- index 0（大量招人）→ 同 manpower action="large"
- index 1（只招一个关键岗位）→ 同 manpower action="small"  
- index 2（不招人，硬扛）→ 不处理

---

## 四、不改的内容

- hire_reveal 的叙事文案（god/normal/code/morale 四种揭晓文字）不动
- manpower 事件本身的 effects（progress/morale/budget）不动
- 自愿招募路径（campus/social recruit → handleHireCandidate）不动
- hireBurdenWeeksLeft 的周进度扣减逻辑不动

---

## 五、验证点

- [ ] manpower 选"好，全部招进来"后，scheduledEvents 追加 3 个 hire_reveal
- [ ] manpower 选"只招 2 个关键岗位"后，scheduledEvents 追加 2 个 hire_reveal
- [ ] manpower 拒绝路径不触发上述逻辑
- [ ] hire_reveal 揭晓后，teamSlots 增加一名成员
- [ ] god 型：成员加入，progressBonus +1
- [ ] code/morale 型：成员加入，problemEmployee 被设置
- [ ] normal 型：成员加入，无额外效果
- [ ] teamSlots 已满 6 人时，hire_reveal 不再追加成员
- [ ] brooks_law 大量招人路径同样触发 hire_reveal 调度

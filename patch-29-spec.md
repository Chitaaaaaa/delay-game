# Patch 29：招募角色权重调整

> 前置：Patch 01-28 已完成
> 问题：候选人角色从 ['engineer', 'designer', 'qa'] 均等随机（各 1/3），
>       导致 3 测试 / 3 程序等失真配置正常出现

---

## 一、现状

```js
// takeAction 中（campus/social recruit）
const roles = ['engineer', 'designer', 'qa'];
const role = roles[Math.floor(Math.random() * roles.length)];
// 每种角色 33.3% 概率，无权重
```

实际游戏开发团队中，测试在早期人数偏少，程序和设计是主力。
现有分布使得全测试团队概率不低，且没有可见的游戏内代价。

---

## 二、修改

### 2.1 新权重

```
engineer（程序）  40%
designer（策划）  35%
qa（测试）        25%
```

### 2.2 实现

将均等随机替换为加权随机函数，供招募和 hire_reveal 两处共用：

```js
function weightedRandomRole() {
  const r = Math.random();
  if (r < 0.40) return 'engineer';
  if (r < 0.75) return 'designer';
  return 'qa';
}
```

**调用位置：**
1. `takeAction` 中 campus/social recruit 的候选人生成（原来的 `roles[Math.random()...]` 那行）
2. `patch-28` 中 hire_reveal 写入 teamSlots 时的成员生成

---

## 三、软上限（可选，低优先级）

如果同一角色在 teamSlots 中已有 3 人，招募时 reroll 一次：

```js
function weightedRandomRoleWithSoftCap(teamSlots) {
  let role = weightedRandomRole();
  const count = teamSlots.filter(m => m.role === role).length;
  if (count >= 3) role = weightedRandomRole(); // 只 reroll 一次，不强制
  return role;
}
```

**不强制**：reroll 只做一次，结果可能仍然是同一角色。这保留了随机性，但降低了极端配置的概率。

是否启用：待手感测试后决定，默认**不启用**，只改基础权重。

---

## 四、不改的内容

- 角色的 `seniority`（资历）分布不变，仍然均等随机
- `ROLE_EMOJI` / `ROLE_NAMES` / `ROLE_LABELS` 等显示映射不变
- 现有 teamSlots 成员不受影响（只影响新招募）
- layoff 逻辑不变

---

## 五、验证点

- [ ] `weightedRandomRole` 函数存在，供两处调用
- [ ] campus recruit 候选人 role 分布约为 engineer 40% / designer 35% / qa 25%（统计多次验证）
- [ ] social recruit 同上
- [ ] hire_reveal 新增成员的 role 也使用新权重
- [ ] 软上限逻辑默认不启用（注释掉或 flag 控制）

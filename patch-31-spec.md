# Patch 31：manage_up 低信任保底

> 前置：Patch 01-30 已完成
> 问题：bossTrust=1 时，manage_up 有 50% 概率扣到 0；
>       扣到 0 之后下次 100% 成功回到 1，净效果是白耗 2AP 原地踏步。
>       玩家感知：在危险边缘反复振荡，操作没有意义感。

---

## 一、现状

```js
const atFloor = s.bossTrust === 0;
const successRate = atFloor ? 1.0 : s.bossTrust >= 7 ? 0.75 : s.bossTrust <= 3 ? 0.50 : 0.65;
const success = Math.random() < successRate;
const trustGain = success ? 1 : -1;
```

bossTrust=1 时：50% → +1，50% → -1（跌到 0）。

---

## 二、修改

### 2.1 保底逻辑

在低信任区（bossTrust ≤ 1），失败只是「没效果」，不再扣分：

```js
const atFloor = s.bossTrust <= 1;          // 原来只保 0，现在保 0 和 1
const successRate = s.bossTrust === 0 ? 1.0
  : s.bossTrust >= 7 ? 0.75
  : s.bossTrust <= 3 ? 0.50
  : 0.65;
const success = Math.random() < successRate;
const trustGain = (success ? 1 : (atFloor ? 0 : -1));   // 保底：失败不扣
```

### 2.2 效果对照

| bossTrust | 原行为 | 新行为 |
|-----------|--------|--------|
| 0 | 100% → +1 | 不变 |
| 1 | 50% → +1 / 50% → −1 | 50% → +1 / 50% → ±0 |
| 2 | 50% → +1 / 50% → −1 | 不变（2 不是保底区） |
| 3 | 50% → +1 / 50% → −1 | 不变 |

### 2.3 desc 文案可选更新

```js
desc: "老板信任度+1（低信任时失败无惩罚）"
```

---

## 三、不改的内容

- bossTrust >= 2 时的成功率和失败惩罚不变
- manageUpCount、lastManageUpResult 记录逻辑不变
- UI 展示和结果文案不变

---

## 四、验证点

- [ ] bossTrust=0 时：manage_up 必定成功 → 变为 1
- [ ] bossTrust=1 时：50% 成功 → 变为 2；50% 失败 → 仍为 1（不扣到 0）
- [ ] bossTrust=2 时：50% 成功 → 变为 3；50% 失败 → 变为 1（无变化）
- [ ] bossTrust=5 时：65% 成功 → +1；35% 失败 → -1（无变化）

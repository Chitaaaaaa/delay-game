# Patch 33：厂商规模系统 + 体量档位

> 前置：Patch 01-32 已完成
> 目标：新增「厂商规模」作为开局第三张选牌，驱动 projectTeamSize 动态计算、
>       体量档位判定、起始数值差异化

---

## 一、数值修正（先行）

在实施本 patch 前，先修正 DIRECTION_TEAM_SCALE 中以下字段的 projectTeamSize：

| 品类 | 原值 | 新值 |
|------|------|------|
| AI_NATIVE | 35 | 20 |
| PC_MMO | 55 | 50 |
| METAVERSE | 45 | 100 |
| OPENWORLD | 60 | 300 |

---

## 二、厂商规模：开局选牌

在现有「品类选择」「行业背景选择」之后，新增第三张选牌：**厂商规模**。

### 2.1 三种规模

```
小厂：人少事少，制作人说了算，但预算紧张
中厂：规模适中，开始有政治，有空降风险
大厂：资源充足，但老板敏感、人员复杂、极易被架空
```

### 2.2 state 新增字段

```js
studioScale: "small" | "mid" | "large"   // 开局选定，全局不变
```

### 2.3 projectTeamSize 动态计算

不再直接读取 DIRECTION_TEAM_SCALE 的 projectTeamSize 常量，改为：

```js
const STUDIO_MULTIPLIER = { small: 1.0, mid: 1.5, large: 2.5 };

function getProjectTeamSize(gameDirection, studioScale) {
  const base = DIRECTION_TEAM_SCALE[gameDirection].projectTeamSize;
  return Math.round(base * STUDIO_MULTIPLIER[studioScale]);
}
```

`state.projectHeadcount`（patch-30 引入）初始化时使用此函数计算，而非直接读常量。

---

## 三、体量档位

由 `projectHeadcount`（动态人数）实时判定，不是固定字段：

```js
function getScaleTier(headcount) {
  if (headcount < 12)  return "small";   // 小体量
  if (headcount <= 25) return "mid";     // 中体量
  if (headcount <= 50) return "large";   // 大体量
  return "xlarge";                       // 特大体量
}
```

体量档位影响：
- `directionClarity` 初始值（见 patch-34）
- NPC 出现频率（见 patch-34）
- 部分事件的触发阈值

### 3.1 品类 × 厂商规模 → 体量档位（跳档速查）

| 品类（小厂基础人数） | 小厂 | 中厂 | 大厂 |
|---------------------|------|------|------|
| MINI_GAME 5 | 小 | 小(8) | 中(13)↑ |
| CHESS_CARD 6 | 小 | 小(9) | 中(15)↑ |
| CASUAL 8 | 小 | 中(12)↑ | 中(20) |
| IDLE 8 | 小 | 中(12)↑ | 中(20) |
| ROMANCE 12 | 中 | 中(18) | 大(30)↑ |
| AUTO_CHESS 15 | 中 | 中(23) | 大(38)↑ |
| CARD 15 | 中 | 中(23) | 大(38)↑ |
| SIM 18 | 中 | 大(27)↑ | 大(45) |
| LEGACY 18 | 中 | 大(27)↑ | 大(45) |
| AI_NATIVE 20 | 中 | 大(30)↑ | 大(50) |
| PARTY 25 | 中 | 大(38)↑ | 特大(63)↑ |
| SLG 25 | 中 | 大(38)↑ | 特大(63)↑ |
| ANIME 30 | 大 | 大(45) | 特大(75)↑ |
| ARPG 35 | 大 | 特大(53)↑ | 特大(88) |
| IP_PORT 40 | 大 | 特大(60)↑ | 特大(100) |
| GLOBAL 40 | 大 | 特大(60)↑ | 特大(100) |
| BATTLE_ROYALE 50 | 大 | 特大(75)↑ | 特大(125) |
| MOBA 50 | 大 | 特大(75)↑ | 特大(125) |
| PC_MMO 50 | 大 | 特大(75)↑ | 特大(125) |
| METAVERSE 100 | 特大 | 特大(150) | 特大(250) |
| OPENWORLD 300 | 特大 | 特大(450) | 特大(750) |

---

## 四、起始数值差异化

| 参数 | 小厂 | 中厂 | 大厂 |
|------|------|------|------|
| 起始预算 | 基准值 | 基准值×1.4 | 基准值×2.0 |
| budgetDrainMultiplier 附加 | ×1.0 | ×1.3 | ×1.8 |
| 起始 bossTrust | 5 | 4 | 3 |
| bossTrust 自然波动幅度 | 平稳 | 中 | 剧烈 |

> bossTrust 波动幅度的具体实现：大厂在某些中性事件后 bossTrust 变化量 ±1 额外加权，细节在事件内容层处理。

---

## 五、不改的内容

- 卡牌选择 UI 框架不变，新增一组选项卡即可
- DIRECTION_TEAM_SCALE 的其他字段（sweetSpot / minViable / overcrowd / budgetDrainMultiplier）不变
- 现有 budget drain 计算读取 DIRECTION_TEAM_SCALE.budgetDrainMultiplier，厂商规模的附加倍率叠加在外层

---

## 六、验证点

- [ ] 开局出现厂商规模选牌（小厂/中厂/大厂）
- [ ] 选小厂：projectHeadcount = DIRECTION_TEAM_SCALE.projectTeamSize × 1.0
- [ ] 选中厂：projectHeadcount = base × 1.5（四舍五入）
- [ ] 选大厂：projectHeadcount = base × 2.5（四舍五入）
- [ ] METAVERSE 基础值为 100，OPENWORLD 为 300，AI_NATIVE 为 20，PC_MMO 为 50
- [ ] getScaleTier 正确返回四档
- [ ] 大厂起始 bossTrust = 3，小厂 = 5
- [ ] 大厂预算消耗比小厂高
- [ ] 「· 项目 X人」显示 projectHeadcount（动态值）

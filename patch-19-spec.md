# Patch 19：数值框架重构

> 前置：Patch 01–18 已完成
> 核心理念：项目在消耗你，你是在阻止塌方，不是在管理进度

---

## 一、预算加速消耗

### 1.1 每周固定消耗（新增）

项目本身持续烧钱，不依赖任何行动或事件：

| 阶段 | 月份 | 每周消耗 | 叙事依据 |
|------|------|---------|---------|
| 早期 | 月1–2 | -2 | 几个人在工位上敲键盘 |
| 中期 | 月3–4 | -4 | 测试外包、资产结算、服务器扩容 |
| 后期 | 月5–6 | -6 | 全员加班费、发行方预付、验收烧钱 |

24 周总基础消耗 = **96**（不含行动花费和事件效果）

### 1.2 实现方式

在每周结算函数中，根据当前月份计算并扣除：

```javascript
function getWeeklyBudgetDrain(month) {
  if (month <= 2) return 2;
  if (month <= 4) return 4;
  return 6;
}
// 每周结算时：state.budget -= getWeeklyBudgetDrain(state.month)
```

### 1.3 初始预算调整

初始预算需配合 96 点基础消耗 + 行动花费 + 事件消耗重新校准。
**待实装后看手感确认**，建议初始值在 120–150 之间试调。

---

## 二、士气系统重构

### 2.1 士气分段效率系数

士气是整个系统的传动轴，不是"归零=死"的开关：

| 士气区间 | 进度行动效率系数 | 体感描述 |
|---------|--------------|---------|
| 80–100 | ×1.2 | 团队状态很好，进度自然快 |
| 50–79 | ×1.0 | 正常推进 |
| 35–49 | ×0.8 | 推进效率明显变慢 |
| 20–34 | ×0.6 | 有人在投简历了 |
| 0–19 | ×0.4 | 摆烂，但还坐在位置上 |

**作用范围**：仅作用于「冲进度」行动的进度产出，事件直接给的 progress 不受影响。

士气归零不触发即时失败，但 ×0.4 的效率叠加预算持续消耗，自然走向失败结局。

### 2.2 统一士气衰减公式

每周结算时，士气自然衰减量由以下四项决定：

```javascript
function getMoraleDecay(qualityDebt, teamSize, month) {
  const base = 1;
  const qualityPressure = Math.floor(qualityDebt / 30);
  const teamBurden = Math.max(0, teamSize - 3) * 0.5;
  const phasePressure = Math.floor((month - 1) / 2);
  return base + qualityPressure + teamBurden + phasePressure;
}

// teamSize = teamSlots.filter(s => s !== null).length（已招募人数，不含空槽）
```

典型场景参考：

| 场景 | 参数 | 衰减量/周 |
|------|------|---------|
| 月1，2人，qualityDebt=0 | 1+0+0+0 | -1 |
| 月3，5人，qualityDebt=45 | 1+1+1+1 | -4 |
| 月5，6人，qualityDebt=70 | 1+2+1.5+2 | -6.5 |

**重要**：productHealth ↓↓ 状态不再独立叠加 -2/周（已由本公式通过 qualityDebt 覆盖），详见第三节。

### 2.3 人心分→士气衰减加速

隐性积分「人心」维度通过两档阈值影响衰减速率：

| 人心分 | 士气衰减倍率 | 叙事 |
|--------|------------|------|
| ≥ 5 | ×1.0（无惩罚） | 正常 |
| 3–4 | ×1.2 | 团队凝聚力开始松动 |
| < 3 | ×1.5 | 团队私下已经不听你的了 |

```javascript
function getPeopleDecayMultiplier(peopleScore) {
  if (peopleScore >= 5) return 1.0;
  if (peopleScore >= 3) return 1.2;
  return 1.5;
}

// 每周衰减量 = getMoraleDecay(...) × getPeopleDecayMultiplier(state.people)
```

### 2.4 低士气→bossTrust 月底传导

月底结算时检查当月士气均值（或月末值）：

```javascript
// 月底结算
if (state.morale < 20) state.bossTrust -= 2;  // "他不仅听说了，还收到了离职申请"
else if (state.morale < 35) state.bossTrust -= 1;  // "他听说了团队状态"
```

不即时触发，月底结算给玩家当月缓冲期修复。

### 2.5 高信任→士气衰减缓冲

```javascript
// bossTrust ≥ 8 时，统一衰减公式的结果再 ×0.8
const trustBuffer = state.bossTrust >= 8 ? 0.8 : 1.0;
const weeklyDecay = getMoraleDecay(...) × getPeopleDecayMultiplier(...) × trustBuffer;
```

叙事依据：老板信任你，团队不用花精力应对干预，感受得到这种空间。

### 2.6 关怀/安抚行动递减效应

短期止痛药不解决根源，边际效用递减：

```javascript
// 危机安抚（2AP，基础+25）
function getCrisisComfortEffect(useCount) {
  const raw = 25 / (1 + 0.3 * useCount);
  return Math.max(10, Math.round(raw));
}
// 第1次+25，第2次+19，第3次+16，第4次+13，第5次+11，下限+10

// 团队关怀（1AP，基础+10）
function getTeamComfortEffect(useCount) {
  const raw = 10 / (1 + 0.2 * useCount);
  return Math.max(5, Math.round(raw));
}
// 递减更温和，下限+5
```

`useCount` 存入 state，每次使用后 +1，不重置（整局累计）。

注意：productHealth ↓↓ 的回复打折（×0.7）叠加在递减后的基础上：
最差情况（人心<3 + ↓↓ + 第5次安抚）= 11 × 0.7 ≈ 7，关怀几乎失效。

---

## 三、productHealth 信号更新（修订 Patch 17）

↓↓ 状态移除独立每周 -2 扣士气，改为只保留两项效果：

| 状态 | 修订后效果 |
|------|---------|
| ↑↑（≥75） | 士气回复行动效果 ×1.15 |
| →（45–74） | 无修正 |
| ↓（20–44） | 回复行动效果 ×0.85；负面事件士气伤害 ×1.1 |
| ↓↓（<20） | 回复行动效果 ×0.7；负面事件士气伤害 ×1.2；~~每周 -2~~（**删除**） |

删除原因：qualityDebt 已通过统一衰减公式产生等效压力，双重扣减会让玩家感觉被两个系统惩罚同一件事。

productHealth 的定位修订为：
> "你感觉关怀行动越来越没用，而且事件总是特别伤士气"
> 而不是"你被两个系统扣同一个东西"

其余 Patch 17 内容（计算公式、信号展示、UI 位置）不变。

---

## 四、隐性积分系统

### 4.1 五个维度

| 维度 | 加分来源 | 扣分来源 |
|------|---------|---------|
| **诚实 Honesty** | milestone选B(+2)、选C(+1)；进度泡沫事件选A如实汇报(+2) | 选A且未消除水分(-3)；掺水被发现(-2) |
| **人心 People** | 获得心腹(+3)；清醒的人事件选C帮他转岗(+3)；milestone选C用心腹(+1) | 失去心腹(-4)；清洗人员(-2) |
| **品质 Quality** | qualityDebt全程<20(+5)；全程<40(+3)；每次技术健康检查行动(+1) | 最终qualityDebt>50每满一个月(-1，月底检查) |
| **判断 Judgment** | 方向匹配primary(+5)；secondary(+3)；拒绝跟风坚守方向(+2) | 方向匹配mocked(-3)；跟风后放弃原方向(-2) |
| **韧性 Grit** | 预算全程未触发紧急融资(+4)；bossTrust全程未归零(+3)；未触发boss_talk事件(+3) | 每次紧急融资(-2)；boss_talk触发(-3) |

> boss_talk 事件：Patch 07 定义（id: "boss_talk"，bossTrust===0时推入scheduledEvents）。
> 若尚未实装，韧性维度检查 `state.bossTrustHitZero` 标志位代替。

各维度满分 10，总分上限 50。

### 4.2 积分计算时机

**全程累计**（不是结局时一次算）：
- 每次触发积分变化的行为，立即更新对应维度分值
- 品质维度的 qualityDebt 月检在月底结算时执行
- 结局时只读取最终分数，不重新计算

### 4.3 积分→结局档次

**前提**：必须通过四道结局门（现有逻辑不变），才进入积分判定。

```
四道门检查（现有逻辑不变）
  │
  ├── 门1 budget≤0 → 夭折（不变）
  ├── 门2 bossTrust≤0 → 差评如潮（不变）
  ├── 门3 方向mocked（且综合分<70）→ 叫好不叫座（不变）
  │       方向mocked + 综合分≥70 → 逆势突围（不变）
  │
  └── 通过门4（综合分达阈值）
            │
            └── 计算隐性积分总分
                  ├── 40–50 → 传奇
                  ├── 30–39 → 优秀
                  ├── 20–29 → 大赚特赚
                  └── <20   → 中规中矩（保底）
```

门4（综合分≥45或≥35）保留为通过条件，不再决定结局档次。
档次完全由隐性积分决定。

### 4.4 低分临界提示文案

各维度分低时，在对应事件结果/月结文案后追加叙事提示（不显示数字）：

**诚实分 < 3**（在下一次 milestone 结果页后追加）：
> 「你在会议上越来越熟练了。熟练到有时候你自己也分不清，哪些是真的，哪些是说出来的。」

**人心分 < 3**（在下一次月结后追加）：
> 「走廊里遇到的人越来越少了。你不太确定，是他们不在了，还是他们不想跟你说话了。」

**品质分 < 3**（在下一次随机事件结果后追加）：
> 「有人在内网发了一篇匿名帖：「这个游戏的核心玩法，你自己玩过吗？」没有人回复。帖子第二天被删了。」

每个提示每局只出现一次，触发后标记，不重复。

### 4.5 诚实分迟滞惩罚回路

> **TODO：待策划 review**
>
> 诚实分低时应该有中期机械惩罚，但具体形式尚未确认。
> 候选方向：
> - 进度泡沫自动累积（progressDebt），water_reveal 时一次性崩塌
> - water_reveal 事件触发概率提升（软惩罚，不改进度显示）
> - milestone 选A的"虚假进度"在叙事上表现出来（某次月结追加文案提示）
>
> 问题核心：玩家感知得到惩罚的来源吗？还是会觉得进度莫名蒸发？
> **本 patch 暂不实现此回路，等设计确认后单独出 spec。**

---

## 五、事件选项维度扩展原则

### 5.1 每个选项碰 3–4 个维度，含 1–2 个隐性维度

```
❌ 当前（太透明）：选项A: progress+5, morale-4
✅ 改后（有纵深）：选项A: progress+5, morale-4, qualityDebt+8, honesty-1
                        表面：赚了进度
                        暗面：技术债积累，诚实分受损

❌ 当前（纯收益）：选项B: morale+10
✅ 改后：选项B: morale+10, budget-10, bossTrust-1
              表面：买到了士气
              暗面：花了钱，老板不高兴

❌ 当前（净亏损，不会选）：选项C: progress-3, budget-5
✅ 改后：选项C: progress-3, qualityDebt-5, people+1
              表面：短期痛
              暗面：长期干净，攒了人心
```

### 5.2 维度层

```
显性数值（玩家能看到并管理）：
  progress / morale / budget / bossTrust

半显性数值（能感觉，看不到精确数字）：
  qualityDebt / kpiState / productHealth信号

隐性积分（完全不可见，影响结局档次）：
  honesty / people / quality / judgment / grit
```

事件选项设计应跨层：**显性 1–2 个 + 半显性 0–1 个 + 隐性 0–1 个**。

### 5.3 改造优先级

本 patch 不要求全量改造现有事件，按以下顺序：

1. **milestone 事件**（每月必触，影响最大）→ 优先补隐性维度
2. **高频随机事件**（castle / legacy / water_reveal / kpi_review）→ 次优先
3. **其他随机事件** → 内容填充阶段统一处理

---

## 六、新增 state 字段

```javascript
// 新增到 buildInitialState
honesty: 10,          // 诚实积分，0-10
people: 10,           // 人心积分，0-10
quality: 10,          // 品质积分，0-10
judgment: 10,         // 判断积分，0-10
grit: 10,             // 韧性积分，0-10

crisisComfortCount: 0,   // 危机安抚累计使用次数
teamComfortCount: 0,     // 团队关怀累计使用次数

bossTrustHitZero: false, // bossTrust是否曾归零（boss_talk未实装时的替代标志）

// 维度临界提示已触发标记
honestyHintShown: false,
peopleHintShown: false,
qualityHintShown: false,
```

---

## 七、本 patch 不实现

- 全量事件选项的隐性维度改造（优先级3的部分）
- 各结局档次的具体文案（内容填充阶段）
- 诚实分迟滞回路的 progressDebt 视觉提示（玩家看到的进度数字是否要标注）

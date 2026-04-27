# Patch 24：诚实分迟滞惩罚回路

> 前置：Patch 01-23 已完成
> 问题：honesty 目前是"死分"——只影响结局 tier，不影响游戏过程。玩家从不诚实选项中短期获益（progress/budget），诚实分损失要到结局才结算。没有过程压力=不诚实零成本。

---

## 一、设计目标

```
诚实分低 → 游戏过程中产生可感知的负面后果
诚实分高 → 游戏过程中产生微弱正面反馈
关键：不是"惩罚不诚实"，而是"不诚实的代价会迟到但不会缺席"
```

---

## 二、迟滞惩罚机制

### 2.1 bossTrust 衰减加速

现有：bossTrust 通过 TRUST_DECAY_EVENTS 随机扣减（概率低，不固定）
新增：honesty < 5 时，每次月度结算额外扣减 bossTrust

```javascript
// handleChoice 月度结算处（isMilestone === true 时）
if (isMilestone) {
  const honestyDrain = prev.honesty < 3 ? -2
                     : prev.honesty < 5 ? -1
                     : 0;
  newBossTrust = Math.max(0, prev.bossTrust + honestyDrain);
}
```

叙事逻辑：你总在汇报里注水，上面不是傻子，迟早发现。信任的流失不是一次性的，是慢慢渗透的。

| honesty | 月度额外 bT 变化 |
|---------|-----------------|
| 5-10 | 0（正常） |
| 3-4 | -1（上面开始怀疑） |
| 0-2 | -2（上面已经不信你了） |

### 2.2 信息失真系数

新增 `getInfoDistortion(honesty)` 函数：

```javascript
function getInfoDistortion(honesty) {
  if (honesty >= 7) return 0;
  if (honesty >= 5) return 0.1;
  if (honesty >= 3) return 0.2;
  return 0.3;
}
```

用途：honesty 低时，你看到的进度数字有水分。

**实现位置**：在 handleChoice 中计算 newProgress 时，如果 honesty < 7，progress 显示值有一定概率包含虚报水分：

```javascript
// 进度计算处
let rawProgress = ...; // 正常计算
let distortion = getInfoDistortion(prev.honesty);
let fakeBonus = Math.round(distortion * 5); // 诚实分低时，进度显示多+1~2
let newProgress = Math.min(100, rawProgress + fakeBonus);
// 额外记录真实进度
newFakeProgress = (prev.fakeProgress || 0) + fakeBonus;
```

state 新增字段：`fakeProgress: 0`（累计虚报进度，最终结算时从真实进度扣除）

**结算时机**：water_reveal 事件触发时，或最终结算时。

```javascript
// 最终结算（week > TOTAL_WEEKS 或 progress >= 100）
const realProgress = Math.max(0, prev.progress - (prev.fakeProgress || 0));
```

**叙事**：你不诚实→团队学会了报喜不报忧→你看到的数字越来越好看→但它是虚的→某天突然发现真实进度差了一截。

### 2.3 诚实分影响 pickEvent

在 pickEvent 中追加权重修正：

```javascript
// pickEvent 中，生成事件池后
const honestyWeightMod = state.honesty >= 7 ? 0.8   // 诚实→更少负面事件
                       : state.honesty >= 5 ? 1.0
                       : state.honesty >= 3 ? 1.2   // 不诚实→更多负面事件
                       : 1.4;                       // 很不诚实→大量负面事件
```

受影响的事件类型：corp_kpi、corp_approval、kpi_review、water_reveal、trust_decay 系列。

叙事：上面盯你越紧→公司病事件频率越高→你不诚实招来的审查本身成了新的压力源。

---

## 三、正面反馈机制

### 3.1 诚实选项偶尔触发 bonus 事件

honesty >= 7 时，milestone 结算后有 30% 概率触发「踏实」bonus：

```javascript
const HONESTY_BONUS_EVENT = {
  id: "honesty_bonus",
  name: "踏实",
  emoji: "🤝",
  color: "#64748b",
  tagline: "「上面说，你报的数字靠谱」",
  situation: "月度结算后，你收到一条消息：",
  dialogue: "投资方代表发来一条简短的微信：「看了你的月报，数字比较实在。继续。」没有什么特别的事，但你知道——在所有人都在注水的时候，这个评价很值钱。",
  choices: [
    {
      text: "继续如实汇报。",
      effects: { budget: 5, bossTrust: 1 },
      hidden: { honesty: 1 },
      result: "你回了个「收到」。预算多一点，信任多一点。"
    }
  ]
};
```

触发条件：honesty >= 7 && isMilestone && !narrationsUsed.includes("honesty_bonus") && random < 0.3
每局最多触发一次。

### 3.2 诚实分高时 qualityDebt 爆发概率降低

qualityDebt 爆发事件（如果未来实现"技术债到期"事件）的触发概率：

| honesty | 爆发事件权重修正 |
|---------|----------------|
| 7-10 | ×0.7 |
| 5-6 | ×1.0 |
| 3-4 | ×1.3 |
| 0-2 | ×1.5 |

叙事：你不诚实→习惯掩盖问题→问题积累→爆发更频繁。

---

## 四、hint 提示强化

### 4.1 现有 hint

目前只有 honestyHintShown（honesty < 3 时在 milestone 显示提示文案）。

### 4.2 新增 hint

```javascript
// handleChoice 中，isMilestone 时
if (isMilestone && prev.honesty < 5 && !prev.honestyMidHintShown) {
  newHonestyMidHintShown = true;
}
```

state 新增字段：`honestyMidHintShown: false`

显示文案：「你最近几次汇报的数字，和团队内部的数字有些对不上。上面暂时没问，但你知道这事。」

显示位置：与现有 honestyHintShown 同一位置（milestone 事件后、result 下方）。

---

## 五、数值影响推演

### 5.1 典型路径 A（从不诚实到代价）

```
开局：honesty=10, bossTrust=5
月1 milestone C1(展示版本)：honesty-1 → 9
月2 milestone C1(逐条解释)：honesty-1 → 8
月3 milestone C1(先开会)：honesty-1 → 7
月4 milestone C1(确认数字)：honesty-1 → 6
月5 milestone C1(接受全部修改)：honesty-1 → 5
→ 累计 5 次 milestone A，honesty 从 10 跌到 5

加上其他事件中 honesty-1 的选项（patch-23 约 15 个选项有 honesty:-1）
→ 完全不诚实路线：honesty 可能跌到 1-2

月5-6 时：
- bossTrust 月度额外 -2 × 2 月 = -4
- 信息失真 0.3，进度显示虚增 ~3%
- 负面事件权重 ×1.4
→ 迟滞惩罚开始发力：bossTrust 崩溃→kpiState=tight→审查更严→恶性循环
```

### 5.2 典型路径 B（诚实路线）

```
开局：honesty=10, bossTrust=5
月2 milestone C2(承认问题)：honesty+1 → 某次事件加 1
→ 偶尔选诚实选项：honesty 维持在 7-10

月3-4 时：
- bossTrust 月度无额外扣减
- 信息失真 = 0（你看到的就是真的）
- 负面事件权重 ×0.8
- 有概率触发 honesty_bonus（+5 budget, +1 bT）
→ 正面飞轮：诚实→信任→预算→稳定
```

---

## 六、实现提示词

1. **bossTrust 月度衰减**：在 handleChoice 中 isMilestone 判断块内，追加 honesty 驱动的 bossTrust 扣减。honesty<3 扣 2，honesty<5 扣 1，否则不扣。在月度结算中应用。

2. **getInfoDistortion 函数**：新增，返回 0/0.1/0.2/0.3。在 handleChoice 的进度计算处，若 distortion > 0，向 newProgress 追加虚报水分 `Math.round(distortion * 5)`，同时累加 `fakeProgress`。

3. **state 新增字段**：fakeProgress: 0, honestyMidHintShown: false

4. **fakeProgress 结算**：在最终结局判断处（progress >= 100 或 week > TOTAL_WEEKS），从 progress 中扣除 fakeProgress 后再判断结局。water_reveal 事件触发时也扣除当前 fakeProgress 并归零。

5. **pickEvent 诚实权重**：在 pickEvent 中根据 honesty 计算 honestyWeightMod，应用于 corp 类事件和 trust_decay 事件的权重。

6. **HONESTY_BONUS_EVENT**：新增事件对象。在 pickEvent 中 isMilestone 后检查触发条件。单选项事件，自动选择（或显示给玩家确认）。

7. **honestyMidHintShown**：honesty < 5 时首次 milestone 触发，显示提示文案。在 handleChoice 中设置 flag，在渲染中显示。

8. 初始 state 中追加 fakeProgress: 0, honestyMidHintShown: false。

**验证点：**
- [ ] honesty=2 时，每月 milestone 额外扣 bossTrust 2
- [ ] honesty=4 时，每月 milestone 额外扣 bossTrust 1
- [ ] honesty=8 时，每月 milestone 不额外扣 bossTrust
- [ ] honesty=2 时，进度显示虚增约 1-2%，fakeProgress 累计
- [ ] 最终结算时，progress 扣除 fakeProgress 后判断结局
- [ ] water_reveal 事件触发时扣除 fakeProgress
- [ ] honesty=8 时，corp 类事件权重 ×0.8
- [ ] honesty=2 时，corp 类事件权重 ×1.4
- [ ] honesty>=7 + milestone + random<0.3 → 触发「踏实」bonus
- [ ] 「踏实」bonus 每局最多一次
- [ ] honesty<5 首次 milestone → 显示中间 hint
- [ ] 完全不诚实路线（5次milestone全A）→ 月5-6 bossTrust 加速崩溃

---

## 七、本 patch 不实现

- qualityDebt 爆发事件（需要先设计"技术债到期"事件系统）
- 诚实分影响团队 morale（honesty→people 联动——待讨论）
- 诚实分 UI 可视化（玩家看不到具体数字，只能通过 hint 感知）
- fakeProgress 的细化——目前是固定虚增，未来可以改为"高进度事件虚增更多"

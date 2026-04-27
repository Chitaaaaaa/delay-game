# Patch 18 实现提示词

## 任务说明

请阅读以下两个文件，按 spec 修改游戏代码：

- 游戏主文件：`delay-game.jsx`（2000+ 行，React 单文件游戏）
- 功能规格：`patch-18-spec.md`

假设 Patch 01–17 已全部完成。本 patch 在 Patch 09 和 Patch 10 的基础上扩展。

---

## 实现步骤（按顺序完成）

### 步骤一：扩展 DIRECTIONS 枚举

在现有 `DIRECTIONS`（或等价对象）中，**新增**以下 11 个枚举，不删除原有 10 个：

```
ANIME / BATTLE_ROYALE / AUTO_CHESS / CHESS_CARD / IP_PORT /
SIM / METAVERSE / GLOBAL / MINI_GAME / LEGACY / PC_MMO
```

每个枚举对应的中文标签见 spec 第一节。

---

### 步骤二：替换 YEAR_DATA

**完整替换** Patch 10 的 YEAR_DATA 为 spec 第二节的 15 年数据（2012–2026，不含 2010）。

新结构新增字段：
- `catchphrase`：年代标语
- `representatives`：代表游戏（string[]）
- `mockedFlavor`：同行质疑事件台词
- `hotWeights`：可选，仅 2017 年有，控制 BATTLE_ROYALE 权重
- `specialEvents`：可选，string[]，年代专属事件 id
- `special`：可选，`"confused_year"`，仅 2026 年

---

### 步骤三：更新 buildDirectionPool 选池逻辑

按 spec 第三节实现 `buildDirectionPool(marketYear)`：

- 2026 特殊年（`year.special === "confused_year"`）返回 `null`
- hot 只有 ≤2 个时：pool = [...hot, mocked]
- hot 有 3 个时：pool = [hot[0], mocked, random(hot[1] or hot[2])]

---

### 步骤四：更新方向选择事件

月1 week2 的方向选择触发逻辑：

- 若 `buildDirectionPool` 返回 `null`（即2026年），**跳过方向选择，改为触发 `confused_year_strategy` 专属事件**（见步骤七）
- 否则正常展示 pool 中的3个方向作为选项

---

### 步骤五：更新 checkDirectionMatch 和门槛3

按 spec 第五节替换 Patch 09 的方向匹配门槛3：

```javascript
function checkDirectionMatch(gameDirection, marketYear) {
  const { hot, mocked } = YEAR_DATA[marketYear];
  if (gameDirection === hot[0]) return "primary";
  if (hot.slice(1).includes(gameDirection)) return "secondary";
  if (gameDirection === mocked) return "mocked";
  return "neutral";
}
```

结局门槛影响：
- `primary` → 进门槛4，阈值 45
- `secondary` → 进门槛4，阈值 35
- `neutral` → 进门槛4，阈值 45
- `mocked` → 触发「叫好不叫座」结局；**但若综合分 ≥ 70，改用「逆势突围」文案**（spec 第五节有完整文案）

2026 年不走门槛3，直接进门槛4。

---

### 步骤六：更新同行质疑事件为动态生成

按 spec 第六节，将同行质疑事件改为 `getMockedEvent(marketYear)` 函数动态生成，台词取自 `YEAR_DATA[marketYear].mockedFlavor`。

触发条件不变：月2-3，`gameDirection === YEAR_DATA[marketYear].mocked`，每局最多一次。

---

### 步骤七：新增四个年代专属事件

按 spec 第七节，新增以下四个事件：

#### 1. `confused_year_strategy`（2026专属）
- 月1 week2 触发，替代方向选择
- 3个选项 → gameDirection 分别设为 AI_NATIVE / LEGACY / MINI_GAME
- 详见 spec 第七节完整文案

#### 2. `capital_wave`（2020专属）
- 月2-4 随机触发一次，不绑定方向
- 选A/C 后向 scheduledEvents push `capital_pressure` 延迟事件（+6或+8周）
- 详见 spec

#### 3. `capital_pressure`（scheduledEvent，由2020触发）
- 选A 后向 scheduledEvents push `capital_direction_change`（+4周）
- 选C 后再次 push `capital_pressure`（+3周）
- 详见 spec

#### 4. `capital_direction_change`（scheduledEvent，由capital_pressure触发）
- 详见 spec

#### 5. `chess_card_jqk`（2012专属）
- 月1-2 之间，gameDirection === "CHESS_CARD" 时触发
- 详见 spec

#### 6. `auto_chess_window`（2019专属）
- 月3触发，gameDirection === "AUTO_CHESS" 时触发
- 详见 spec

以上事件注册方式：
- `confused_year_strategy`、`chess_card_jqk`、`auto_chess_window` 注册进事件池，触发条件用现有条件判断机制
- `capital_wave` 同上，注册进普通事件池
- `capital_pressure` / `capital_direction_change` 作为 scheduledEvent 推入 state.scheduledEvents，格式复用现有机制

---

### 步骤八：背景职能×方向解锁（占位实现）

本步骤只做**结构占位**，不实现具体内容：

- 在 buildDirectionPool 中预留 `getBackgroundUnlock(playerBackground, industryBackground, marketYear)` 调用位置
- 函数暂时返回 `null`（全部跳过）
- 完整逻辑留待内容填充阶段接入（spec 第八节）

---

## 注意事项

1. **不删除**现有 10 个 DIRECTION 枚举，只新增
2. **完整替换** YEAR_DATA，不是追加
3. MARKET_TREND_FLAVORS（Patch 16 新增）中尚未覆盖的新枚举（ANIME、BATTLE_ROYALE 等），**本 patch 不需要补**，Patch 16 映射表独立存在即可
4. `capital_wave` 只在 `marketYear === 2020` 时加入事件池，其他年份不出现
5. `chess_card_jqk` 只在 `marketYear === 2012` 时加入事件池，同理
6. `auto_chess_window` 只在 `marketYear === 2019` 时加入事件池，同理
7. 2026 年：无 mocked 判定，无方向选择，直接进门槛4

---

## 验证点

完成后请确认以下行为：

- [ ] 选 2025 年，方向选择事件出现 AI_NATIVE 和 LEGACY（无 hot[2]，pool 为2+mocked）
- [ ] 选 2026 年，月1 week2 触发的是"你要做什么？"而不是方向选择
- [ ] 选 2019+AUTO_CHESS，月3 触发窗口期事件
- [ ] 选 2020，月2-4 出现"资本来了"，选A后约8周出现"资本来问账了"
- [ ] mocked 方向通关且综合分 ≥ 70，结局文案是「逆势突围」版本
- [ ] DIRECTIONS 枚举包含全部 21 个方向

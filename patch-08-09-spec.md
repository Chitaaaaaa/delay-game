# Patch 08+09：人员管理系统 + 产品质量系统

---

## Patch 08：人员管理系统

### 数据结构

```typescript
interface TeamMember {
  id: string
  role: 'engineer' | 'designer' | 'producer' | 'qa' | 'other'
  seniority: 'veteran' | 'mid' | 'fresh'       // 可见
  source: 'initial' | 'campus' | 'social'       // 可见
  contribution: {                                // 半可见（只显示方向箭头，不显示数字）
    progressEfficiency: number   // 影响推进进度行动产出
    moraleBase: number           // 每周士气基线贡献
    budgetCoeff: number          // 影响预算消耗系数
  }
  hiddenType?: string            // 不可见，影响事件触发池（内容填充阶段定义，暂留字段）
}

// 游戏状态新增：teamSlots: TeamMember[]，上限6人
```

### 初始状态（由开局团队卡牌决定）

| 卡牌选择 | 初始slots | 初始效果 |
|---------|-----------|---------|
| 老团队 | 4人（全veteran） | 士气+15；每人moraleBase+5 |
| 新团队 | 2人（mid/fresh） | 士气-15磨合惩罚；前4周progressEfficiency×0.7 |
| 混搭 | 3人（2 veteran + 1 fresh） | 开局随机：60%普通，25%chemistry bonus（进度效率+10%），15%chemistry debuff（士气-5） |

### Slot数量 → 推进进度行动产出系数

不对玩家显示，静默生效：

```
≥4人：×1.0（正常）
3人：×0.85
2人：×0.65
1人：×0.4
0人：「推进核心进度」行动不可用（按钮置灰）
```

---

### 校招行动

- **出现条件**：第1-2月（week 1-8）的 planning 阶段限时出现，第3月起消失
- **AP成本**：1
- **流程**：
  1. 玩家点击「校招」按钮
  2. 弹出候选人面板，展示1-2名候选人（显示：role / seniority=fresh / 2-3个履历标签）
  3. 玩家选择「录用」或「跳过」
  4. 录用后加入 teamSlots
- **录用后效果**：该成员前6周 progressEfficiency×0.5（带人成本，静默生效）
- **候选人生成**：role 随机，hiddenType 加入时随机赋值（暂不触发效果，内容填充阶段接入）

### 社招行动

- **出现条件**：全程 planning 阶段可用
- **AP成本**：2
- **预算消耗**：-15（固定，在行动按钮上显示）
- **流程**：同校招，候选人 seniority 为 mid 或 veteran
- **隐患**：录用后有30%概率该成员 hiddenType = 'troublemaker'（静默标记，触发问题人员事件池，内容填充阶段接入）

---

### 清洗行动

#### 主动清洗（planning 阶段）

- **AP成本**：2
- **入口**：「清洗人员」按钮，全程可用
- **流程**：
  1. 点击后弹出当前 teamSlots 列表
  2. 每条显示：role / seniority / contribution 方向箭头（↑↓，不显示数字）
  3. 玩家选择目标，点击确认
  4. 结算（见下）

#### 被动清洗（event 阶段响应选项）

- **AP成本**：0（作为事件选项之一触发）
- **结算**：同主动清洗，但士气额外-5（公开冲突后遗症）

#### 共用结算逻辑

```
移除 teamSlots 中该成员
信任度 -1
士气 -10（被动清洗额外再 -5）
永久失去该成员的 contribution（progressEfficiency / moraleBase / budgetCoeff 全部归零）
```

---

## Patch 09：产品质量系统

### 质量债（qualityDebt）

- **类型**：隐藏属性，范围 0-100
- **初始值**：0
- **不在主 UI 常驻显示**（仅月底 milestone 时出现文案提示）

**游戏状态新增：`qualityDebt: number`**

#### 积累规则

| 触发行动/事件 | qualityDebt 变化 |
|-------------|----------------|
| 砍功能（行动） | +12 |
| 全员冲刺（行动） | +8 |
| 被动接受「人海战术」新成员 | +5 |
| 技术健康检查（行动） | -15 |
| 正常推进进度（无加班周） | -2（每周自然恢复） |

---

### 月底质量检查

每月 milestone 结算时触发，在结果文本段**之前**插入质量检查结果。

#### 检查逻辑

```
if qualityDebt >= 60:
    回扣进度 = Math.floor((qualityDebt - 50) * 0.3)
    progress -= 回扣进度
    qualityDebt -= 20
    展示【质量文案 A】

else if qualityDebt >= 30:
    展示【质量文案 B】（无数值惩罚）

else:
    无质量文案，正常 milestone 流程
```

#### 文案

**质量文案 A（debt ≥ 60，有进度回扣）：**
> 月度复盘。你们做的东西摆在那里，没有人说什么。但你注意到，其他组的人路过时会停一下——不是欣赏，是那种"啊，原来可以这样"的表情。你知道那个停顿意味着什么。进度表上，{回扣数值}%的工作需要返工。

**质量文案 B（debt 30-59，无惩罚）：**
> 有人在内部群里发了一条消息："我们的标准是这个吗？"没有人回复。

---

### 胜利条件重设计（门槛检查，替换原有单一判定）

按顺序检查，第一个命中的为最终结局：

```
1. progress < 100
   → 结局「项目夭折」
   文案：时间到了，或者钱没了，总之游戏没做完。
         你的试用期到此结束。

2. qualityDebt >= 80
   → 结局「差评如潮」
   文案：上线了。然后你开始看评论区。
         你关掉手机，决定先睡一觉。

3. 方向匹配度 = 低（暂时跳过，patch 10+ 实现年份系统后接入）

4. 综合分 < 阈值
   综合分 = morale×0.3 + bossTrust×10×0.3 - 预算损耗率×40
   阈值 = 45
   → 结局「中规中矩」
   文案：游戏上线了，活下来了。
         你觉得你可以再做一次，做得更好。
         但没有人问你。

5. 综合分 >= 45
   → 结局「大赚特赚」
   文案：你记得接这个项目时他们看你的眼神。
         现在不一样了。
```

> **注意**：门槛3（方向匹配度）现阶段跳过，直接从门槛2判断后进入门槛4。
> 年份系统（patch 10+）实现后在此插入。

---

## 新增游戏状态字段汇总

```javascript
// 在现有 gameState 基础上新增：
teamSlots: [],          // TeamMember[]
qualityDebt: 0,         // number, 0-100
gameDirection: null,    // string | null，月1-2锁定（patch 10+ 接入）
```

---

## 接入说明

- 校招/社招/清洗：接入现有 planning 阶段行动框架，同其他行动按钮逻辑
- 质量检查：接入现有 milestone 结算函数，在结果文本渲染前执行
- 胜利判定：替换现有 `checkVictory()` 或等效函数为门槛检查顺序逻辑
- Slot产出系数：在「推进核心进度」行动的进度计算处读取 `teamSlots.length`

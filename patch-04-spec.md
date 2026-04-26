# Patch 04 — 结果文本三段分离 + 心腹揭示矩阵更新

## 文件位置
`C:\Users\69032\Downloads\demo-pet\demo-producer\delay-game.jsx`

---

## 改动一：结果文本拆成三段独立渲染

### 问题
当前 `showResult` 阶段，心腹揭示文字和老板反应文字被拼接进 `lastResult` 字符串，导致引号嵌套混乱。

### 方案

**新增两个 state 字段：**
```js
const [lastConfidantReveal, setLastConfidantReveal] = useState("");
const [lastBossReaction, setLastBossReaction] = useState("");
```

**改动 handleChoice：**
- `setLastResult(choice.result)` 只存选项本身的结果文字，不拼接其他内容
- 心腹揭示文字单独存入 `setLastConfidantReveal(...)`
- 老板反应文字单独存入 `setLastBossReaction(...)`

**改动结果区域渲染（`showResult` 为 true 时）：**

```
┌──────────────────────────────────────┐
│ [lastResult]                          │  fontSize 13, color #bbb
│                                       │
│ 🤝 [lastConfidantReveal]              │  仅当非空时显示
│   fontSize 11, color #a78bfa          │  紫色，monospace
│   paddingTop 8, borderTop 1px #1a1a2e │
│                                       │
│ [lastBossReaction]                    │  仅当非空时显示
│   fontSize 10, color #444             │  深灰，环境叙事感
│   marginTop 6                         │
└──────────────────────────────────────┘
```

**nextEvent 时清空：**
```js
setLastConfidantReveal("");
setLastBossReaction("");
```

---

## 改动二：心腹揭示矩阵（5月 × 3类型 = 15条）

月度 milestone 事件处理选项C时，根据 `state.confidant.type` 和当前月份编号，从以下矩阵取对应文字存入 `lastConfidantReveal`：

| 月份 | emotional（人心） | technical（技术） | political（政治） |
|------|-----------------|-----------------|-----------------|
| 月1 立项 | 「大家跟着做，其实不知道方向是什么」 | 「那个原型昨晚才做，正式开发还没开始」 | 「美术老大和程序老大对方向理解完全不一样，没人敢说」 |
| 月2 MVP | 「有人觉得核心玩法不对，但没人敢提」 | 「十分钟顺畅是因为关了一半碰撞检测」 | 「总监上次说的方向和这次演示不是一套」 |
| 月3 闭环 | 「QA组有两个人已经开始找工作了」 | 「全流程跑通是靠手动跳过了三个报错」 | 「QA的KPI是多提BUG，程序有千行BUG率要求，两边目标对着干，问题单永远对不上」 |
| 月4 量产 | 「内容组的活越来越像流水线，几个核心策划开始只求过验收，不管好不好玩」 | 「60%里有大量外包资源，交付了不等于能用，技术整合还没开始」 | 「策划为了预算能过报低了，但美术对接的供应商可不会给咱们降价」 |
| 月5 验收 | 「两个核心成员私下说这个项目上线即死亡，不如趁早找工作」 | 「发行方空降了一个新领导，提的几个问题和我们这个项目根本毫无关联」 | 「发行方和老板谈了另一个版本的合作方案，没有通知制作人」 |


### 实现方式

建议用一个二维对象存储：

```js
const CONFIDANT_REVEALS = {
  1: { emotional: "...", technical: "...", political: "..." },
  2: { emotional: "...", technical: "...", political: "..." },
  // ...
};
```

取值：`CONFIDANT_REVEALS[currentMonth][state.confidant.type]`

`currentMonth` = `Math.ceil(state.week / 4)`，在 milestone 事件处理时计算。

---

## 不改的东西

- 心腹系统的获取/失去逻辑
- 月度 milestone 的 A/B/C 选项结构和数值效果
- 其他事件内容
- Patch 01 / 02 / 03 的改动成果

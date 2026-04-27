# Patch 08b：TeamSlot UI 补全

## 背景

Patch 08 的数据结构和行动逻辑已在代码中实现（teamSlots、校招/社招 apply 函数、getTeamProgressCoeff），但三件 UI 缺失导致玩家完全感知不到这个系统：

1. 校招/社招点击后无任何反馈，静默加人
2. 游戏界面没有团队成员展示
3. 清洗行动完全没有

---

## 一、招募反馈面板

### 触发时机

玩家点击「校招」或「社招」行动按钮后，**不立即执行 apply**，
改为先展示候选人信息，玩家确认后才结算。

### 展示内容

弹出一个内联卡片（不需要 modal，在行动区下方展开即可）：

```
🎓 校招候选人

  ┌─────────────────────────┐
  │ 程序员  ·  应届生        │
  │ 「算法竞赛参赛经历」      │
  │ 「实习半年」             │
  │                         │
  │  [录用]    [跳过]        │
  └─────────────────────────┘
```

字段说明：
- **role**：显示中文（engineer→程序员 / designer→设计师 / producer→制作人 / qa→测试 / other→其他）
- **seniority**：显示中文（veteran→老手 / mid→中级 / fresh→应届生）
- **履历标签**：从预设列表随机抽 2 条，纯显示，无机械效果

预设履历标签库（各 source 各取）：
```
campus: ["算法竞赛参赛经历", "实习半年", "设计学院优等生", "开源项目贡献者", "游戏爱好者"]
social: ["前大厂经历", "独立游戏开发者", "带过5人团队", "上线过3款产品", "擅长跨部门协作"]
```

### 交互

- 「录用」→ 执行原有 apply 逻辑，卡片收起，显示一行确认文案：「{role} 加入了团队。」
- 「跳过」→ 卡片收起，不消耗 AP，不加人

---

## 二、团队成员展示

### 位置

在 stat bar 区域下方，折叠展示（默认展开），标题行：「👥 团队 {n}/6」

### 展示格式

每个成员一行：

```
👥 团队 3/6
  🔨 程序员  老手   ↑↑
  🎨 设计师  中级   ↑—
  🆕 测试    应届生  ↓—
```

字段：emoji（按role）+ 职能 + 资历 + 进度贡献方向箭头

进度贡献箭头规则（不显示数字）：
```
progressEfficiency >= 1.0 → ↑↑
progressEfficiency >= 0.7 → ↑
progressEfficiency < 0.7  → ↓（新人带人期）
```

role emoji 映射：
```
engineer → 🔨
designer → 🎨
producer → 📋
qa       → 🔍
other    → 🧩
```

### 折叠状态

点击标题行可折叠/展开，折叠后只显示：「👥 团队 3/6」

---

## 三、清洗行动

### 加入 ACTIONS

```javascript
{ id: "layoff", emoji: "🚪", label: "清洗人员", ap: 2, always: false,
  desc: "移除一名成员  信任-1  士气-10",
  available: s => s.teamSlots.length > 0,
  apply: s => s   // 占位，实际结算在 UI 确认后执行
}
```

### 触发流程

点击「清洗人员」后，在行动区下方展开团队列表，每条显示：

```
  🔨 程序员  老手   ↑↑   [清洗]
  🎨 设计师  应届生  ↓    [清洗]
```

点击某人的「清洗」→ 弹出确认提示：「确认清洗这名成员？此操作不可逆。」

确认后执行结算：
```javascript
function resolveLayoff(memberId, state) {
  return {
    ...state,
    teamSlots: state.teamSlots.filter(m => m.id !== memberId),
    bossTrust: Math.max(0, state.bossTrust - 1),
    morale: Math.max(0, state.morale - 10),
    people: Math.max(0, state.people - 2),   // Patch 19 隐性积分
  };
}
```

结算后显示一行文案：「他离开了。没有人说什么。」

---

## 不改动

- 校招/社招的 apply 逻辑（随机生成成员的代码不变）
- getTeamProgressCoeff（进度系数计算不变）
- weeksJoined 带人成本逻辑（不变）

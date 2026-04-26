# Patch 13：箭头方向优化（只显示方向，不显示数量）

## 设计意图

保留信息不对称体验。玩家知道一个行动/选项会让某个数值变好或变坏，
但不知道具体变多少。只显示方向，不显示数字。

---

## 改动一：effectArrows 函数

**当前行为**：按数值大小重复箭头（+15 → ↑↑↑）

**修改为**：只返回单个方向符号

```javascript
// 改前
function effectArrows(netValue) {
  if (netValue === 0) return "—";
  const dir = netValue > 0 ? "↑" : "↓";
  return dir.repeat(Math.ceil(Math.abs(netValue) / 5));
}

// 改后
function effectArrows(netValue) {
  if (netValue === 0) return "—";
  return netValue > 0 ? "↑" : "↓";
}
```

---

## 改动二：colorDesc 函数

**当前行为**：解析描述字符串，将 `+3` 标绿、`-4` 标红，数字可见

**修改为**：将 `+数字` 替换为绿色 `↑`，将 `-数字` 替换为红色 `↓`，不显示数字

```javascript
// 改前
function colorDesc(desc) {
  return desc.split(/([\+\-]\d+)/).map((p, i) =>
    /^\+\d+/.test(p) ? <span key={i} style={{ color: "#4ade80" }}>{p}</span>
    : /^\-\d+/.test(p) ? <span key={i} style={{ color: "#f87171" }}>{p}</span>
    : <span key={i}>{p}</span>
  );
}

// 改后
function colorDesc(desc) {
  return desc.split(/([\+\-]\d+)/).map((p, i) =>
    /^\+\d+/.test(p) ? <span key={i} style={{ color: "#4ade80" }}>↑</span>
    : /^\-\d+/.test(p) ? <span key={i} style={{ color: "#f87171" }}>↓</span>
    : <span key={i}>{p}</span>
  );
}
```

效果示例：
- 改前：`进度+3  士气-4`
- 改后：`进度↑  士气↓`（+3变为绿色↑，-4变为红色↓）

---

## 改动三：EffectBadge 组件

**当前行为**：显示 `▲ 士气 10` / `▼ 预算 15`（方向+标签+数字）

**修改为**：只显示 `▲ 士气` / `▼ 预算`（方向+标签，去掉数字）

```javascript
// 改前
<span ...>
  {pos ? "▲" : "▼"} {label} {Math.abs(value)}
</span>

// 改后
<span ...>
  {pos ? "▲" : "▼"} {label}
</span>
```

---

## 不改动的内容

- 颜色系统（绿色正向 / 红色负向）
- 所有游戏逻辑和数值计算
- StatBar 的实际数值显示（进度条旁边的百分比数字保留，这是结果反馈不是预测）
- 事件结果文案里的叙事性数字（"进度回扣了X%"这类文案保留）

# Patch 27：进度满载提示

> 前置：Patch 01-26 已完成
> 问题：progress 到 100 后，胜利判定在 nextWeek() 里才触发，玩家看到进度条满但游戏继续，感觉像 bug
> 方向：不改判胜逻辑，改成主动告知玩家"差最后一步"，把延迟变成张力

---

## 一、设计

progress 到 100 不立即判胜是正确的——nextWeek() 里的判断顺序保证了 win 优先于 lose，逻辑安全。
需要改的只是 **UI 层的信息同步**：让玩家知道发生了什么，以及为什么还没结束。

两个展示位置叠加使用：

```
位置 A：结果文本区（一次性冲击）
  触发条件：showResult === true && state.progress >= 100
  位置：选项结果文字下方，独立一块
  效果：玩家在"推进度"那个选择的结果页第一次看到这条提示

位置 B：进度条下方常驻（持续提醒）
  触发条件：state.progress >= 100 && state.gamePhase === "playing"
  位置：进度条 StatBar 下方，monospace 小字
  效果：在后续 planning 阶段和事件阶段持续可见，直到游戏结束
```

---

## 二、文案

根据当前数值状态选择版本（按优先级从高到低匹配）：

```js
function getCompletionMessage(state) {
  if (state.morale < 30)
    return "进度到了。但团队……还撑得住最后一步吗？";
  if (state.budget < 20)
    return "进度到了。就差最后一步的钱了。";
  if (state.bossTrust <= 2)
    return "进度到了。就看上面最后怎么看你了。";
  return "进度已满。下周，游戏就可以上线了——如果没有意外的话。";
}
```

---

## 三、实现

### 3.1 位置 A：结果文本区

在 result 展示区（`showResult === true` 分支）末尾，`「下一位来访者」`按钮之前，添加：

```jsx
{state.progress >= 100 && (
  <div style={{
    marginTop: 12,
    padding: "10px 14px",
    background: "#0a1a0a",
    border: "1px solid #166534",
    borderRadius: 8,
    fontSize: 13,
    color: "#4ade80",
    fontFamily: "monospace",
    lineHeight: 1.7,
    animation: "fadeUp 0.5s ease both"
  }}>
    📦 {getCompletionMessage(state)}
  </div>
)}
```

### 3.2 位置 B：进度条下方常驻

在 `statsRow` 中 progress StatBar 之后（或 progressMomentum 提示下方），添加：

```jsx
{state.progress >= 100 && state.gamePhase === "playing" && (
  <div style={{
    fontSize: 11,
    fontFamily: "monospace",
    color: "#4ade80",
    marginTop: 3,
    opacity: 0.85
  }}>
    📦 进度已满，等待上线
  </div>
)}
```

位置 B 的文案固定为简短版，不做动态判断（进度条区域空间有限）。

### 3.3 `getCompletionMessage` 函数

在 EVENTS/ACTIONS 定义区域之外、组件之前添加此函数，供两处调用。

---

## 四、不改的内容

- `nextWeek()` 的胜利判定逻辑不动
- `gamePhase` 的设置位置不动
- 不新增 state 字段（不需要 `progressJustCompleted` 之类的标志位，直接读 `state.progress >= 100`）
- 不改任何事件或行动的 effects

---

## 五、验证点

- [ ] progress 到 100 后，result 页出现绿色提示框，文案根据士气/预算/信任动态选择
- [ ] 士气 < 30 时显示士气版文案
- [ ] 预算 < 20（士气正常）时显示预算版文案
- [ ] bossTrust ≤ 2（士气/预算正常）时显示信任版文案
- [ ] 其余情况显示默认版文案
- [ ] 常驻提示在 planning 阶段进度条下方可见
- [ ] 常驻提示在事件阶段进度条下方可见
- [ ] 胜利/失败画面出现后，两处提示均不再显示（gamePhase !== "playing"）
- [ ] progress 未满 100 时，两处均不显示

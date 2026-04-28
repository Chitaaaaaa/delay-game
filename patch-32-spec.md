# Patch 32：boss_talk 信任恢复

> 前置：Patch 01-31 已完成
> 问题：boss_talk 是游戏里唯一的高压对话事件，触发时 bossTrust 往往已经很低。
>       玩家通过对话「活下来」后，没有任何信任修复——bossTrust 依然处于危险区，
>       感觉像白熬了一关。
> 目标：诚实作答的选项给玩家一次「靠进度赢信任」的机会，形成正向循环。

---

## 一、设计

boss_talk 有 A/B/C 三个选项，对应三种态度：
- **A（如实说出处境）**：诚实，风险高，但老板可能重新审视你
- **B（展示当前进度亮点）**：务实，用数据说话
- **C（给出一个你未必能兑现的承诺）**：保守，回避风险，但没有加分

A、B 两项在「进度达到一定量」时额外给予信任恢复；C 不给。

---

## 二、实现

### 2.1 信任恢复公式

```js
// 在 handleChoice 中，boss_talk 且 outcome ∈ ["A","B"] 时执行
const trustRecovery = Math.min(3, Math.floor(prev.progress / 25));
newState.bossTrust = Math.min(10, newState.bossTrust + trustRecovery);
```

**恢复量对照：**

| progress | trustRecovery |
|----------|--------------|
| 0–24     | +0           |
| 25–49    | +1           |
| 50–74    | +2           |
| 75–100   | +3           |

### 2.2 结果文案追加

当 trustRecovery > 0 时，在原 result 文案末尾追加：

```
「你活下来了。老板重新打量了你一眼。进度说话，其他什么都没有。」
```

当 trustRecovery === 0（进度还不够）时，不追加文案。

### 2.3 实现位置

`handleChoice` 中 effects 处理完毕后：

```js
if (event?.id === "boss_talk" && (outcome === "A" || outcome === "B")) {
  const trustRecovery = Math.min(3, Math.floor(prev.progress / 25));
  newState.bossTrust = Math.min(10, newState.bossTrust + trustRecovery);
  if (trustRecovery > 0) {
    resultText = resultText + "\n\n「你活下来了。老板重新打量了你一眼。进度说话，其他什么都没有。」";
  }
}
```

---

## 三、不改的内容

- boss_talk 选项 C（承诺）不触发信任恢复
- boss_talk 的原始 effects（progress/morale/budget/bossTrust delta）不变
- boss_talk 的触发条件和叙事文案不变
- 信任恢复上限仍为 10

---

## 四、验证点

- [ ] boss_talk 选 A，progress=60 → bossTrust +2，追加文案
- [ ] boss_talk 选 B，progress=80 → bossTrust +3，追加文案
- [ ] boss_talk 选 A，progress=10 → bossTrust 无额外恢复，无追加文案
- [ ] boss_talk 选 C（任意 progress）→ 无额外信任恢复
- [ ] bossTrust 不超过上限 10

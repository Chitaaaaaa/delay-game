# Patch 30：项目人数动态化

> 前置：Patch 01-29 已完成
> 问题：「· 项目 X人」显示的是 DIRECTION_TEAM_SCALE 的常量，
>       清醒的人离职、股票绑架放人走等叙事事件不影响这个数字，
>       玩家看到"技术最强的人走了"但项目人数没变，叙事与数据脱节

---

## 一、现状

```jsx
// 当前：常量，不会变化
<span style={{ color: "#666" }}>
  · 项目 {DIRECTION_TEAM_SCALE[state.gameDirection].projectTeamSize}人
</span>
```

---

## 二、修改

### 2.1 新增 state 字段

```js
projectHeadcount: DIRECTION_TEAM_SCALE[gameDirection].projectTeamSize,
```

初始化时从 `DIRECTION_TEAM_SCALE` 读取，后续动态变化。

### 2.2 触发变化的事件

**减少人数（叙事离职）**

| 事件 | 触发条件 | 变化 |
|------|----------|------|
| `lucid_p2` | 玩家选 choice A（写推荐信，outcome="external"） | `projectHeadcount -= 1` |
| `stock_trap` | 玩家选 index 1（放他走，快速启动交接） | `projectHeadcount -= 1` |

**增加人数（招人）**

| 事件 | 触发条件 | 变化 |
|------|----------|------|
| `manpower` | action="large"（全部招进来） | `projectHeadcount += 3` |
| `manpower` | action="small"（只招 2 个关键岗位） | `projectHeadcount += 2` |
| `brooks_law` | index 0（大量招人） | `projectHeadcount += 3` |
| `brooks_law` | index 1（只招一个关键岗位） | `projectHeadcount += 1` |

> 注：hire_reveal 不额外加，增加已在 manpower/brooks_law 触发时计入。

### 2.3 下限保护

```js
projectHeadcount = Math.max(1, projectHeadcount);
```

不允许降到 0 以下，1 是最低显示值。

### 2.4 显示替换

```jsx
// 改为：
<span style={{ color: "#666" }}>
  · 项目 {state.projectHeadcount}人
</span>
```

### 2.5 实现位置

- 减少：在 `handleChoice` 中，识别 event.id + choice 后，追加 `projectHeadcount -= 1`
- 增加：与 patch-28 中 manpower/brooks_law 追加 hire_reveal 的代码块放在一起，同时执行

---

## 三、不改的内容

- `DIRECTION_TEAM_SCALE` 本身不变，仍作为初始值来源
- `projectTeamSize` 字段在 `DIRECTION_TEAM_SCALE` 中保留（`getTeamShortageEvent` 等函数还在用）
- teamSlots（核心管理层展示）不受影响
- 离职叙事文案（`LUCID_OUTRO` 等）不变

---

## 四、验证点

- [ ] 游戏开始时，`· 项目 X人` 与 `DIRECTION_TEAM_SCALE.projectTeamSize` 一致
- [ ] lucid_p2 选"写，祝你顺利"后，数字减 1
- [ ] lucid_p2 选其他选项后，数字不变
- [ ] stock_trap 选"放他走"后，数字减 1
- [ ] stock_trap 选其他选项后，数字不变
- [ ] manpower 选"全部招进来"后，数字加 3
- [ ] manpower 选"只招 2 个关键岗位"后，数字加 2
- [ ] brooks_law 大量招人后，数字加 3
- [ ] brooks_law 只招一个关键岗位后，数字加 1
- [ ] 数字最低显示 1，不会出现 0 或负数

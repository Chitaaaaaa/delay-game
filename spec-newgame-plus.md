# Spec：多周目（New Game+）

> 玩家完成一局后可选择「开启第二局」，带着历史进入下一轮。
> 叙事身份从"前司机新人"变为"有过项目的制作人"。

---

## 一、流程变更

### 1.1 结局画面新增按钮

所有结局画面的「再来一局」旁边，增加第二个按钮：

| 结局 | 按钮文案 |
|------|---------|
| legendary / excellent | `开启第二局 →` |
| profitable / average / counter_win | `开启第二局 →` |
| bad_release / lose | `带着遗憾继续 →` |

「再来一局」保持原逻辑（完全重置）。新按钮进入 NG+ 流程。

### 1.2 appPhase 新增值

```
"intro" | "cards" | "onboarding" | "game"        ← 周目1（不变）
"ng_plus" | "ng_year" | "ng_legacy" | "cards" | "game"  ← 周目2
```

注：周目2 的 `"cards"` 复用现有选卡流程，但跳过 `"onboarding"`（直接进游戏）。

---

## 二、Legacy 数据

点击「开启第二局」时，在进入 `"ng_plus"` 前，从当前 state 提取并保存到 `legacyData`（React useState）：

```javascript
{
  prevResult: state.gamePhase,          // 上局结局
  prevYear: state.marketYear,           // 上局年份
  prevDirection: state.gameDirection,   // 上局方向（可能为 null）
  prevPeople: state.people,             // 上局人情分
  prevHonesty: state.honesty,
  prevQuality: state.quality,
  prevJudgment: state.judgment,
  prevGrit: state.grit,
  legacyMembers: assignLegacyTeam(state.people),  // 见第四节
}
```

---

## 三、Tom 开场屏（ng_plus，1屏）

根据 `prevResult` 选择 Tom 的台词，其余结构与周目1 onboarding 一致（monospace，暗底，居中）：

```
第二个项目
────────────────────────

Tom 在同一个前台。

还是没有站起来。

[台词]

「老板让你自己选
  下一个项目的窗口。」

「哪年？」

                  [继续 →]
```

台词对照：

| prevResult | Tom 台词 |
|-----------|---------|
| legendary | 「做到了。」 |
| excellent | 「做到了。」 |
| profitable / average | 「做完了。」 |
| counter_win | 「做完了。情况特殊。」 |
| bad_release | 「上线了。上面不太满意。」 |
| lose | 「上次的事老板知道。他说，再给你一次。」 |

---

## 四、年份选择屏（ng_year，1屏）

列出所有可用年份，每行显示年份 + catchphrase。上一局年份标注「上一局 · 方向名」。

```
────────────────────────
你面前有一份行业年鉴。
Tom 没有说话，在等你。
────────────────────────

  [2012]  页转手是捷径，月入千万不是梦
  [2013]  2013是卡牌年，无卡牌不手游
  [2014]  买量时代，流量为王
   ···
  [2026]  AI重塑行业，没有人知道规则
          ↑ 上一局 · 放置挂机      ← prevDirection 存在时显示

────────────────────────
选中一行后，显示该年热门方向，然后出现 [确认，就这年] 按钮
```

选中某年后展示：
```
  热门：卡牌 · 休闲轻度
  你知道这一年能做什么。
```

确认后进入下一屏（或跳转 `"ng_legacy"`）。

---

## 五、旧队员屏（ng_legacy，条件触发）

### 5.1 触发条件

| prevPeople | 跟随人数 | 是否显示此屏 |
|-----------|---------|------------|
| ≥ 7 | 2人 | 是 |
| 4–6 | 1人 | 是 |
| < 4 | 0人 | 跳过，直接进选卡 |

### 5.2 名字池

```javascript
const LEGACY_NAME_POOL = {
  engineer: ["小陈", "老李", "阿峰", "大勇", "小周"],
  designer: ["阿雅", "小桃", "晓敏", "李晴", "阿杰"],
};
```

### 5.3 assignLegacyTeam 逻辑

```javascript
function assignLegacyTeam(people) {
  if (people < 4) return [];
  const eng = randomFrom(LEGACY_NAME_POOL.engineer);
  if (people >= 7) {
    const des = randomFrom(LEGACY_NAME_POOL.designer);
    return [
      { name: eng, role: "engineer", seniority: "mid", legacy: true },
      { name: des, role: "designer", seniority: "mid", legacy: true },
    ];
  }
  return [{ name: eng, role: "engineer", seniority: "mid", legacy: true }];
}
```

### 5.4 屏幕文案

1人跟随：
```
────────────────────────

你打开手机，有消息在等你。

  [小陈]（程序）：
  「听说你要开新项目，
    算我一个。」

你有人了。
他记得你怎么做事。

                  [继续 →]
```

2人跟随：
```
────────────────────────

你打开手机，有两条消息在等你。

  [小陈]（程序）：
  「听说你要开新项目，
    算我一个。」

  [阿雅]（设计）：
  「我也是。」

你有人了。
他们记得你怎么做事。

                  [继续 →]
```

---

## 六、周目2 初始状态修改

在 `buildInitialState` 执行完选卡逻辑之后，若存在 `legacyData`，额外追加以下修改：

### 6.1 marketYear

使用玩家在 ng_year 屏选择的年份，而非随机。

### 6.2 bossTrust 初始值

| prevResult | bossTrust 初始范围 |
|-----------|-----------------|
| legendary / excellent | `Math.floor(Math.random() * 3) + 6`（6-8） |
| profitable / average / counter_win | `Math.floor(Math.random() * 3) + 5`（5-7） |
| bad_release / lose | `Math.floor(Math.random() * 3) + 3`（3-5） |

### 6.3 隐性积分初始加成

上一局各维度 ÷ 10，取整作为本局起始加成（最终值不超过 10）：

```javascript
honesty:  Math.min(10, 10 + Math.floor(legacyData.prevHonesty / 10)),
// 即：上局 8分 → +0；上局 10分 → +1（满分才有加成，门槛高）
```

实际上这意味着只有满分才有 +1，是一个很轻的 legacy 系统，不影响平衡。

### 6.4 旧队员加入 teamSlots

将 `legacyData.legacyMembers` 直接追加进初始 `teamSlots`，contribution 系数使用 `mid` 标准，额外加 `legacy: true` flag（供后续叙事事件使用）。

---

## 七、跳过 onboarding

周目2 的 `"cards"` 完成后，`handleCardNext` 的最后一步改为：

```javascript
if (isNewGamePlus) {
  // 跳过 onboarding，直接进游戏
  setState(initState);
  setAppPhase("game");
  setEvent(pickEvent(initState));
} else {
  setAppPhase("onboarding");
}
```

---

## 八、验证点

- [ ] 结局画面出现第二个按钮，文案按结局类型区分
- [ ] 「再来一局」仍然走原有完全重置流程
- [ ] ng_plus → ng_year → ng_legacy（条件）→ cards → game 流程顺序正确
- [ ] Tom 台词随 prevResult 正确切换
- [ ] 年份列表展示所有年份，上一局年份标注方向
- [ ] 选年份后展示该年热门方向
- [ ] people ≥ 7 → 2人跟随，4-6 → 1人，< 4 → 跳过旧队员屏
- [ ] 旧队员名字从名字池随机，不重复
- [ ] 周目2 bossTrust 初始值范围符合规则
- [ ] 旧队员出现在初始 teamSlots 中
- [ ] 周目2 跳过 onboarding，直接选完卡进游戏
- [ ] 周目2 进行中，marketYear 为玩家所选而非随机

---

## 九、开发提示词

请阅读以下两个文件，按 spec 实现多周目功能：

- 游戏主文件：`delay-game.jsx`
- 功能规格：`spec-newgame-plus.md`

这是一个较大的功能，请严格按顺序完成，每步验证后再继续：

1. 新增 `legacyData` state 和 `assignLegacyTeam` 函数
2. 结局画面新增第二个按钮，点击后保存 legacyData 并进入 `"ng_plus"` phase
3. 实现 `NgPlusScreen`（Tom 开场）、`NgYearScreen`（年份选择）、`NgLegacyScreen`（旧队员）三个组件
4. 在 appPhase 渲染分支中接入三个新组件
5. 修改 `buildInitialState` 接受可选 `legacyData` 参数，据此修改 bossTrust / marketYear / teamSlots / 隐性积分
6. `handleCardNext` 根据 `isNewGamePlus` 决定跳过 onboarding

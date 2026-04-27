# Patch 14：数值平衡修复（qualityDebt + bossTrust + 等价选项）

## 问题

1. 文案说有后患但 qualityDebt 没挂上去，玩家学会"警告是装饰"
2. 对上诚实/欺骗没有 bossTrust 代价，信任度系统悬空
3. 幻想家事件B选项净值最优，变成识别答案而不是做选择

---

## 修复一：补 qualityDebt

在对应选项的 effects 里新增 qualityDebt 字段。

### 空中楼阁（id: castle）→ 选A「全员停下来做Demo」
```
effects 新增：qualityDebt: +20
```
result 文案不变（"核心问题被埋进去，以后会爆的"——现在真的会爆了）

### 屎山（id: legacy）→ 选C「先上线，后续版本再还债」
```
effects 新增：qualityDebt: +25
```

### 进度泡沫（id: water_reveal）→ 选B「先稳住，内部消化」
```
effects 新增：qualityDebt: +15
```

### 完美主义（id: perfectionist）→ 选C「先上线，后续版本再说」
```
effects 新增：qualityDebt: +10
```

### 幻想家（id: dreamer）→ 选A「好主意！加进去！」
```
effects 新增：qualityDebt: +8
```

---

## 修复二：补 bossTrust（含延迟机制）

**即时生效：**

### 进度泡沫（id: water_reveal）→ 选A「召集团队重新对齐真实进度」
```
effects 新增：bossTrust: +1
```
逻辑：如实汇报，上面知道你诚实

### KPI施压（id: kpi_review）→ 选B「如实分析风险，提出可达目标」
```
effects 新增：bossTrust: +1
```

**延迟生效（scheduledEvent，N周后触发）：**

### 进度泡沫（id: water_reveal）→ 选B「先稳住，内部消化」
```
选择后，向 scheduledEvents 追加：
{
  week: currentWeek + 6,
  eventId: "trust_decay_hidden_progress",
  text: "上面不知道从哪里听说了一些情况。你在某次会议上注意到他的眼神变了一下。",
  effects: { bossTrust: -1 }
}
```

### KPI施压（id: kpi_review）→ 选A「拍胸脯保证，完不成自罚」
```
选择后，向 scheduledEvents 追加：
{
  week: currentWeek + 4,
  eventId: "trust_decay_promise_broken",
  text: "上个月的承诺，他记着呢。",
  effects: { bossTrust: -1 }
}
```
注意：仅当该周进度增量未达目标时触发（在 scheduledEvent 结算时检查）

---

## 修复三：打破幻想家等价选项

### 幻想家（id: dreamer）→ 选B「先写进愿望清单」

当前 effects: `{ progress: 0, morale: -3, budget: +5 }`（净值最优，明显正确答案）

修改后 effects:
```
{ progress: 0, morale: -3, budget: +5, bossTrust: -1 }
```

逻辑：愿望清单是拖延战术，幻想家感受到了被敷衍，
      后续他和上面的关系会让老板听到一些"制作人不支持创新"的声音。

result 文案调整（在现有文案后补一句）：
> 「幻想家有点失落。项目保住了，预算还省了点。他离开时没有说再见。」

---

## 接入说明

- qualityDebt 字段直接加入对应选项的 effects 对象，与现有 progress/morale/budget 同级
- bossTrust 即时效果同上
- scheduledEvent 延迟效果：在选项结算时 push 到 state.scheduledEvents，
  现有 scheduledEvent 处理逻辑已支持，复用即可
- 延迟 bossTrust 事件触发时仅显示文案 + 扣分，无选项（轻量提示）

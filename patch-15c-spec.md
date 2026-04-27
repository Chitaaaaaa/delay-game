# Patch 15c：跨行业背景事件专属第四选项

> 前置：patch-15b-spec.md（行动系数已接入，industryBackground 字段已有值）
> 本 spec 实现地产/影视/区块链三个背景在对应事件中解锁的第四选项

---

## 触发机制

事件渲染选项时，检查 `state.industryBackground`，若命中则在现有选项末尾追加第四选项。
第四选项带小标签「[背景]」，与普通选项视觉上有轻微区分（颜色或边框略不同即可）。

---

## 一、地产（realestate）

### 触发事件：bet_deal / stock_trap / capital_wave

**bet_deal（对赌协议）第四选项**
```javascript
{
  text: "重新谈条款",
  tag: "背景",
  effects: { budget: 5, bossTrust: -1 },
  result: "你在另一个行业见过更苛刻的合同。你拿出笔，在对方的条款上划了几道。他沉默了一会儿，点了头。你不确定他是真的接受了，还是在等。"
}
```

**stock_trap（股票绑架）第四选项**
```javascript
{
  text: "我们谈的不是股票，是退出机制",
  tag: "背景",
  effects: { budget: 8, qualityDebt: 5 },
  result: "你把对话从激励转移到了结构上。他没想到你懂这个。条款重签了——但你知道，你用项目质量换了谈判空间。"
}
```

**capital_wave（资本浪潮，2020专属）第四选项**
```javascript
{
  text: "我们来谈一个对双方都合理的结构",
  tag: "背景",
  effects: { budget: 12, bossTrust: 1 },
  result: "你把融资谈成了一次甲方合作，而不是投资人介入。他很满意——你用的是他的语言。"
}
```

---

## 二、影视（film）

### 触发事件：dreamer / castle

**dreamer（幻想家）第四选项**
```javascript
{
  text: "先做一个概念验证，最低成本",
  tag: "背景",
  effects: { morale: 5, budget: -5, qualityDebt: -3 },
  result: "你在影视圈学会了一件事：再大的想法，先拍个三分钟的概念片。他眼睛亮了。你用最小的投入，给了他一个出口。"
}
```

**castle（空中楼阁）第四选项**
```javascript
{
  text: "我们做一个垂直切片，证明这个方向能跑",
  tag: "背景",
  effects: { progress: -5, morale: 8, qualityDebt: -5 },
  result: "这是影视圈的老方法：先做最难的那一段，证明整体可行。团队打起精神来了——他们喜欢有人知道自己在干什么。"
}
```

---

## 三、区块链（blockchain）

### 触发事件：bet_deal / stock_trap / capital_wave

**bet_deal（对赌协议）第四选项**
```javascript
{
  text: "重新定义这个项目的价值叙事",
  tag: "背景",
  effects: { budget: 12, bossTrust: 1, qualityDebt: 8 },
  result: "你讲了一个更大的故事——用户规模、生态位、长线价值。他听进去了。钱批下来了，预期也被你推高了。你自己也知道，这个故事要靠后面的数据撑。"
}
```

**stock_trap（股票绑架）第四选项**
```javascript
{
  text: "把这个包装成一次战略布局",
  tag: "背景",
  effects: { budget: 10, morale: -5 },
  result: "你给这个局面加了一层框架，让它听起来像主动选择而不是被动接受。团队不太信，但老板满意了。"
}
```

**capital_wave（资本浪潮，2020专属）第四选项**
```javascript
{
  text: "给他讲一个Web3没讲完的故事",
  tag: "背景",
  effects: { budget: 15, bossTrust: 1, qualityDebt: 10 },
  result: "你太熟悉这套话术了。他的眼睛里有你认识的那种光。钱来了，期望也来了。你在心里算了一下，后面的数据要多好看才能撑住这个故事。"
}
```

---

## 注意事项

- 地产和区块链在相同事件上均有第四选项，但效果逻辑不同：地产是「谈出实际利益，代价小」，区块链是「话术换更多资源，但埋更多技术债」
- capital_wave 是 2020 年专属事件（patch-18），仅当 `state.marketYear === 2020` 时存在，第四选项跟随事件存在即可，无需额外年份判断
- 第四选项的 qualityDebt 变化同样受教培背景的 ×1.1 系数影响（patch-15b 已实现）

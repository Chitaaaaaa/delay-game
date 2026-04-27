# Patch 16：market_trend 事件接入 marketYear

## 问题

market_trend 事件当前 dialogue 硬编码为《极寒幸存者》生存建造类，
与 marketYear 系统完全脱钩，任何年份都出现同一段台词。

## 修改方案

新增 `MARKET_TREND_FLAVORS` 映射表，按热门方向生成动态对话。
事件触发时读取 `state.marketYear` → `YEAR_DATA[marketYear].hot[0]` → 查表生成台词。

---

## 新增映射表

在 YEAR_DATA 附近新增（不替换 YEAR_DATA）：

```javascript
const MARKET_TREND_FLAVORS = {
  CASUAL: {
    gameName: "《萌萌消消乐》",
    genre: "休闲消除",
    quote: "月流水破亿！休闲游戏门槛低、用户广，我们能不能出个轻量版本顺带收割一波？",
  },
  CARD: {
    gameName: "《神将传说》",
    genre: "卡牌抽卡",
    quote: "你看这个SSR保底设计，太聪明了！我们的抽卡系统能不能也搞一套？月活直接翻。",
  },
  SLG: {
    gameName: "《列国征途》",
    genre: "SLG策略",
    quote: "出海SLG现在就是印钞机！我们的玩法能不能加个地图争霸，全球同服？",
  },
  ARPG: {
    gameName: "《天命战神》",
    genre: "动作RPG",
    quote: "端转手这条路走通了！我们的战斗系统能不能做出点打击感？就这一点。",
  },
  MOBA: {
    gameName: "《英魂之刃》",
    genre: "MOBA竞技",
    quote: "MOBA手游现在最热！我们能不能加个5v5模式进去？哪怕是个小地图也行。",
  },
  IDLE: {
    gameName: "《无尽挂机》",
    genre: "放置挂机",
    quote: "挂机游戏留存率超高！我们能不能加个离线收益系统？开发量不大吧？",
  },
  OPENWORLD: {
    gameName: "《苍穹纪元》",
    genre: "开放世界",
    quote: "开放世界现在是标配！我们的地图能不能做大一点，加个探索系统？",
  },
  ROMANCE: {
    gameName: "《与你相遇》",
    genre: "女性向养成",
    quote: "女性向蓝海！我们能不能加几个NPC好感度系统，女性用户你得要啊。",
  },
  PARTY: {
    gameName: "《欢乐大派对》",
    genre: "派对竞技",
    quote: "UGC起来了！我们能不能做个联机模式搞点社交裂变，就像蛋仔那样？",
  },
  AI_NATIVE: {
    gameName: "《AI纪元》",
    genre: "AI原生",
    quote: "AI生成内容这个方向太厉害了！我们的NPC能不能接个大模型进去？现在不做就晚了。",
  },
};
```

---

## market_trend 事件改造

将现有静态事件对象改为**函数调用**，在事件触发时动态生成。

### 改前（静态）
```javascript
{
  id: "market_trend",
  ...
  dialogue: "《极寒幸存者》这周月流水破亿！生存建造类型现在最热！...",
  ...
}
```

### 改后（动态生成）

在事件抽取/触发逻辑中，当 eventId === "market_trend" 时，执行：

```javascript
function getMarketTrendEvent(marketYear) {
  const yearData = YEAR_DATA[marketYear];
  const hotDirection = yearData ? yearData.hot[0] : "CASUAL";
  const flavor = MARKET_TREND_FLAVORS[hotDirection] || MARKET_TREND_FLAVORS["CASUAL"];

  return {
    id: "market_trend",
    name: "跟风热",
    emoji: "🌊",
    color: "#06b6d4",
    tagline: `「${flavor.gameName}这周爆了，我们要跟吗？」`,
    situation: "老板转发了一篇爆款分析文章，把你拉进了一个临时会议：",
    dialogue: `${flavor.gameName}这周数据太好看了！${flavor.genre}现在最热！${flavor.quote}`,
    choices: [
      {
        text: "全力融入，方向转型",
        effects: { progress: -9, morale: 5, budget: -10 },
        result: "兴奋持续了三天。团队发现转型意味着三个月白干。",
      },
      {
        text: `表面融入，加个「${flavor.genre}探索模式」`,
        effects: { progress: -4, morale: -3, budget: -5 },
        result: "做出了一个四不像。玩家不买账，老板也不满意。",
      },
      {
        text: "礼貌拒绝，坚守核心方向",
        effects: { progress: 1, morale: -8, budget: 0 },
        result: "老板有点不开心。但项目没乱。六个月后那个热点凉了。",
      },
    ],
  };
}
```

### 调用方式

在现有事件触发逻辑中，将原本直接使用 `market_trend` 事件对象的地方改为：

```javascript
// 改前
const event = EVENTS.find(e => e.id === eventId);

// 改后（仅对 market_trend 特殊处理）
const event = eventId === "market_trend"
  ? getMarketTrendEvent(state.marketYear)
  : EVENTS.find(e => e.id === eventId);
```

---

## 接入说明

- 仅改 market_trend 一个事件，其他事件不动
- MARKET_TREND_FLAVORS 和 getMarketTrendEvent 放在 YEAR_DATA 同一区域
- 选项文案中的「表面融入」选项 text 动态插入当年 genre，其余选项文案不变
- effects 数值不变

import { useState, useEffect, useCallback } from "react";

const TOTAL_WEEKS = 24;
const BASE_PROGRESS = 3;

function weekDisplay(week) {
  const month = Math.ceil(week / 4);
  const weekOfMonth = ((week - 1) % 4) + 1;
  return { month, weekOfMonth, label: `第${month}月 第${weekOfMonth}周` };
}

// ---- work mode -------------------------------------------------------------

const WORK_MODES = {
  normal:   { label: "正常",  emoji: "🕐", ap: 5, progressBonus: 0, budgetCost: 0 },
  overtime: { label: "加班",  emoji: "⏰", ap: 6, progressBonus: 1, budgetCost: 4 },
  extreme:  { label: "极限",  emoji: "🔥", ap: 7, progressBonus: 2, budgetCost: 7 },
};

function calcPiePenalty(mode, pieCount, progress) {
  const base = mode === "overtime" ? 5 : 8;
  const cumMult = Math.pow(1.8, pieCount);
  const pressMult = progress >= 75 ? 0.7 : progress >= 50 ? 1.0 : progress >= 30 ? 1.5 : 2.0;
  return Math.round(base * cumMult * pressMult);
}

// ---- opening card groups ---------------------------------------------------

const CARD_GROUPS = [
  {
    title: "这家公司是……",
    cards: [
      { id: "big",   emoji: "🏢", label: "大厂",   reveal: "预算充裕+30，但大公司病如影随形，士气-10",   init: s => ({ ...s, budget: Math.min(130, s.budget + 30), morale: Math.max(10, s.morale - 10) }) },
      { id: "mid",   emoji: "🏬", label: "中型公司", reveal: "一切正常，平衡起点",                        init: s => s },
      { id: "small", emoji: "🏠", label: "小厂",   reveal: "预算紧张-30，但行动效率更高，每周进度+1",      init: s => ({ ...s, budget: Math.max(20, s.budget - 30), progressBonus: s.progressBonus + 1 }) },
    ]
  },
  {
    title: "你接手的项目……",
    cards: [
      { id: "new",      emoji: "🌱", label: "全新立项", reveal: "从零开始，一张白纸",                          init: s => s },
      { id: "handover", emoji: "🔄", label: "中途接盘", reveal: "进度+25，但前任留下了一些……礼物",            init: s => ({ ...s, progress: Math.min(40, s.progress + 25) }) },
      { id: "zombie",   emoji: "💀", label: "秽土转生", reveal: "表面进度+35……等等，这进度是真实的吗？",       init: s => ({ ...s, progress: Math.min(50, s.progress + 35), pendingEvents: ["zombie_reveal"] }) },
    ]
  },
  {
    title: "你的团队……",
    cards: [
      { id: "veteran", emoji: "👥", label: "老团队", reveal: "士气+15，经验足，但技术债也多",       init: s => ({ ...s, morale: Math.min(100, s.morale + 15) }) },
      { id: "fresh",   emoji: "🆕", label: "新团队", reveal: "士气-15，磨合期效率打折",             init: s => ({ ...s, morale: Math.max(10, s.morale - 15) }) },
      { id: "mixed",   emoji: "🎲", label: "混搭",   reveal: "士气随机波动，化学反应未知",           init: s => ({ ...s, morale: Math.max(10, Math.min(95, s.morale + (Math.random() < 0.5 ? 12 : -8))) }) },
    ]
  },
  {
    title: "你上一份工作是……",
    cards: [
      { id: "bg_designer",  emoji: "🎮", label: "策划出身",  reveal: "每周基础进度+1，熟悉开发节奏",          init: s => ({ ...s, progressBonus: s.progressBonus + 1 }) },
      { id: "bg_engineer",  emoji: "💻", label: "程序出身",  reveal: "每周AP+1，技术直觉好，沟通效率高",      init: s => ({ ...s, apBonusPerWeek: (s.apBonusPerWeek||0) + 1 }) },
      { id: "bg_artist",    emoji: "🎨", label: "美术出身",  reveal: "初始士气+10，对视觉方案有品味",          init: s => ({ ...s, morale: Math.min(100, s.morale + 10) }) },
      { id: "bg_pm",        emoji: "📊", label: "PM出身",    reveal: "预算+15，向上管理有一套",               init: s => ({ ...s, budget: Math.min(130, s.budget + 15) }) },
      { id: "bg_outsider",  emoji: "🏦", label: "跨行业",    reveal: "预算+20，但团队对你天然怀疑，士气-10",  init: s => ({ ...s, budget: Math.min(130, s.budget + 20), morale: Math.max(10, s.morale - 10) }) },
    ]
  },
];

function buildInitialState(pickedCards) {
  let s = { week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false };
  for (const card of pickedCards) s = card.init(s);
  return s;
}

// ---- weekly actions --------------------------------------------------------

const ACTIONS = [
  { id: "push",    emoji: "🔨", label: "冲进度",   ap: 1, desc: "进度+5  士气-4",        always: true,
    available: () => true,
    apply: s => ({ ...s, progress: Math.min(100, s.progress + 5), morale: Math.max(0, s.morale - 4) }) },
  { id: "care",    emoji: "💬", label: "团队关怀",  ap: 1, desc: "士气+10",              always: true,
    available: () => true,
    apply: s => ({ ...s, morale: Math.min(100, s.morale + 10) }) },
  { id: "comfort", emoji: "🆘", label: "危机安抚",  ap: 2, desc: "士气+25（士气<35时）",   always: false,
    available: s => s.morale < 35,
    apply: s => ({ ...s, morale: Math.min(100, s.morale + 25) }) },
  { id: "finance", emoji: "💸", label: "紧急融资",  ap: 3, desc: "预算+18~32（预算<25时）", always: false,
    available: s => s.budget < 25,
    apply: s => { const gain = 18 + Math.floor(Math.random() * 15); const hit = Math.random() < 0.4; return { ...s, budget: Math.min(100, s.budget + gain), morale: hit ? Math.max(0, s.morale - 10) : s.morale }; } },
  { id: "freeze",  emoji: "🔒", label: "需求冻结",  ap: 3, desc: "进度+8  士气-5（第3-4月，一次性）", always: false,
    available: (s, ctx) => s.week >= 9 && s.week <= 16 && !ctx.freezeDone,
    apply: s => ({ ...s, progress: Math.min(100, s.progress + 8), morale: Math.max(0, s.morale - 5) }) },
  { id: "cut",     emoji: "✂️", label: "砍功能",    ap: 1, desc: "进度+12  士气-10  预算+5（第5-6月）", always: false,
    available: s => s.week >= 17,
    apply: s => ({ ...s, progress: Math.min(100, s.progress + 12), morale: Math.max(0, s.morale - 10), budget: Math.min(100, s.budget + 5) }) },
  { id: "sprint",  emoji: "🚀", label: "全员冲刺",  ap: 2, desc: "进度+18  士气-15（第5-6月）", always: false,
    available: s => s.week >= 17,
    apply: s => ({ ...s, progress: Math.min(100, s.progress + 18), morale: Math.max(0, s.morale - 15) }) },
  { id: "verify", emoji: "🔎", label: "深入验收", ap: 2, desc: "解锁本月 milestone B 选项（看原始 build）", always: false,
    available: (s, ctx) => ctx.isMonthEnd && !s.verifyUsedThisMonth,
    apply: s => ({ ...s, verifyUsedThisMonth: true }) },
];

// ---- events ----------------------------------------------------------------

// ---- milestone helpers -----------------------------------------------------

const BOSS_OK = "「老板那边收到了你的月度汇报。他回复了一个大拇指。」";
const BOSS_NG = "「老板那边收到了修正后的数字。他沉默了两分钟，然后发来：『下个月盯紧点。』」";
const CONFIDANT_REVEALS = {
  emotional: "「他说：『有两个人最近一直在投简历，还没告诉你。』」",
  technical: "「他说：『那个系统其实只支持演示场景，换一张地图就崩。』」",
  political: "「他说：『程序和策划现在有两个私下的群，你不在的会才说真话。』」",
};

const ZOMBIE_REVEAL = {
  id: "zombie_reveal", name: "进度泡沫", emoji: "💣", color: "#ef4444",
  tagline: "「这进度……你不会真信了吧」",
  situation: "你深入了解项目后才发现：",
  dialogue: "所谓「进度40%」，其实包括了：外包的三套废弃美术资产、从没跑通过的技术demo，以及某个策划写的那份永远不会实现的设计文档——对了，那个策划已经离职了，没人记得他叫什么。真实完成度……大概是20%？",
  choices: [
    { text: "如实上报，重新规划",      effects: { progress: -10, morale: -5,  budget: 0  }, result: "进度打回原形。你很诚实，但上面很失望。" },
    { text: "先稳住，内部消化",        effects: { progress:  -8, morale: -8,  budget: 0  }, result: "暂时没穿帮，但团队都知道这个秘密。" },
    { text: "接受现实，从真实起点出发", effects: { progress:  -9, morale:  8,  budget: 0  }, result: "你坦然接受了一切。团队反而有点佩服你的淡定。" },
  ]
};

const EVENTS = [
  {
    id: "dreamer", name: "幻想家", emoji: "✨", color: "#c084fc",
    tagline: "「我想实现的时候一定会进展顺利」",
    situation: "幻想家找到你，眼神发亮：",
    dialogue: "制作人！我昨晚想到了一个超酷的功能——城市建造系统+NPC情绪引擎+实时动态天气！实现起来应该不难吧？",
    choices: [
      { text: "好主意！加进去！",    effects: { progress: -4, morale:  12, budget: -12 }, result: "团队兴奋了。范围扩了，进度变慢，钱也少了。" },
      { text: "先写进愿望清单",      effects: { progress:  0, morale:  -3, budget:   5 }, result: "幻想家有点失落。项目保住了，预算还省了点。" },
      { text: "做完核心玩法再说",    effects: { progress:  3, morale: -12, budget:   0 }, result: "幻想家郁闷地走了。团队寒心。" },
    ]
  },
  {
    id: "impulse", name: "灵机一动", emoji: "💡", color: "#fbbf24",
    tagline: "「我最近玩了一个这个，我们也加一下」",
    situation: "灵机一动冲进办公室，手机屏幕冲你晃：",
    dialogue: "我最近在玩《新鬼》，好可爱！我们也做一个向导角色！还有《白寓言》的变身机制！都加上吧！",
    choices: [
      { text: "好！美术程序都动起来！",  effects: { progress: -8, morale: -10, budget: -18 }, result: "美术组和程序组同时崩溃。工期直接炸了。" },
      { text: "做个可行性评估",          effects: { progress: -2, morale:   3, budget:  -8 }, result: "结论：都不可行。浪费了点时间和钱，但总比全做强。" },
      { text: "我们有自己的方向，专注",  effects: { progress:  3, morale: -10, budget:   0 }, result: "他有点受伤，但项目没偏轨。" },
    ]
  },
  {
    id: "castle", name: "空中楼阁", emoji: "🏰", color: "#38bdf8",
    tagline: "「先做出来再说，验证是其次」",
    situation: "空中楼阁把你叫进小会议室，压低声音：",
    dialogue: "下个月没有内部PV，就拿不到下季度预算！我不管你验证没验证完，先做一版漂亮的Demo出来！",
    choices: [
      { text: "好，全员停下来做Demo",    effects: { progress: -8, morale:  -5, budget:  25 }, result: "预算到手了。核心问题被埋进去，以后会爆的。" },
      { text: "据理力争拒绝",            effects: { progress:  2, morale:   5, budget: -15 }, result: "预算缩水了，但进度和士气都保住了。" },
      { text: "把现有进度包装成Demo",    effects: { progress: -2, morale:   5, budget:  10 }, result: "小聪明发挥了作用，上面暂时满意了。" },
    ]
  },
  {
    id: "paratrooper", name: "伞兵制作人", emoji: "🪂", color: "#4ade80",
    tagline: "「我不会乱动的」（但一定会的）",
    situation: "新制作人在全员会议上笑着说：",
    dialogue: "大家好！我是新来的制作人，我觉得你们做得挺好的，会尽量不动大家的东西。对了，我只是有一些小小的方向性调整……",
    choices: [
      { text: "当然！洗耳恭听！",          effects: { progress: -8, morale:   8, budget:  -5 }, result: "「小小调整」= 三个月白干，方向大变。士气短暂好转了。" },
      { text: "先完成当前里程碑再谈",       effects: { progress:  3, morale:  -5, budget:   0 }, result: "争取到了缓冲期。但他记住这事了。" },
      { text: "邀请他深入了解实际现状",     effects: { progress: -3, morale:  12, budget:  -3 }, result: "他理解了现状，后来的调整合理了很多。团队觉得你会办事。" },
    ]
  },
  {
    id: "perfectionist", name: "完美主义", emoji: "♾️", color: "#f87171",
    tagline: "「我们需要重构代码」",
    situation: "主程发来一份十页技术文档：",
    dialogue: "制作人，我研究了一下现有架构，技术债非常严重。如果不在这个阶段重构，后期每个功能的开发成本会翻倍。大概需要……六周。",
    choices: [
      { text: "重构！代码质量第一！",      effects: { progress: -10, morale:  15, budget: -10 }, result: "六周后代码确实干净了。进度完全没了。程序组很爱你。" },
      { text: "局部重构最关键的部分",      effects: { progress:  -3, morale:   8, budget:  -5 }, result: "折中方案，程序组勉强接受。进度基本没动。" },
      { text: "先上线，后续版本再还债",    effects: { progress:   4, morale: -15, budget:   0 }, result: "程序组心碎，但项目在往前走。" },
    ]
  },
  {
    id: "preacher", name: "布道者", emoji: "📋", color: "#2dd4bf",
    tagline: "「先建立一套完善的文档流」",
    situation: "布道者在群里发了一条很长的消息：",
    dialogue: "继续开发之前，我们应该先对齐需求文档的格式规范，建立完善文档体系。我安排了一个两天的全员工作坊……",
    choices: [
      { text: "全员参加！规范很重要！",  effects: { progress: -4, morale:   8, budget: -10 }, result: "规范建好了。没有一个人照着用。但大家觉得被尊重了。" },
      { text: "出个简版规范就好",        effects: { progress: -1, morale:  -2, budget:  -3 }, result: "执行率30%，但总比没有强。三方都不满意。" },
      { text: "这个阶段结束了再搞",      effects: { progress:  3, morale:  -8, budget:   0 }, result: "布道者很失望。进度稳住了，但流程债留着了。" },
    ]
  },
  {
    id: "firefighter", name: "救火队", emoji: "🚒", color: "#fb923c",
    tagline: "「借你50%的美术几个月」",
    situation: "来自上级的通知：",
    dialogue: "N项目下个月上线，严重缺人，需要从你们组抽调50%的美术支援三个月。你们的开发计划自行调整一下。",
    choices: [
      { text: "以大局为重，送人",          effects: { progress: -10, morale: -12, budget:   0 }, result: "美术全走了。三个月的空档期，损失惨重。" },
      { text: "据理力争，只给20%",          effects: { progress:  -4, morale:  -5, budget:  -5 }, result: "谈判部分成功，损失减半，花了点政治资本。" },
      { text: "换延期批复+资源补偿",        effects: { progress:  -2, morale:  -3, budget:  12 }, result: "批了延期，补了点预算。进度算保住了。" },
    ]
  },
  {
    id: "quitter", name: "减员", emoji: "🧳", color: "#94a3b8",
    tagline: "「我要离开这个伤心的城市」",
    situation: "核心程序员发来私信：",
    dialogue: "制作人……我想辞职。我跟女朋友分手了，在这个城市实在待不下去了。战斗系统我会交接好的。",
    choices: [
      { text: "升职加薪挽留！",          effects: { progress:  2, morale:   8, budget: -18 }, result: "他留下来了，进度也稳了。但钱花出去了，心还没完全回来。" },
      { text: "祝福他，认真做好交接",    effects: { progress: -4, morale:  -3, budget:  -5 }, result: "交接花了三周，新人熟悉又花了一个月。人走了，活儿耽误了。" },
      { text: "给他批一个月调整假",      effects: { progress: -2, morale:  15, budget: -10 }, result: "他回来了，状态超好。团队对你刮目相看。" },
    ]
  },
  {
    id: "blamer", name: "甩锅侠", emoji: "🥏", color: "#a78bfa",
    tagline: "「不是功能没做好，是需求没提清楚」",
    situation: "程序和策划在项目群里对线起来了：",
    dialogue: "「功能做错了，两周白费！」「需求文档写得清清楚楚！」「没人看那个破文档！」两边都来找你投诉对方。",
    choices: [
      { text: "站程序：策划需求要更清晰",    effects: { progress:  0, morale: -12, budget:   0 }, result: "策划崩溃。进度正常推进，但他们开始消极怠工。" },
      { text: "站策划：程序要主动沟通",      effects: { progress: -2, morale:  -8, budget:   0 }, result: "程序组寒心，开始只按字面意思做需求，进度也慢了点。" },
      { text: "拉双方当面对齐，建沟通机制",  effects: { progress: -4, morale:  10, budget:  -5 }, result: "握手言和，建立了每周小对齐机制。这周白费了，但长远受益。" },
    ]
  },
  {
    id: "cowboy", name: "自由发挥", emoji: "🤠", color: "#f97316",
    tagline: "「我这么设计，耽误你的需求吗？」",
    situation: "主美做完了一个月的UI给你看效果：",
    dialogue: "制作人！我把界面全重新设计了！沉浸式无UI风格超酷！哦对了，你要的功能界面……我还没做。",
    choices: [
      { text: "哇好酷！就用这个！",            effects: { progress: -6, morale:  15, budget:  -8 }, result: "测试时玩家找不到任何功能在哪。又重做了。主美很开心。" },
      { text: "先完成需求，创意留下个版本",    effects: { progress:  4, morale: -12, budget:   0 }, result: "主美不开心，但需求按时交付了。" },
      { text: "保留方向但加基础UI引导",        effects: { progress: -2, morale:   5, budget:  -5 }, result: "折中方案，视觉和可用性都保住了。" },
    ]
  },
  {
    id: "legacy", name: "屎山", emoji: "🗻", color: "#d97706",
    tagline: "「在这上面加功能不如重写一个」",
    situation: "程序发现了一个严重问题：",
    dialogue: "存档系统要接三年前的老代码，没文档没注释，改一行可能崩十个地方。要做这个功能，必须先重写这部分。",
    choices: [
      { text: "重写！不在屎山上建高楼！",    effects: { progress: -9, morale:  10, budget: -10 }, result: "重写花了六周。这一个功能的代码终于干净了。" },
      { text: "小步带防护地改，写测试覆盖",  effects: { progress: -3, morale:   3, budget:  -5 }, result: "慢是慢了，但改完了，没崩。稳健但不便宜。" },
      { text: "这个功能砍掉，规避问题",      effects: { progress:  3, morale: -10, budget:   5 }, result: "功能砍了，进度和预算都好看了。屎山留给了下一任制作人。" },
    ]
  },
  {
    id: "visionary", name: "远见", emoji: "🔭", color: "#60a5fa",
    tagline: "「这个系统以后会扩展的」",
    situation: "主程兴致勃勃地找到你：",
    dialogue: "制作人，任务系统我重新设计了！考虑到以后可能做开放世界，我搭了个支撑10000任务并发的框架，还有编辑器工具、热更新接口……只需要三个月做基础框架。",
    choices: [
      { text: "太有远见了！做！",                  effects: { progress: -10, morale:  15, budget: -15 }, result: "三个月后框架搭好了。游戏里还没有一个任务。" },
      { text: "先做够用的版本，扩展性以后再说",    effects: { progress:   4, morale: -10, budget:   0 }, result: "主程有点受伤，但两周做完了一个能用的系统。" },
      { text: "保留架构思路，但砍到MVP",            effects: { progress:  -2, morale:   5, budget:  -5 }, result: "框架优雅，功能精简，两边都还能接受。" },
    ]
  },
  {
    id: "meeting", name: "铁头功", emoji: "📅", color: "#0ea5e9",
    tagline: "「这个、那个，都需要碰头会」",
    situation: "你打开本周日历，目瞪口呆：",
    dialogue: "周一全组对齐（2h）+ 周二技术评审（1.5h）+ 周三美术评审（1.5h）+ 周四跨部门同步（1h）+ 周五周总结（1h）+ 明天临时需求评估会。",
    choices: [
      { text: "全参加！保持信息同步！",          effects: { progress: -5, morale:   8, budget:   0 }, result: "参加了所有会议。什么正事都没做。但大家觉得你很投入。" },
      { text: "只参关键会，其余授权组长",        effects: { progress:  1, morale:  -3, budget:   0 }, result: "关键信息没丢，大半时间找回来了。组长有点压力。" },
      { text: "推行异步更新机制，减少会议",      effects: { progress:  3, morale:  -8, budget:  -8 }, result: "效率上来了，但有人不适应，需要磨合成本。" },
    ]
  },
  {
    id: "thunder", name: "雷公", emoji: "⚡", color: "#facc15",
    tagline: "「这种事我也没法控制」",
    situation: "突发状况！",
    dialogue: "公司网络基础设施崩溃，全员居家。Build服务器挂了要修三天。美术组说家里电脑带不动引擎。",
    choices: [
      { text: "停工等待恢复",                effects: { progress: -8, morale:   8, budget:   0 }, result: "恢复后大家很有精神。两周白过了。" },
      { text: "能做什么做什么",              effects: { progress: -3, morale:  -5, budget:  -5 }, result: "效率减半，但至少在推进。大家都很累。" },
      { text: "租云端开发环境保效率",        effects: { progress: -1, morale:  10, budget: -18 }, result: "花了不少钱，开发基本没停。团队很感激。" },
    ]
  },
  // For pendingEvents trigger only
  {
    id: "water_reveal", name: "进度修正", emoji: "💧", color: "#64748b",
    tagline: "「所以那个数字……」",
    situation: "你在复盘上个月的里程碑，翻到了一些细节：",
    dialogue: "那两个「完整关卡」——你亲自去跑测了一下，发现一个是美术场景，没有碰撞体，走进去会穿模；另一个通关逻辑还没写，只能走到中间。\n你又打开了当时他们给你的演示视频，确实能跑，但只在那一张专用测试地图上。\n你打开进度表，盯着那几个数字看了很久。",
    choices: [
{ text: "召集团队重新对齐真实进度", effects: { progress: -8, morale: -5, budget: 0 }, result: "会议上你当众指出了问题。有人沉默，有人低头。气氛很糟，但你终于知道自己在哪里。" },
      { text: "私下找主程重新评估",        effects: { progress: -5, morale:  0, budget: -5 }, result: "花了两天重新盘了一遍。数字调小了。只有你们两个人知道。" },
      { text: "默默调整内心预期",          effects: { progress: -3, morale:  3, budget:  0 }, result: "你一个人坐着，把进度表里几个数字改小了。没有人知道。你也不确定这样做对不对。" },
    ]
  },
  // ---- 大公司病 ----
  {
    id: "corp_kpi", name: "KPI季", emoji: "📊", color: "#6366f1",
    tagline: "「季度OKR必须今天提交」",
    situation: "HR发来通知：",
    dialogue: "本季度OKR填报截止今日。格式要求：17栏Excel，需要部门主管、技术Lead、项目负责人三方签字，上传至内网OA系统（注意：OA系统今天维护，需等下午三点后上传）。",
    choices: [
      { text: "全员认真填，合规为上",        effects: { progress: -3, morale:  -8, budget:   0 }, result: "规规矩矩填完了。团队花了整整一天半。没有一个字会被人看到。" },
      { text: "复制去年的改改",              effects: { progress: -1, morale:  -3, budget:   0 }, result: "敷衍了事。系统审核居然过了。" },
      { text: "你来填，让团队继续开发",      effects: { progress: -2, morale:   8, budget:   0 }, result: "你一个人扛了所有行政工作。团队很感激你。你很累。" },
    ]
  },
  {
    id: "corp_approval", name: "18层审批", emoji: "📝", color: "#8b5cf6",
    tagline: "「这个需要走完整流程」",
    situation: "一个新的技术方案需要审批：",
    dialogue: "但是摆在你面前的是一个很长的流程：需求评审→技术评审→总监确认→PMO备案→财务评估→法务审查→CTO审批→……预计走完需要三周。\n这意味着，三周之后，你才能着手开发。原则上这期间开发不能进行依赖此方案的任何功能。",
    choices: [
      { text: "走完全流程，合规操作",        effects: { progress: -5, morale:  -5, budget:   0 }, result: "三周后终于批了。你学会了什么叫「等待」。" },
      { text: "找关键人直接拍板",            effects: { progress: -2, morale:   0, budget:  -8 }, result: "请了个饭，三天搞定。有人在背后说你「不走程序」。" },
      { text: "先做，边走流程边推进",        effects: { progress:  2, morale:  -5, budget:   0 }, result: "进度推了，但批复下来发现需要改动。还好改动不大。" },
    ]
  },
  // ---- 市场热潮 ----
  {
    id: "market_trend", name: "跟风热", emoji: "🌊", color: "#06b6d4",
    tagline: "「这个方向现在很热，我们也要做」",
    situation: "老板看到了一篇爆款分析文章，紧急拉你开会：",
    dialogue: "《极寒幸存者》这周月流水破亿！生存建造类型现在最热！我们的游戏能不能加入这个元素？或者干脆转型？你来评估一下，下周给我方案。",
    choices: [
      { text: "全力融入，方向转型",                effects: { progress: -9, morale:   5, budget: -10 }, result: "兴奋持续了三天。团队发现转型意味着三个月白干。" },
      { text: "表面融入，加个「探索模式」",        effects: { progress: -4, morale:  -3, budget:  -5 }, result: "做出了一个四不像。玩家不买账，老板也不满意。" },
      { text: "礼貌拒绝，坚守核心方向",            effects: { progress:  1, morale:  -8, budget:   0 }, result: "老板有点不开心。但项目没乱。六个月后那个热点凉了。" },
    ]
  },
  // ---- P3 新事件 ----
  {
    id: "bet_deal", name: "对赌协议", emoji: "🎰", color: "#dc2626",
    tagline: "「本季度营收未达标，全员奖金缩水」",
    situation: "财务发来一封邮件：",
    dialogue: "根据对赌协议条款，本季度公司营收未达预期，全员季度奖金将缩水50%。你的项目团队已经知道了这个消息……你没有办法阻止这件事，但你需要应对它。",
    choices: [
      { text: "召开全员会议，稳定军心",      effects: { progress: -2, morale:  -8, budget:   0 }, result: "你说了很多鼓励的话。大家礼貌地鼓了掌。士气还是跌了。" },
      { text: "加大画饼，许诺上线奖励",      effects: { progress:  0, morale:  -5, budget:   0 }, result: "一半人信了。另一半人开始悄悄更新简历。" },
      { text: "自掏腰包补贴几个核心成员",    effects: { progress:  1, morale:   8, budget: -15 }, result: "你赢得了一些心。代价是你自己的腰包。" },
    ]
  },
  {
    id: "stock_trap", name: "股票绑架", emoji: "📈", color: "#16a34a",
    tagline: "「走也不是，留也不是」",
    situation: "主程私下找到你：",
    dialogue: "制作人，我有个事……我手上有公司期权，归属期还有8个月，但我已经拿到了一个好offer。走的话期权全没了，但留下来……你懂的，我现在状态确实不太行。",
    choices: [
      { text: "留住他，给他更好的条件",          effects: { progress:  2, morale: -5, budget: -15 }, result: "他留下来了，但状态越来越差。代码质量肉眼可见地在下降。" },
      { text: "放他走，快速启动交接",             effects: { progress: -4, morale:  5, budget:  -5 }, result: "他感激你的理解。交接很痛苦，但完成后团队反而透了口气。" },
      { text: "帮他争取调岗，换个环境再撑撑",    effects: { progress: -3, morale:  8, budget:   0 }, result: "调岗批了，他换了组。你消耗了政治资本，但留住了关系。" },
    ]
  },
  {
    id: "brooks_law", name: "救场招人", emoji: "🧑‍💼", color: "#7c3aed",
    tagline: "「加人就能加快进度」（真的吗？）",
    situation: "进度落后，你考虑紧急扩充团队：",
    dialogue: "HR说有三个候选人可以快速入职。但你的老程序说：「加人只会让我们更慢，至少前一个月。」人月神话你不是没读过……",
    choices: [
      { text: "大量招人，相信人海战术",        effects: { progress: -6, morale:  -8, budget: -15 }, result: "新人带教让所有人停下来。四周后才看到效果。Brooks是对的。" },
      { text: "只招一个最关键岗位",            effects: { progress: -3, morale:  -3, budget:  -8 }, result: "带教成本尚可。三周后那个人开始产出。谨慎但有效。" },
      { text: "不招人，靠现有团队硬扛",        effects: { progress:  2, morale: -10, budget:   0 }, result: "团队压力很大，但没有被新人拖慢。进度稳住了。" },
    ]
  },
  {
    id: "kpi_review", name: "KPI施压", emoji: "📉", color: "#9333ea",
    tagline: "「你觉得这个进度正常吗？」",
    situation: "季度复盘会上，领导把一个数字推到你面前：",
    dialogue: "「项目进度看起来……有点慢啊。我们下个季度的KPI目标是这个数，你觉得能完成吗？」那个数字需要你接下来每周产出翻倍。",
    choices: [
      { text: "拍胸脯保证，完不成自罚",          effects: { progress:  0, morale:  -5, budget:   0 }, result: "领导满意地点头。团队听说了，集体沉默。压力全在你身上了。" },
      { text: "如实分析风险，提出可达目标",        effects: { progress:  2, morale:   5, budget:   0 }, result: "领导皱了皱眉，但接受了合理目标。团队觉得你靠谱。" },
      { text: "用漂亮的PPT转移注意力",            effects: { progress: -2, morale:   3, budget:  -5 }, result: "这周做PPT了，没做正事。但领导暂时满意了。" },
    ]
  },
];

// ---- month summary --------------------------------------------------------

const MONTH_FLAVORS = [
  "原型期过去了。方向定了吗？",
  "两个月了。团队开始知道彼此的脾气了。",
  "过半了。但进度过半了吗？",
  "四个月。你开始能感觉到什么东西在收紧。",
  "最后一个月到了。",
];

const MILESTONE_EVENTS = [
  {
    month: 1,
    name: "立项启动评审", emoji: "🚀", color: "#6366f1",
    tagline: "「方向定了吗？」",
    situation: "第一个月末，上面来看原型：",
    dialogue: "投资方代表坐在会议室里，笑着问：「能跑吗？大概什么感觉？我不需要完整的，能动就行。」你扫了一眼团队——他们昨晚熬通宵做了一个能跑的东西。",
    choices: [
      { text: "展示这个能跑的版本", effects: { progress: 0, morale: 5, budget: 5 }, result: "他们满意地点头。你没有告诉他们这是昨晚才做的。" },
      { text: "如实说明当前进度和风险", effects: { progress: -3, morale: 3, budget: 0 }, result: "他皱了皱眉，但最终点头：「诚实是好事。」进度没虚报，心里稳了。" },
      { text: "先找人确认这个版本有多少是真实的", effects: { progress: -2, morale: 0, budget: 0 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    month: 2,
    name: "MVP 评审", emoji: "🎮", color: "#0ea5e9",
    tagline: "「核心玩法能玩通吗？」",
    situation: "第二个月末，内部评审：",
    dialogue: "总监把手柄放下来：「核心循环我玩了十分钟，感觉还行，就是……有几个地方我有点疑问。」\n他翻开了一页记满问题的纸。",
    choices: [
      { text: "逐条解释，打消疑虑", effects: { progress: 0, morale: 3, budget: 3 }, result: "你回答了所有问题。有三个你其实不确定，但你说得很自信。" },
      { text: "承认部分问题，给出修复计划", effects: { progress: -4, morale: 5, budget: 0 }, result: "他看起来有点失望，但接受了时间表。进度是真实的。" },
      { text: "先确认这十分钟他没玩到的地方是什么情况", effects: { progress: -2, morale: 0, budget: 0 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    month: 3,
    name: "基础闭环评审", emoji: "🔄", color: "#10b981",
    tagline: "「从头玩到尾，不崩吗？」",
    situation: "第三个月末，里程碑测试：",
    dialogue: "QA组发来报告：「我们跑了一遍主流程……有一些情况。」你们约好了今天下午向上汇报全流程可用性。",
    choices: [
      { text: "先开会，QA的问题会后再处理", effects: { progress: 0, morale: 0, budget: 5 }, result: "汇报很顺利。QA报告被你压到了下周。" },
      { text: "推迟汇报，先处理QA问题", effects: { progress: -5, morale: 3, budget: 0 }, result: "上面有点不满意被推迟。但你知道自己在哪里。" },
      { text: "让心腹先看一下QA报告里哪些是真正的问题", effects: { progress: -2, morale: 0, budget: 0 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    month: 4,
    name: "内容量产评审", emoji: "📦", color: "#f59e0b",
    tagline: "「内容够吗？」",
    situation: "第四个月末，内容进度核查：",
    dialogue: "策划总监发来一个表格：「按计划，本月应该完成60%的关卡内容。我这边看到的数字是58%，差不多。」你的主程私下发消息：「那个数字是怎么算出来的？」",
    choices: [
      { text: "确认数字，继续推进", effects: { progress: 0, morale: 3, budget: 3 }, result: "58%通过了。你没有去追那条私信。" },
      { text: "要求重新核查内容完成标准", effects: { progress: -8, morale: 5, budget: 0 }, result: "核查花了三天。真实数字是41%。上面很不高兴。" },
      { text: "先回那条私信，问清楚", effects: { progress: -3, morale: 0, budget: 0 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    month: 5,
    name: "整体验收评审", emoji: "🔍", color: "#ef4444",
    tagline: "「这个游戏，能上线吗？」",
    situation: "第五个月末，外部评审：",
    dialogue: "发行方带了三个人来，玩了两个小时。会议室里安静了很长时间。最后他们说：「我们有一些反馈……」",
    choices: [
      { text: "接受反馈，承诺全部修改", effects: { progress: -5, morale: -5, budget: 5 }, result: "他们满意地走了。你看着那份修改清单，感觉最后一个月不够用。" },
      { text: "区分必改和不改，谈判范围", effects: { progress: -3, morale: 3, budget: 0 }, result: "谈了两个小时。砍掉了一半修改项。进度有损但可控。" },
      { text: "先私下确认团队能做到哪些", effects: { progress: -2, morale: 0, budget: 0 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
];

function MonthSummaryCard({ data, onNext }) {
  const { month, delta, progress, weeksLeft } = data;
  const flavor = MONTH_FLAVORS[month - 1] || "";
  return (
    <div style={{ padding: "24px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 12, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 11, color: "#444", fontFamily: "monospace" }}>— 月度小结 —</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#888" }}>第{month}月结束</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "monospace", fontSize: 12 }}>
          <div>本月进度推进了 <span style={{ color: delta >= 0 ? "#4ade80" : "#f87171" }}>{delta >= 0 ? "+" : ""}{delta}%</span></div>
          <div style={{ color: "#555" }}>距离上线还有 <span style={{ color: "#888" }}>{100 - progress}%</span></div>
          <div style={{ color: "#555" }}>剩余 <span style={{ color: weeksLeft < 8 ? "#f87171" : "#888" }}>{weeksLeft}</span> 周</div>
        </div>
        <div style={{ fontSize: 12, color: "#3a3a4a", fontStyle: "italic", borderTop: "1px solid #1a1a2e", paddingTop: 12 }}>
          「{flavor}」
        </div>
        <button onClick={onNext}
          style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "11px 14px", fontSize: 13, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
          进入第{month + 1}月 →
        </button>
      </div>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function colorDesc(desc) {
  return desc.split(/([\+\-]\d+)/).map((p, i) =>
    /^\+\d+/.test(p) ? <span key={i} style={{ color: "#4ade80" }}>{p}</span>
    : /^\-\d+/.test(p) ? <span key={i} style={{ color: "#f87171" }}>{p}</span>
    : <span key={i}>{p}</span>
  );
}

function effectArrows(netValue) {
  if (netValue === 0) return "—";
  const dir = netValue > 0 ? "↑" : "↓";
  return dir.repeat(Math.ceil(Math.abs(netValue) / 5));
}

function StatBar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, value));
  const danger = pct < 20;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "monospace", color: danger ? "#f87171" : "#666", marginBottom: 3 }}>
        <span>{label}</span><span style={{ color: danger ? "#f87171" : color }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "#111", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: danger ? "#ef4444" : color, borderRadius: 3, transition: "width 0.5s ease", boxShadow: danger ? `0 0 8px #ef444460` : `0 0 6px ${color}50` }} />
      </div>
    </div>
  );
}

function EffectBadge({ value, label }) {
  if (!value) return null;
  const pos = value > 0;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 8px", borderRadius: 4, background: pos ? "#052e16" : "#450a0a", border: `1px solid ${pos ? "#166534" : "#7f1d1d"}`, color: pos ? "#4ade80" : "#f87171", fontSize: 11, fontFamily: "monospace" }}>
      {pos ? "▲" : "▼"} {label} {Math.abs(value)}
    </span>
  );
}

function ChoicePreview({ effects, progressBonus }) {
  const np = (effects.progress || 0) + BASE_PROGRESS + (progressBonus || 0);
  const nm = effects.morale || 0;
  const nb = effects.budget || 0;
  const c = (v) => v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#444";
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, fontFamily: "monospace", opacity: 0.85 }}>
      <span>📈<span style={{ color: c(np) }}>{effectArrows(np)}</span></span>
      <span>💪<span style={{ color: c(nm) }}>{effectArrows(nm)}</span></span>
      <span>💰<span style={{ color: c(nb) }}>{effectArrows(nb)}</span></span>
    </div>
  );
}

function WorkModeSelector({ workMode, setWorkMode, overtimeType, setOvertimeType, pieCount, progress, apSpent, apBonus }) {
  const isOvertime = workMode !== "normal";
  const piePenalty = isOvertime ? calcPiePenalty(workMode, pieCount, progress) : 0;
  const modeBtn = (key) => {
    const m = WORK_MODES[key];
    const active = workMode === key;
    return (
      <button key={key} onClick={() => setWorkMode(key)} style={{ flex: 1, padding: "5px 4px", fontSize: 11, fontFamily: "monospace", background: active ? "#1a1a2e" : "#08080f", border: `1px solid ${active ? "#4a4a7a" : "#1e1e2e"}`, color: active ? "#c0c0e0" : "#444", borderRadius: 6, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span>{m.emoji}</span><span>{m.label}</span><span style={{ color: active ? "#666" : "#333", fontSize: 10 }}>{m.ap + (apBonus||0)}AP</span>
      </button>
    );
  };
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#333", marginBottom: 5, fontFamily: "monospace" }}>工作模式 · 剩余 {Math.max(0, WORK_MODES[workMode].ap + (apBonus||0) - apSpent)}AP</div>
      <div style={{ display: "flex", gap: 5, marginBottom: isOvertime ? 5 : 0 }}>
        {["normal", "overtime", "extreme"].map(modeBtn)}
      </div>
      {isOvertime && (
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={() => setOvertimeType("pay")} style={{ flex: 1, padding: "4px 6px", fontSize: 11, background: overtimeType === "pay" ? "#0d2010" : "#08080f", border: `1px solid ${overtimeType === "pay" ? "#166534" : "#1e1e2e"}`, color: overtimeType === "pay" ? "#4ade80" : "#444", borderRadius: 6, cursor: "pointer" }}>
            💰 付加班费 -{WORK_MODES[workMode].budgetCost}预算
          </button>
          <button onClick={() => setOvertimeType("pie")} style={{ flex: 1, padding: "4px 6px", fontSize: 11, background: overtimeType === "pie" ? "#2d0a0a" : "#08080f", border: `1px solid ${overtimeType === "pie" ? "#7f1d1d" : "#1e1e2e"}`, color: overtimeType === "pie" ? "#f87171" : "#444", borderRadius: 6, cursor: "pointer" }}>
            🥧 画饼{pieCount > 0 ? `×${pieCount + 1}` : ""} -{piePenalty}士气
          </button>
        </div>
      )}
    </div>
  );
}

function ActionMenu({ state, workMode, apSpent, setApSpent, setState, freezeDone, setFreezeDone }) {
  const apTotal = WORK_MODES[workMode].ap + (state.apBonusPerWeek || 0);
  const apLeft = Math.max(0, apTotal - apSpent);
  const isMonthEnd = state.week % 4 === 0;
  const ctx = { freezeDone, isMonthEnd };

  const takeAction = (action) => {
    if (apLeft < action.ap) return;
    if (!action.available(state, ctx)) return;
    setState(prev => action.apply(prev));
    setApSpent(p => p + action.ap);
    if (action.id === "freeze") setFreezeDone(true);
  };

  const available = ACTIONS.filter(a => a.available(state, ctx));
  if (available.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#333", marginBottom: 5, fontFamily: "monospace" }}>本周行动</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {available.map(action => {
          const canAfford = apLeft >= action.ap;
          return (
            <button key={action.id} onClick={() => takeAction(action)} disabled={!canAfford} style={{ padding: "4px 10px", fontSize: 11, background: canAfford ? "#0c0c18" : "#080808", border: `1px solid ${canAfford ? "#2a2a3a" : "#161616"}`, color: canAfford ? "#999" : "#333", borderRadius: 6, cursor: canAfford ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}
              onMouseEnter={e => canAfford && (e.currentTarget.style.borderColor = "#4a4a7a")}
              onMouseLeave={e => canAfford && (e.currentTarget.style.borderColor = "#2a2a3a")}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span>{action.emoji}</span>
                <span>{action.label}</span>
                <span style={{ color: "#444", fontFamily: "monospace" }}>{action.ap}AP</span>
              </div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: canAfford ? "#555" : "#2a2a2a" }}>{colorDesc(action.desc)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- intro + card screens --------------------------------------------------

function IntroScreen({ onNext }) {
  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: 32 }}>
      <div style={{ fontSize: 40, marginBottom: 24, textAlign: "center" }}>🎮</div>
      <div style={{ fontSize: 11, color: "#333", fontFamily: "monospace", lineHeight: 2, marginBottom: 32 }}>
        <p style={{ color: "#666" }}>你今年35岁。</p>
        <p style={{ color: "#666" }}>被毕业已经是半年前的事，</p>
        <p style={{ color: "#666" }}>现在你是一位X滴司机。</p>
        <p style={{ marginTop: 16, color: "#555" }}>好在你买的车够好，可以跑专车。</p>
        <p style={{ marginTop: 16, color: "#555" }}>有一天，你接到了一位神秘乘客，</p>
        <p style={{ color: "#555" }}>他很反常地和你聊了一路的天，直到把他送到了公司园区。</p>
        <p style={{ marginTop: 16, color: "#555" }}>他说现在他无人可用，那些肥头大耳的老将都被他开除完了，</p>
        <p style={{ color: "#555" }}>他愿意给你一次机会——</p>
        <p style={{ marginTop: 16, color: "#444" }}>担任游戏制作人，试用期六个月。</p>
        <p style={{ color: "#444" }}>你必须在24周内把游戏送上线。</p>
        <p style={{ color: "#444" }}>否则……开除速度一定会很快！</p>
      </div>
      <button onClick={onNext} style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "12px 24px", fontSize: 13, cursor: "pointer", width: "100%", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
        接这个项目 →
      </button>
    </div>
  );
}

function CardScreen({ step, pickedCards, onPick, onNext }) {
  const group = CARD_GROUPS[step];
  const picked = pickedCards[step];

  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
      <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", marginBottom: 12 }}>
        {step + 1} / {CARD_GROUPS.length}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#999", marginBottom: 20 }}>{group.title}</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {group.cards.map(card => {
          const isSelected = picked?.id === card.id;
          return (
            <button key={card.id} onClick={() => !picked && onPick(step, card)} style={{ flex: 1, padding: "16px 8px", background: isSelected ? "#0d1a0d" : "#0c0c18", border: `1px solid ${isSelected ? "#166534" : "#1e1e2e"}`, borderRadius: 10, cursor: picked ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" }}
              onMouseEnter={e => !picked && (e.currentTarget.style.borderColor = "#4a4a7a")}
              onMouseLeave={e => !picked && !isSelected && (e.currentTarget.style.borderColor = "#1e1e2e")}>
              <span style={{ fontSize: 32 }}>{card.emoji}</span>
              <span style={{ fontSize: 12, color: isSelected ? "#4ade80" : "#888" }}>{card.label}</span>
            </button>
          );
        })}
      </div>
      {picked && (
        <div style={{ background: "#0c0c18", border: "1px solid #1a2a1a", borderRadius: 10, padding: "12px 14px", marginBottom: 20, animation: "floatIn 0.3s ease" }}>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 4, fontFamily: "monospace" }}>{picked.emoji} {picked.label}</div>
          <div style={{ fontSize: 13, color: "#4ade80", lineHeight: 1.6 }}>{picked.reveal}</div>
        </div>
      )}
      {picked && (
        <button onClick={onNext} style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "12px 24px", fontSize: 13, cursor: "pointer", width: "100%", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
          {step < CARD_GROUPS.length - 1 ? "下一张 →" : "开始制作！🚀"}
        </button>
      )}
      <style>{`@keyframes floatIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ---- main app --------------------------------------------------------------

const PHASE_LABELS = [
  { min: 0, label: "概念原型期" }, { min: 25, label: "核心开发期" },
  { min: 50, label: "功能收尾期" }, { min: 75, label: "上线冲刺期" },
];

export default function App() {
  const [appPhase, setAppPhase] = useState("intro"); // "intro" | "cards" | "game"
  const [cardStep, setCardStep] = useState(0);
  const [pickedCards, setPickedCards] = useState([]);

  const [state, setState] = useState({
    week: 1, progress: 0, morale: 75, budget: 100, survived: 0,
    gamePhase: "playing", loseReason: "", progressBonus: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false,
  });

  const [workMode, setWorkMode] = useState("normal");
  const [overtimeType, setOvertimeType] = useState("pay");
  const [pieCount, setPieCount] = useState(0);
  const [apSpent, setApSpent] = useState(0);
  const [freezeDone, setFreezeDone] = useState(false);

  const [weekPhase, setWeekPhase] = useState("planning"); // "planning" | "event"
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [monthSummaryData, setMonthSummaryData] = useState(null);
  const [monthStartProgress, setMonthStartProgress] = useState(0);

  const [pendingMilestone, setPendingMilestone] = useState(null);

  const [event, setEvent] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState("");
  const [lastEffects, setLastEffects] = useState(null);
  const [lastWorkEffect, setLastWorkEffect] = useState(null);
  const [animKey, setAnimKey] = useState(0);

   const pickEvent = useCallback((gameState) => {
     const s = gameState || state;
     const newWeek = s.week + 1;
     const milestoneMonth = Math.ceil((newWeek - 1) / 4);
     if (milestoneMonth >= 1 && milestoneMonth <= 5 && (newWeek - 1) % 4 === 0) {
       const milestone = MILESTONE_EVENTS.find(m => m.month === milestoneMonth);
       if (milestone) return milestone;
     }
     if (s.pendingEvents && s.pendingEvents.length > 0) {
       if (s.pendingEvents[0] === "zombie_reveal") return ZOMBIE_REVEAL;
       const pendingEvent = EVENTS.find(e => e.id === s.pendingEvents[0]);
       if (pendingEvent) return pendingEvent;
     }
     return EVENTS[Math.floor(Math.random() * EVENTS.length)];
   }, [state]);

  useEffect(() => {
    if (appPhase === "game") setEvent(pickEvent(state));
  }, [appPhase]);

  // Card handlers
  const handleCardPick = (step, card) => {
    const newPicks = [...pickedCards];
    newPicks[step] = card;
    setPickedCards(newPicks);
  };

  const handleCardNext = () => {
    if (cardStep < CARD_GROUPS.length - 1) {
      setCardStep(s => s + 1);
    } else {
      // All cards picked — build initial state and start game
      const initState = buildInitialState(pickedCards);
      setState(initState);
      setAppPhase("game");
      setEvent(pickEvent(initState));
    }
  };

  const handleChoice = useCallback((choice, optionType) => {
    const mode = WORK_MODES[workMode];
    let moralePenalty = 0, budgetCost = 0, newPieCount = pieCount;
    if (workMode !== "normal") {
      if (overtimeType === "pay") { budgetCost = mode.budgetCost; }
      else { moralePenalty = calcPiePenalty(workMode, pieCount, state.progress); newPieCount = pieCount + 1; }
    }
    const workEffect = { workMode, overtimeType, progressBonus: mode.progressBonus, budgetCost, moralePenalty };

    let newConfidant = state.confidant;
    let confidantAppend = "";
    let pendingAdd = null;
    let bossReact = "";

    const isMilestone = MILESTONE_EVENTS.some(m => m.name === event?.name);
    if (isMilestone) {
      if (optionType === "A") {
        pendingAdd = "water_reveal";
        bossReact = BOSS_OK;
      } else if (optionType === "B") {
        bossReact = BOSS_NG;
      } else if (optionType === "C" && state.confidant) {
        const revealed = CONFIDANT_REVEALS[state.confidant.type];
        confidantAppend = " " + revealed;
        if (Math.random() < 0.5) pendingAdd = null;
        else pendingAdd = "water_reveal";
        bossReact = BOSS_OK;
      } else if (optionType === "C" && !state.confidant) {
        bossReact = BOSS_OK;
      } else {
        bossReact = BOSS_OK;
      }
     } else if (!isMilestone && event?.id !== "water_reveal") {
       if (event?.id === "quitter" && optionType === 2 && !state.confidant) {
         newConfidant = { type: "emotional", role: "核心程序员" };
         confidantAppend = " 他回来之后，私下找到你：『制作人，以后有什么事你直接问我。』";
       } else if (event?.id === "perfectionist" && optionType === 1 && !state.confidant) {
         newConfidant = { type: "technical", role: "主程" };
         confidantAppend = " 他发现你是少数听得进技术建议的人。某天下班前他多说了几句实话。";
       } else if (event?.id === "blamer" && optionType === 2 && !state.confidant) {
         newConfidant = { type: "political", role: "组长" };
         confidantAppend = " 握手言和之后，组长私下谢了你。他说：『你要知道什么，来找我。』";
       } else if (event?.id === "quitter" && state.confidant?.role === "核心程序员") {
         newConfidant = null;
         confidantAppend = " 你意识到现在没有人会跟你说真话了。";
       } else if (event?.id === "firefighter" && optionType === 0 && state.confidant && Math.random() < 0.5) {
         newConfidant = null;
         confidantAppend = " 他在被抽走的名单里。你们之间的那条线，就这么断了。";
       } else if (event?.id === "blamer" && state.confidant?.type === "political" && (optionType === 0 || optionType === 1)) {
         newConfidant = null;
         confidantAppend = " 他看你的眼神变了。你知道那意味着什么。";
       }
     }

    if (event?.id !== "water_reveal" && !isMilestone) {
      bossReact = "";
    }
    if (event?.id === "water_reveal") {
      bossReact = "";
    }

    setState(prev => {
      const pb = (prev.progressBonus || 0) + (prev.progressMomentum || 0);
      const newProgress = Math.min(100, Math.max(0, prev.progress + BASE_PROGRESS + (choice.effects.progress || 0) + mode.progressBonus + pb));
      const newMorale = Math.min(100, Math.max(0, prev.morale + (choice.effects.morale || 0) - moralePenalty));
      const newBudget = Math.min(100, Math.max(0, prev.budget + (choice.effects.budget || 0) - budgetCost));
      const newWeek = prev.week + 1;
      const expectedProgress = (newWeek / TOTAL_WEEKS) * 100;
      const newMomentum = newProgress > expectedProgress + 10 ? 1 : newProgress < expectedProgress - 10 ? -1 : 0;
      const newPending = [...(prev.pendingEvents || [])];
      if (event?.id === "zombie_reveal") {
        const idx = newPending.indexOf("zombie_reveal");
        if (idx >= 0) newPending.splice(idx, 1);
      }
      if (event?.id === "water_reveal") {
        const idx = newPending.indexOf("water_reveal");
        if (idx >= 0) newPending.splice(idx, 1);
      }
      if (pendingAdd && !newPending.includes(pendingAdd)) {
        newPending.push(pendingAdd);
      }
      let gamePhase = "playing", loseReason = "";
      if (newProgress >= 100) gamePhase = "win";
      else if (newMorale <= 0) { gamePhase = "lose"; loseReason = "团队士气归零，所有人集体摆烂，项目解散。"; }
      else if (newBudget <= 0) { gamePhase = "lose"; loseReason = "预算耗尽，上面决定砍掉项目。"; }
      else if (newWeek > TOTAL_WEEKS) { gamePhase = "lose"; loseReason = `第${newWeek}周，超过6个月试用期。当年对你有知遇之恩的那个人冷面出现在会议室，对你说，你被开除了！`; }
      let newVerify = prev.verifyUsedThisMonth;
      if (isMilestone) newVerify = false;
      return { ...prev, week: newWeek, progress: newProgress, morale: newMorale, budget: newBudget, gamePhase, loseReason, survived: prev.survived + 1, pendingEvents: newPending, progressMomentum: newMomentum, confidant: newConfidant, verifyUsedThisMonth: newVerify };
    });

    setPieCount(newPieCount);
    const finalResult = choice.result + confidantAppend + (bossReact ? " " + bossReact : "");
    setLastResult(finalResult);
    setLastEffects(choice.effects);
    setLastWorkEffect(workEffect);
    setShowResult(true);
  }, [workMode, overtimeType, pieCount, state.progress, state.progressBonus, event, state.confidant]);

  const nextEvent = useCallback(() => {
    setShowResult(false);
    setLastEffects(null);
    setLastWorkEffect(null);
    setApSpent(0);
    setWeekPhase("planning");
    // Check month boundary: week just advanced to new month's first week
    const curWeek = state.week;
    if (curWeek % 4 === 1 && curWeek <= 21) {
      const month = Math.ceil((curWeek - 1) / 4);
      const delta = Math.round(state.progress - monthStartProgress);
      setMonthSummaryData({ month, delta, progress: state.progress, weeksLeft: TOTAL_WEEKS - curWeek });
      setShowMonthSummary(true);
      setMonthStartProgress(state.progress);
    } else {
      setState(prev => {
        setEvent(pickEvent(prev));
        return prev;
      });
      setAnimKey(k => k + 1);
    }
  }, [pickEvent, state.week, state.progress, monthStartProgress]);

  const dismissMonthSummary = useCallback(() => {
    setShowMonthSummary(false);
    setMonthSummaryData(null);
    setState(prev => {
      setEvent(pickEvent(prev));
      return prev;
    });
    setAnimKey(k => k + 1);
  }, [pickEvent]);

  const restart = useCallback(() => {
    setAppPhase("intro");
    setCardStep(0);
    setPickedCards([]);
    setState({ week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false });
    setWorkMode("normal");
    setOvertimeType("pay");
    setPieCount(0);
    setApSpent(0);
    setFreezeDone(false);
    setWeekPhase("planning");
    setShowMonthSummary(false);
    setMonthSummaryData(null);
    setMonthStartProgress(0);
    setShowResult(false);
    setEvent(null);
    setAnimKey(k => k + 1);
  }, []);

  // ---- screens ----
  if (appPhase === "intro") return <IntroScreen onNext={() => setAppPhase("cards")} />;
  if (appPhase === "cards") return (
    <CardScreen step={cardStep} pickedCards={pickedCards} onPick={handleCardPick} onNext={handleCardNext} />
  );

  const phase = [...PHASE_LABELS].reverse().find(p => state.progress >= p.min)?.label || "概念原型期";
  const weeksLeft = TOTAL_WEEKS - state.week;
  const { label: timeLabel } = weekDisplay(state.week);

  if (state.gamePhase === "win") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>🎮</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", margin: "12px 0 6px" }}>游戏上线了！</div>
        <div style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 13, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，<br />成功把游戏送上线。<br />老板决定给你提前转正，<br />并把一个你曾经听过的事业部交给你执掌。<br />他说：<br />记住了，一年挣不到50个亿，<br />这个事业部就没有必要留着。<br />你也是。
        </div>
        <button onClick={restart} style={s.endBtn}>再来一局</button>
      </div>
    </div>
  );

  if (state.gamePhase === "lose") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>📦</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#f87171", margin: "12px 0 6px" }}>项目延期了</div>
        <div style={{ color: "#555", fontSize: 12, marginBottom: 6 }}>{timeLabel}</div>
        <div style={{ color: "#888", fontSize: 13, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 6 }}>{state.loseReason}</div>
        <div style={{ color: "#555", fontSize: 12, marginBottom: 24 }}>撑过了 {state.survived} 个延期人格，进度达到 {state.progress}%</div>
        <button onClick={restart} style={s.endBtn}>重新开始</button>
      </div>
    </div>
  );

  const apTotal = WORK_MODES[workMode].ap + (state.apBonusPerWeek || 0);
  const apLeft = Math.max(0, apTotal - apSpent);

  const header = (
    <div style={s.header}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#ddd", letterSpacing: "0.03em" }}>完蛋！我被延期包围了</div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 1 }}>{phase}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 11, fontFamily: "monospace", color: weeksLeft < 4 ? "#f87171" : "#555" }}>{timeLabel}</div>
        <div style={{ fontSize: 10, color: weeksLeft < 4 ? "#7f1d1d" : "#333", marginTop: 1 }}>剩余 {Math.max(0, weeksLeft)} 周</div>
        {state.progressMomentum !== 0 && (
          <div style={{ fontSize: 10, fontFamily: "monospace", marginTop: 2, color: state.progressMomentum > 0 ? "#4ade80" : "#f87171" }}>
            {state.progressMomentum > 0 ? "📈 进度超前 +1" : "📉 进度落后 -1"}
          </div>
        )}
        {state.confidant && (
          <div style={{ fontSize: 10, fontFamily: "monospace", marginTop: 2, color: "#a78bfa" }}>
            🤝 心腹：{state.confidant.role}
          </div>
        )}
      </div>
    </div>
  );

  const statsRow = (
    <div style={s.statsRow}>
      <StatBar label="📈 进度" value={state.progress} color="#4ade80" />
      <div style={{ width: 10 }} />
      <StatBar label="💪 士气" value={state.morale} color="#fb923c" />
      <div style={{ width: 10 }} />
      <StatBar label="💰 预算" value={state.budget} color="#60a5fa" />
    </div>
  );

  if (showMonthSummary && monthSummaryData) {
    return (
      <div style={s.app}>
        {header}
        {statsRow}
        <MonthSummaryCard data={monthSummaryData} onNext={dismissMonthSummary} />
        <style>{`@keyframes floatIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  return (
    <div style={s.app}>
      {header}
      {statsRow}

      <div key={animKey} style={s.main}>
        {weekPhase === "planning" ? (
          <>
            <div style={{ paddingTop: 16 }}>
              <WorkModeSelector workMode={workMode} setWorkMode={setWorkMode} overtimeType={overtimeType} setOvertimeType={setOvertimeType} pieCount={pieCount} progress={state.progress} apSpent={apSpent} apBonus={state.apBonusPerWeek||0} />
              <ActionMenu state={state} workMode={workMode} apSpent={apSpent} setApSpent={setApSpent} setState={setState} freezeDone={freezeDone} setFreezeDone={setFreezeDone} />
            </div>
            <div style={{ marginTop: 16 }}>
              {apLeft > 0 && (
                <div style={{ fontSize: 10, color: "#555", fontFamily: "monospace", marginBottom: 8 }}>
                  你还有 {apLeft} AP 未使用，确认后将消失。
                </div>
              )}
              <button onClick={() => setWeekPhase("event")}
                style={{ ...s.choiceBtn, borderColor: "#2a2a3a", justifyContent: "center", color: "#888" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
                本周安排完毕，看看发生了什么 →
              </button>
            </div>
          </>
        ) : (
          event && (
            <>
              <div style={s.charBox}>
                <div style={{ ...s.charGlow, background: `radial-gradient(ellipse at 50% 60%, ${event.color}18 0%, transparent 65%)` }} />
                <div style={{ fontSize: 52, position: "relative", zIndex: 1, animation: "floatIn 0.4s ease" }}>{event.emoji}</div>
                <div style={{ color: event.color, fontSize: 15, fontWeight: 700, position: "relative", zIndex: 1 }}>{event.name}</div>
                <div style={{ color: "#3a3a4a", fontSize: 10, position: "relative", zIndex: 1, marginTop: 2 }}>{event.tagline}</div>
              </div>

              <div style={s.dialogueBox}>
                <div style={{ fontSize: 10, color: "#444", marginBottom: 6 }}>{event.situation}</div>
                <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.7 }}>{event.dialogue}</div>
              </div>

               {!showResult ? (
                 <div style={s.choices}>
                   {(() => {
                     const isMilestone = MILESTONE_EVENTS.some(m => m.name === event?.name);
                     const choices = event.choices;
                     const getOptionLabel = (i) => isMilestone ? ["A", "B", "C"][i] : null;
                     
                     return choices.map((c, i) => {
                       let disabled = false;
                       let disableReason = "";
                       if (isMilestone) {
                         if (i === 1 && !state.verifyUsedThisMonth) {
                           disabled = true;
                           disableReason = "（需先使用「深入验收」行动）";
                         }
                         if (i === 2 && !state.confidant) {
                           disabled = true;
                           disableReason = "（需有心腹）";
                         }
                       }
                       
                       return (
                         <button key={i} onClick={() => handleChoice(c, isMilestone ? getOptionLabel(i) : i)} disabled={disabled} style={{ ...s.choiceBtn, opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                           onMouseEnter={e => !disabled && (e.currentTarget.style.borderColor = event.color, e.currentTarget.style.background = `${event.color}0a`)}
                           onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e2e"; e.currentTarget.style.background = "#0c0c18"; }}>
                           <div>
                             <div style={{ display: "flex", alignItems: "flex-start" }}>
                               {getOptionLabel(i) && <span style={{ color: event.color, marginRight: 8, fontFamily: "monospace", fontSize: 11, flexShrink: 0 }}>{getOptionLabel(i)}.</span>}
                               <span>{c.text}{disableReason}</span>
                             </div>
                             <ChoicePreview effects={c.effects} progressBonus={(state.progressBonus || 0) + WORK_MODES[workMode].progressBonus + (state.progressMomentum || 0)} />
                           </div>
                         </button>
                       );
                     });
                   })()}
                 </div>
               ) : (
                <div style={s.result}>
                  <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7, marginBottom: 10 }}>{lastResult}</div>
                  {lastEffects && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      <EffectBadge value={(lastEffects.progress || 0) + BASE_PROGRESS + (state.progressBonus || 0)} label="进度" />
                      <EffectBadge value={lastEffects.morale || 0} label="士气" />
                      <EffectBadge value={lastEffects.budget || 0} label="预算" />
                    </div>
                  )}
                  {lastWorkEffect && lastWorkEffect.workMode !== "normal" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, paddingTop: 8, borderTop: "1px solid #1a1a2e" }}>
                      <span style={{ fontSize: 10, color: "#444", width: "100%", fontFamily: "monospace" }}>{WORK_MODES[lastWorkEffect.workMode].emoji} {WORK_MODES[lastWorkEffect.workMode].label}</span>
                      <EffectBadge value={lastWorkEffect.progressBonus} label="进度" />
                      {lastWorkEffect.overtimeType === "pay"
                        ? <EffectBadge value={-lastWorkEffect.budgetCost} label="预算" />
                        : <EffectBadge value={-lastWorkEffect.moralePenalty} label={`士气(第${pieCount}次饼)`} />
                      }
                    </div>
                  )}
                  <button onClick={nextEvent} style={{ ...s.choiceBtn, borderColor: "#2a2a3a", textAlign: "center", justifyContent: "center", color: "#888" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#ccc"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
                    下一位来访者 →
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>

      <style>{`@keyframes floatIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

const s = {
  app: { minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", display: "flex", flexDirection: "column", maxWidth: 420, margin: "0 auto" },
  header: { padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #0e0e1e" },
  statsRow: { display: "flex", alignItems: "center", padding: "10px 18px", borderBottom: "1px solid #0e0e1e", background: "#08080f" },
  main: { padding: "0 18px 24px", flex: 1, display: "flex", flexDirection: "column" },
  charBox: { display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 20px 12px", position: "relative", overflow: "hidden" },
  charGlow: { position: "absolute", inset: 0, pointerEvents: "none" },
  dialogueBox: { background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 10, padding: "12px 14px", marginBottom: 12 },
  choices: { display: "flex", flexDirection: "column", gap: 8 },
  choiceBtn: { background: "#0c0c18", border: "1px solid #1e1e2e", color: "#ccc", borderRadius: 8, padding: "11px 14px", fontSize: 13, textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, background 0.15s", lineHeight: 1.5, display: "flex", alignItems: "flex-start", width: "100%" },
  result: { background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px" },
  endWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, minHeight: "100vh" },
  endBtn: { background: "#0c0c18", border: "1px solid #2a2a3a", color: "#ccc", borderRadius: 8, padding: "11px 28px", fontSize: 13, cursor: "pointer" },
};

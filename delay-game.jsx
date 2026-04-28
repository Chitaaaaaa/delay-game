import { useState, useEffect, useCallback } from "react";

const TOTAL_WEEKS = 24;
const BASE_PROGRESS = 1;

function weekDisplay(week) {
  const month = Math.ceil(week / 4);
  const weekOfMonth = ((week - 1) % 4) + 1;
  return { month, weekOfMonth, label: `第${month}月 第${weekOfMonth}周` };
}

// ---- Patch 19 helpers ------------------------------------------------------

function getWeeklyBudgetDrain(month) {
  if (month <= 2) return 2;
  if (month <= 4) return 4;
  return 6;
}

function getKpiBudgetMultiplier(kpiState) {
  if (kpiState === "tight") return 1.3;
  if (kpiState === "loose") return 0.9;
  return 1.0;
}

function getMoraleEfficiency(morale) {
  if (morale >= 80) return 1.2;
  if (morale >= 50) return 1.0;
  if (morale >= 35) return 0.8;
  if (morale >= 20) return 0.6;
  return 0.4;
}

function getMoraleDecay(qualityDebt, teamSize, month) {
  const base = 1;
  const qualityPressure = Math.floor(qualityDebt / 30);
  const teamBurden = Math.max(0, teamSize - 3) * 0.5;
  const phasePressure = Math.floor((month - 1) / 2);
  return base + qualityPressure + teamBurden + phasePressure;
}

function getPeopleDecayMultiplier(peopleScore) {
  if (peopleScore >= 5) return 1.0;
  if (peopleScore >= 3) return 1.2;
  return 1.5;
}

function getCrisisComfortEffect(useCount) {
  return Math.max(10, Math.round(25 / (1 + 0.3 * useCount)));
}

function getTeamComfortEffect(useCount) {
  return Math.max(5, Math.round(10 / (1 + 0.2 * useCount)));
}

function getHiddenScore(state) {
  return state.honesty + state.people + state.quality + state.judgment + state.grit;
}

function getEndingTier(hiddenScore) {
  if (hiddenScore >= 40) return "legendary";
  if (hiddenScore >= 30) return "excellent";
  if (hiddenScore >= 20) return "profitable";
  return "average";
}

function getDirectionBudgetDelta(direction) {
  const mult = DIRECTION_TEAM_SCALE[direction]?.budgetDrainMultiplier || 1.0;
  if (mult >= 1.7) return +35;
  if (mult >= 1.4) return +25;
  if (mult >= 1.1) return +15;
  if (mult >= 0.7) return 0;
  return -15;
}

function getDirectionBudgetMsg(delta) {
  if (delta === 35) return '「老板批了立项，大项目该有这个投入。预算+35。」';
  if (delta === 25) return '「立项通过，追加了启动资金。预算+25。」';
  if (delta === 15) return '「预算批下来了。预算+15。」';
  if (delta === -15) return '「低成本项目，老板说能省就省。预算-15。」';
  return '';
}

function getQualityDebtProgressDrain(qualityDebt) {
  if (qualityDebt >= 80) return 10;
  if (qualityDebt >= 60) return 6;
  if (qualityDebt >= 40) return 3;
  return 0;
}

function getQualityDebtDrainMsg(qualityDebt) {
  if (qualityDebt >= 80) return '「积累的问题在这个月集中爆发了。进度 -10。」';
  if (qualityDebt >= 60) return '「技术债开始反噬。团队花了大量时间救火。进度 -6。」';
  if (qualityDebt >= 40) return '「这个月修了不少本不该出现的问题。进度 -3。」';
  return '';
}

function getEventWeight(eventId, kpiState) {
  const mgmt = ["corp_kpi","corp_approval","kpi_review","manpower","bet_deal",
    "market_trend","thunder","zombie_reveal","water_reveal","stock_trap",
    "blamer","quitter","brooks_law","paratrooper","meeting","firefighter"];
  const creative = ["dreamer","impulse","castle","visionary","cowboy","legacy",
    "perfectionist","preacher","lucid_p1"];

  if (kpiState === "tight") {
    if (mgmt.includes(eventId)) return 1.3;
    if (creative.includes(eventId)) return 0.7;
  }
  if (kpiState === "loose") {
    if (mgmt.includes(eventId)) return 0.7;
    if (creative.includes(eventId)) return 1.3;
  }
  return 1.0;
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
    title: "你觉得这家公司是……",
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
      { id: "handover", emoji: "🔄", label: "中途接盘", reveal: "进度+25，但前任留下了一些……或许可以称之为礼物？",            init: s => ({ ...s, progress: Math.min(40, s.progress + 25) }) },
      { id: "zombie",   emoji: "💀", label: "秽土转生", reveal: "表面进度+35……等等，这进度是真实的吗？",       init: s => ({ ...s, progress: Math.min(50, s.progress + 35), pendingEvents: ["zombie_reveal"] }) },
    ]
  },
  {
    title: "你的团队……",
    cards: [
      { id: "veteran", emoji: "🤝", label: "老团队", reveal: "士气+15，4名老手，经验足",
        init: s => ({ ...s, morale: Math.min(100, s.morale + 15), teamSlots: [
          { id: 'v1', role: 'engineer', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.1, moraleBase: 5, budgetCoeff: 1.0 } },
          { id: 'v2', role: 'designer', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.0, moraleBase: 5, budgetCoeff: 1.0 } },
          { id: 'v3', role: 'qa',       seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 0.9, moraleBase: 5, budgetCoeff: 0.9 } },
          { id: 'v4', role: 'qa', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.0, moraleBase: 5, budgetCoeff: 1.0 } },
        ]}) },
      { id: "fresh", emoji: "🌱", label: "新团队", reveal: "士气-15，2名新人，前4周效率7折",
        init: s => ({ ...s, morale: Math.max(10, s.morale - 15), teamSlots: [
          { id: 'f1', role: 'engineer', seniority: 'mid', source: 'initial', contribution: { progressEfficiency: 0.7, moraleBase: 0, budgetCoeff: 0.8 }, weeksJoined: 0 },
          { id: 'f2', role: 'designer', seniority: 'fresh', source: 'initial', contribution: { progressEfficiency: 0.7, moraleBase: 0, budgetCoeff: 0.7 }, weeksJoined: 0 },
        ]}) },
      { id: "mixed", emoji: "🎲", label: "混搭", reveal: "3人团队，士气随机波动，化学反应未知",
        init: s => {
          const roll = Math.random();
          let bonus = {};
          if (roll < 0.25) bonus = { morale: Math.max(10, s.morale - 5) };
          else if (roll < 0.75) bonus = { progressBonus: (s.progressBonus || 0) + 1 };
          else bonus = { morale: Math.min(100, s.morale + 12) };
          return { ...s, ...bonus, teamSlots: [
            { id: 'm1', role: 'engineer', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.0, moraleBase: 3, budgetCoeff: 1.0 } },
            { id: 'm2', role: 'designer', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.0, moraleBase: 3, budgetCoeff: 1.0 } },
            { id: 'm3', role: 'qa', seniority: 'fresh', source: 'initial', contribution: { progressEfficiency: 0.8, moraleBase: 2, budgetCoeff: 0.8 }, weeksJoined: 0 },
          ]};
        }},
    ]
  },
  {
    title: "你上一份工作是……",
    cards: [
      { id: "bg_designer",  emoji: "🎮", label: "策划",  reveal: "每周基础进度+1，熟悉开发节奏",          init: s => ({ ...s, progressBonus: s.progressBonus + 1, playerBackground: "designer" }) },
      { id: "bg_engineer",  emoji: "💻", label: "程序",  reveal: "每周AP+1，技术直觉好，沟通效率高",      init: s => ({ ...s, apBonusPerWeek: (s.apBonusPerWeek||0) + 1, playerBackground: "engineer" }) },
      { id: "bg_artist",    emoji: "🎨", label: "美术",  reveal: "初始士气+10，对视觉方案有品味",          init: s => ({ ...s, morale: Math.min(100, s.morale + 10), playerBackground: "artist" }) },
      { id: "bg_pm",        emoji: "📊", label: "项管",    reveal: "预算+15，向上管理有一套",               init: s => ({ ...s, budget: Math.min(130, s.budget + 15), playerBackground: "pm" }) },
      { id: "bg_outsider",  emoji: "🏦", label: "跨行业",    reveal: "预算+20，但团队对你天然怀疑，士气-10",  init: s => ({ ...s, budget: Math.min(130, s.budget + 20), morale: Math.max(10, s.morale - 10), playerBackground: "outsider" }) },
    ]
  },
  {
    title: "你从哪个行业来？",
    subtitle: "不同的过去，不同的盲点。没有超能力，但偶尔可能会有些小惊喜。",
    condition: (pickedCards) => pickedCards.some(c => c && c.id === "bg_outsider"),
    cards: [
      { id: "ind_realestate", emoji: "🏠", label: "地产",   reveal: "你懂得如何和甲方谈钱。游戏行业的人，谈判能力普遍让你失望。",   init: s => ({ ...s, industryBackground: "realestate" }) },
      { id: "ind_education",  emoji: "📚", label: "教培",   reveal: "你擅长激励人，但你低估了游戏行业有多混乱。",                 init: s => ({ ...s, industryBackground: "education" }) },
      { id: "ind_finance",    emoji: "💰", label: "金融",   reveal: "数字对你来说是母语。团队觉得你不像做游戏的。",               init: s => ({ ...s, industryBackground: "finance" }) },
      { id: "ind_film",       emoji: "🎬", label: "影视",   reveal: "你见过更大的烂摊子。这里的混乱，你不陌生。",               init: s => ({ ...s, industryBackground: "film" }) },
      { id: "ind_blockchain", emoji: "⛓️", label: "区块链/Web3", reveal: "你有一套独特的融资话术。团队第一周就在背后议论你。",    init: s => ({ ...s, industryBackground: "blockchain", morale: Math.max(10, s.morale - 10) }) },
      { id: "ind_mcn",        emoji: "📱", label: "MCN/直播", reveal: "你懂流量，懂老板要什么。但你完全不懂这个东西怎么做出来。", init: s => ({ ...s, industryBackground: "mcn" }) },
    ]
  },
];

function buildInitialState(pickedCards) {
  const years = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const marketYear = years[Math.floor(Math.random() * years.length)];
  
  let companySize = "mid";
  let projectType = "new";
  for (const card of pickedCards) {
    if (card.id === "big" || card.id === "mid" || card.id === "small") {
      companySize = card.id;
    }
    if (card.id === "new" || card.id === "handover" || card.id === "zombie") {
      projectType = card.id;
    }
  }
  
  let ipType = "none", ipActive = false;
  const ipProb = projectType === "new" ? 0.3 : projectType === "handover" ? 0.7 : 0.9;
  if (Math.random() < ipProb) {
    const strongProb = projectType === "new" ? 0.2 : projectType === "handover" ? 0.4 : 0.6;
    ipType = Math.random() < strongProb ? "strong" : "normal";
    ipActive = true;
  }
  
  let s = { week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false, lucidConfidant: null, scheduledEvents: [], lucidPhase1: null, lucidTriggered: false, bossTrust: Math.floor(Math.random() * 6) + 3, hireBurdenWeeksLeft: 0, hireBurdenRate: 0, hireScale: null, problemEmployee: null, activeBonus: 0, manpowerTriggered: false, teamSlots: [], qualityDebt: 0, gameDirection: null, directionChosen: false, directionDelayPenalty: false, marketYear, companySize, kpiState: "normal", ipType, ipActive, ipProtectUsed: 0, ipProtectCount: ipType === "strong" ? 2 : 0, ipRevealShown: false, overtimeThisWeek: false, narrationsUsed: [], consecutiveGoodMonths: 0, kpiBoostMonths: 0, manageUpCount: 0, progressLastMonth: 0, industryBackground: null, playerBackground: null, backgroundBonuses: [], honesty: 10, people: 10, quality: 10, judgment: 10, grit: 10, crisisComfortCount: 0, teamComfortCount: 0, bossTrustHitZero: false, fakeProgress: 0, honestyHintShown: false, peopleHintShown: false, qualityHintShown: false, usedActions: [], lastManageUpResult: null };
  for (const card of pickedCards) { if (card) s = card.init(s); }
  return s;
}

// ---- weekly actions --------------------------------------------------------

const CAMPUS_TAGS = ["算法竞赛参赛经历", "实习半年", "设计学院优等生", "开源项目贡献者", "游戏爱好者"];
const SOCIAL_TAGS = ["前大厂经历", "独立游戏开发者", "带过5人团队", "上线过3款产品", "擅长跨部门协作"];

const ROLE_NAMES = {
  engineer: "程序员",
  designer: "设计师",
  producer: "制作人",
  qa: "测试",
  other: "其他"
};

const SENIORITY_NAMES = {
  veteran: "老手",
  mid: "中级",
  fresh: "应届生"
};

const ROLE_EMOJI = {
  engineer: "🔨",
  designer: "🎨",
  producer: "📋",
  qa: "🔍",
  other: "🧩"
};

function getTeamProgressCoeff(slots, gameDirection) {
  const count = slots.length;
  const profile = gameDirection ? DIRECTION_TEAM_SCALE[gameDirection] : null;

  if (!profile) {
    if (count >= 4) return 1.0;
    if (count === 3) return 0.85;
    if (count === 2) return 0.65;
    if (count === 1) return 0.4;
    return 0;
  }

  if (count === 0) return 0;
  if (count === profile.sweetSpot) return 1.0;

  if (count < profile.sweetSpot) {
    const gap = profile.sweetSpot - count;
    return Math.max(0.3, 1.0 - gap * 0.2);
  }

  if (count > profile.sweetSpot) {
    const excess = count - profile.sweetSpot;
    return Math.max(0.7, 1.0 - excess * 0.1);
  }

  return 1.0;
}

function getDirectionMismatchPenalty(gameDirection, marketYear) {
  if (!gameDirection) return 15;
  const yearData = YEAR_DATA[marketYear];
  if (!yearData) return 15;
  if (yearData.hot.includes(gameDirection)) return 0;
  if (yearData.mocked === gameDirection) return 15;
  return 30;
}

function getProductHealthScore(qualityDebt, gameDirection, marketYear) {
  const directionPenalty = getDirectionMismatchPenalty(gameDirection, marketYear);
  return 100 - qualityDebt * 0.7 - directionPenalty * 0.3;
}

function getProductHealthTier(score) {
  if (score >= 75) return { tier: "upup", emoji: "⬆️", label: "团队对这个游戏有信心", healMult: 1.15, dmgMult: 1.0 };
  if (score >= 45) return { tier: "normal", emoji: "➡️", label: "大家在正常推进", healMult: 1.0, dmgMult: 1.0 };
  if (score >= 20) return { tier: "down", emoji: "⬇️", label: "团队开始质疑这个游戏的方向", healMult: 0.85, dmgMult: 1.1 };
  return { tier: "downdown", emoji: "⚠️", label: "团队私下都知道这个游戏有问题", healMult: 0.7, dmgMult: 1.2 };
}

const ACTIONS = [
  { id: "push",    emoji: "🔨", label: "冲进度",   ap: 2, desc: "进度+10  士气-4",        always: true,
    available: s => s.teamSlots.length > 0,
    apply: s => ({ ...s, progress: Math.min(100, s.progress + 10), morale: Math.max(0, s.morale - 4) }) },
  { id: "care",    emoji: "💬", label: "团队关怀",  ap: 1, desc: "士气+5",              always: true,
    available: () => true,
    apply: s => {
      let moraleGain = 5;
      if (s.industryBackground === "education") moraleGain = Math.round(moraleGain * 1.3);
      if (s.industryBackground === "finance") moraleGain = Math.round(moraleGain * 0.7);
      if (s.industryBackground === "blockchain") moraleGain = Math.round(moraleGain * 0.6);
      return { ...s, morale: Math.min(100, s.morale + moraleGain), teamComfortCount: s.teamComfortCount + 1 };
    } },
  { id: "comfort", emoji: "🆘", label: "危机安抚",  ap: 2, desc: "士气+10（士气<35时）",   always: false,
    available: s => s.morale < 35,
    apply: s => ({ ...s, morale: Math.min(100, s.morale + 10), crisisComfortCount: s.crisisComfortCount + 1 }) },
  { id: "finance", emoji: "💸", label: "紧急融资",  ap: 3, desc: "预算+18~32（预算<25时）", always: false,
    available: s => s.budget < 25,
    apply: s => {
      let gain = 18 + Math.floor(Math.random() * 15);
      let missChance = 0.4;
      if (s.industryBackground === "realestate") gain = Math.round(gain * 1.5);
      if (s.industryBackground === "blockchain") gain = Math.round(gain * 2.0);
      if (s.industryBackground === "finance") missChance = 0.2;
      const hit = Math.random() < missChance;
      return { ...s, budget: Math.min(100, s.budget + gain), morale: hit ? Math.max(0, s.morale - 10) : s.morale, grit: Math.max(0, s.grit - 2) };
    } },
  { id: "freeze",  emoji: "🔒", label: "需求冻结",  ap: 3, desc: "进度+8  士气-5（第3-4月，一次性）", always: false,
    available: (s, ctx) => s.week >= 9 && s.week <= 16 && !ctx.freezeDone,
    apply: s => ({ ...s, progress: Math.min(100, s.progress + 8), morale: Math.max(0, s.morale - 5) }) },
  { id: "techcheck", emoji: "🧪", label: "技术健康检查", ap: 2, desc: "质量债-15", always: true,
    available: s => true,
    apply: s => ({ ...s, qualityDebt: Math.max(0, s.qualityDebt - 15), quality: Math.min(10, s.quality + 1) }) },
  { id: "campus", emoji: "🎓", label: "校招", ap: 1, desc: "招新人（月1-2限时）", always: false,
    available: s => s.week <= 8 && s.teamSlots.length < 6,
    apply: s => s },
  { id: "social", emoji: "💼", label: "社招", ap: 2, desc: "招老手  预算-15", always: false,
    available: s => s.budget >= 15 && s.teamSlots.length < 6,
    apply: s => s },
  { id: "layoff", emoji: "🚪", label: "清洗人员", ap: 2, desc: "移除一名成员  信任-1  士气-10", always: false,
    available: s => s.teamSlots.length > 0,
    apply: s => s },
  { id: "cut",     emoji: "✂️", label: "砍功能",    ap: 1, desc: "进度+12  士气-10  预算+5（第5-6月）", always: false,
    available: s => s.week >= 17 && !(s.ipType === "strong" && s.qualityDebt >= 60),
    apply: s => {
      if (s.ipType === "strong" && s.qualityDebt >= 60) return s;
      let newState = { ...s, progress: Math.min(100, s.progress + 12), morale: Math.max(0, s.morale - 10), budget: Math.min(100, s.budget + 5), qualityDebt: Math.min(100, s.qualityDebt + 12) };
      if (s.ipType === "strong" && s.qualityDebt >= 40) {
        newState.qualityDebt = Math.min(100, newState.qualityDebt + 5);
        newState.morale = Math.max(0, newState.morale - 3);
      }
      return newState;
    }},
  { id: "sprint",  emoji: "🚀", label: "全员冲刺",  ap: 2, desc: "进度+18  士气-15（第5-6月）", always: false,
    available: s => s.week >= 17,
    apply: s => ({ ...s, progress: Math.min(100, s.progress + 18), morale: Math.max(0, s.morale - 15), qualityDebt: Math.min(100, s.qualityDebt + 8), overtimeThisWeek: true }) },
  { id: "verify", emoji: "🔎", label: "深入验收", ap: 2, desc: "解锁本月 milestone B 选项（看原始 build）", always: false,
    available: (s, ctx) => ctx.isMonthEnd && !s.verifyUsedThisMonth,
    apply: s => ({ ...s, verifyUsedThisMonth: true }) },
  { id: "manage_up", emoji: "☕", label: "向上管理", ap: 2, desc: "老板信任度±1（概率）", always: true,
    available: s => s.bossTrust < 10,
    apply: s => {
      const successRate = s.bossTrust >= 7 ? 0.75 : s.bossTrust <= 3 ? 0.50 : 0.65;
      const success = Math.random() < successRate;
      const trustGain = success ? 1 : -1;
      return {
        ...s,
        bossTrust: Math.max(0, Math.min(10, s.bossTrust + trustGain)),
        manageUpCount: (s.manageUpCount || 0) + 1,
        lastManageUpResult: success ? "success" : "fail",
      };
    } },
];

// ---- events ----------------------------------------------------------------

// ---- milestone helpers -----------------------------------------------------

const BOSS_OK = "「老板那边收到了你的月度汇报。他回复了一个大拇指。」";
const BOSS_NG = "「老板那边收到了修正后的数字。他沉默了两分钟，然后发来：『下个月盯紧点。』」";

const BOSS_TALK = {
  id: "boss_talk",
  name: "谈话",
  emoji: "🪑",
  color: "#dc2626",
  tagline: "Tom让你下午去他办公室，「我们谈谈吧。」",
  situation: "你来到了Tom的办公室，边上是一语不发的老板。",
  dialogue: "Tom一如既往没有废话。而边上的老板自始至终没有说话。\n\n「我最近对这个项目不是很放心。你知道我在说什么。\n我需要你告诉我们——这个游戏，还能做出来吗？」\n\n你看了一眼窗外，阴沉沉的天下起了淅淅沥沥的雨。",
};
const CONFIDANT_REVEALS = {
  1: {
    emotional: "大家跟着做，其实不知道方向是什么",
    technical: "那个原型昨晚才做，正式开发还没开始",
    political: "美术老大和程序老大对方向理解完全不一样，没人敢说"
  },
  2: {
    emotional: "咱们的核心玩法说是做了差异化……但实际上这个差异化抹掉了核心的乐趣点，主策打算让数值补救，然而数值发现这个战斗就没有解析解。但没人敢提。",
    technical: "上次十分钟演示顺畅，一半是因为关了碰撞检测，一半全靠策划的神之剪辑手法……",
    political: "总监上次说的方向和这次演示不是一套……这演示明天就要见总监，还不知道总监会发什么雷霆怒火"
  },
  3: {
    emotional: "QA组集体开始看机会了，有两个人拿到了offer打算带着大家一起跑",
    technical: "全流程跑通是靠手动跳过了三个报错",
    political: "QA的KPI是多提BUG，程序有千行BUG率要求，两边目标永远不可能对上"
  },
  4: {
    emotional: "内容组的活越来越像流水线，几个核心策划开始只求过验收，不管好不好玩",
    technical: "60%里有大量外包资源，交付了不等于能用；至于技术整合……不知道哪年才能开始",
    political: "策划为了预算能过报低了，但美术对接的供应商可不会给咱们降价"
  },
  5: {
    emotional: "两个职能组老大私下说这个项目上线即死亡，不如趁早找工作",
    technical: "发行方空降了一个新领导，提的几个问题和我们这个项目根本毫无关联",
    political: "发行方和老板谈了另一个版本的合作方案，没有通知制作人"
  }
};

const ZOMBIE_REVEAL = {
  id: "zombie_reveal", name: "进度泡沫", emoji: "💣", color: "#ef4444",
  tagline: "「这进度……你不会真信了吧」",
  situation: "你深入了解项目后才发现：",
  dialogue: "所谓「进度40%」，其实包括了：外包的三套废弃美术资产、从没跑通过的技术demo，以及某个策划写的那份永远不会实现的设计文档——对了，那个策划已经离职了，没人记得他叫什么。真实完成度……大概是20%？",
  choices: [
    { text: "如实上报，重新规划",      effects: { progress: -30, morale: 0,  budget: 0  }, result: "进度打回原形。你很诚实，但上面很失望。" },
    { text: "先稳住，内部消化",        effects: { progress:  -18, morale: -12,  budget: 0  }, result: "暂时没穿帮，但团队都知道这个秘密。" },
    { text: "接受现实，从真实起点出发", effects: { progress:  -40, morale: 10,  budget: 0  }, result: "你坦然接受了一切。团队反而有点佩服你的淡定。" },
  ]
};

const LUCID_P1 = {
  id: "lucid_p1",
  name: "清醒的人",
  emoji: "🔬",
  color: "#e2e8f0",
  tagline: "「我只是说了实话。」",
  situation: "全员会议上，主程打断了老板：",
  dialogue: "「等一下——我觉得你说的不对。」\n\n会议室安静了三秒钟，老板的眼神变了。\n\n所有人都在看你。",
  choices: [
    { text: "打个圆场，接过话头", effects: { progress: 0, morale: 3, budget: 0 }, result: "气氛缓和了。他看了你一眼，什么都没说。", phase1: "A" },
    { text: "沉默，让他把话说完", effects: { progress: 0, morale: 8, budget: 0 }, result: "他说完了。团队有人在桌子下鼓掌。老板记住了这件事。", phase1: "B" },
    { text: "「这个属于细节问题，我们会后专门讨论」", effects: { progress: 0, morale: 0, budget: 0 }, result: "标准管理动作。没有人满意，也没有人受伤。", phase1: "C" },
  ]
};

const LUCID_P2 = {
  id: "lucid_p2",
  name: "清醒的人",
  emoji: "🔬",
  color: "#e2e8f0",
  tagline: "「我只是说了实话。」",
  situation: "他发消息给你，问能不能见一面：",
  dialogue: "「制作人，我最近……不太顺。你知道的。\n\n我在面试了，应该能去个好地方。你愿意帮我写封推荐信吗？」",
};

const LUCID_OUTRO = {
  external: "技术最强的人走了。老板的那个想法，不知道哪天悄悄从PRD里消失了。",
  unstable: "他留下来了。但那个会议室里的某样东西，已经变了。",
  inner: "他换了组。老板的那个想法，后来悄悄从PRD里消失了。他还在。",
};

const LUCID_P2_CHOICES = {
  A: { text: "写，祝你顺利", effects: { progress: -8, morale: -5, budget: 0 }, result: "他走了。你花了一个小时写了一封认真的推荐信。", outcome: "external" },
  B: { text: "你能不能再考虑一下", effects: { progress: -5, morale: -3, budget: 0 }, result: "他摇摇头。「不是钱的问题。」但他留下来了——心不在了。", outcome: "unstable" },
  C: { text: "我想办法帮你换一个老板关注度不高的组，先不用走", effects: { progress: -2, morale: 0, budget: -8 }, result: "花了一些政治资本，批了。他换了个组，离那个漩涡远了一些。", outcome: "inner" },
};

const HIRE_REVEAL_DATA = {
  god: {
    dialogue: "他第一周就定位了一个困扰大家半个月的bug，顺手还重构了相关模块。主程私下说：「这人是个宝。」",
    choice: { text: "很好，继续加油", effects: { progress: 5, morale: 8 }, result: "他留下来了。每周进度悄悄多了一点。", outcome: "god" },
  },
  normal: {
    dialogue: "表现正常，能按需求交付，不出乱子，也没有惊喜。对你来说，只是又多了一个需要管理的人。",
    choice: { text: "好，融入团队吧", effects: { progress: 0, morale: 0 }, result: "他融入了。你几乎记不住他的名字。", outcome: "normal" },
  },
  code: {
    dialogue: "主程发来一条消息：「这个新来的……他的代码我看了，不知道从哪里下手review。现在改他的东西比重写还慢。」",
    choice: { text: "先观察一下吧……刚招进来就开掉，老板一定会问我们面试怎么面的", effects: { progress: -3, morale: -5 }, result: "他留下来了。你不敢把重要内容交给他，但开发效率还是肉眼可见地变慢了。", outcome: "code" },
  },
  morale: {
    dialogue: "他每天中午都在说上家公司有多好，下午在群里发「感觉这个需求不合理」「这么做有意义吗」。你已经收到了三个关于他的投诉。",
    choice: { text: "谈谈心吧", effects: { progress: 0, morale: -8 }, result: "你和他谈了心，但是全程他都心不在焉。你不知道他会不会影响其他人的士气。", outcome: "morale" },
  },
};


const LUCID_INSIGHTS = {
  1: "他说：「老板其实不在乎方向，他在乎的是下周能不能在董事会上放出去。」",
  2: "他说：「MVP评审的标准是投资人设的，不是老板，他自己也不知道过线在哪里。」",
  3: "他说：「上面现在有两个声音，一个要你们快，一个要你们稳，你只听到了快的那个。」",
  4: "他说：「发行方已经在看备选项目了，你们现在是A计划，但B计划也在推。」",
  5: "他说：「验收标准上周改了，没有人通知你。」",
};

const EXTERNAL_MESSAGES = [
  "听说你们发行方最近换了负责人，我在业内听到过他的名字，小心。",
  "外面有个项目和你们方向很像，已经在测了，你知道吗？",
  "你们那个技术方案，圈子里有人评价过，我发给你看……",
  "我新公司这边说，你们老板最近在和另一家发行接触，你有数吗？",
];

const MANPOWER_EVENT = {
  id: "manpower",
  name: "人海战术",
  emoji: "👥",
  color: "#f97316",
  tagline: "「招人能解决一切问题！」",
  situation: "老板把你叫进办公室：",
  dialogue: "「开发速度一定要快。不行就加人。HR那边准备了一批简历。\n你来定，招多少都行。\n对了，我有几个推荐的候选人你看一下，都是很不错的人。」\n\n你看了一眼他发来的名单。",
  choices: [
    { text: "好，全部招进来", effects: { progress: -3, morale: -2, budget: 8, bossTrust: 1, qualityDebt: 5 }, hidden: { judgment: -1 }, result: "老板很满意，给你批了额外的预算作为补充。HR开始批量面试。你看着那份推荐名单，把它夹进了文件里。", action: "large" },
    { text: "人不是越多越好，我只招2个关键岗位", effects: { progress: 3, morale: 2, budget: -2, bossTrust: -1 }, hidden: { judgment: 1 }, result: "老板接受了你的精打细算。花了点政治资本，至少把规模压下来了。预算也被卡了一点。", action: "small" },
  ],
};

const HIRE_REVEAL_EVENT = {
  id: "hire_reveal",
  name: "新人磨合结束",
  emoji: "🎲",
  color: "#a78bfa",
  tagline: "「培训期结束了。」",
  situation: "新人开始独立作业，这几周你也看清楚了：",
};

const TRUST_DECAY_EVENTS = {
  trust_decay_hidden_progress: {
    id: "trust_decay_hidden_progress", name: "暗流", emoji: "👁️", color: "#64748b",
    tagline: "「……」",
    situation: "",
    dialogue: "上面不知道从哪里听说了一些情况。你在某次会议上注意到他的眼神变了一下。",
    choices: [
      { text: "……", effects: { bossTrust: -1 }, result: "你知道有些事情已经悄悄变了。" }
    ]
  },
  trust_decay_promise_broken: {
    id: "trust_decay_promise_broken", name: "旧账", emoji: "📋", color: "#64748b",
    tagline: "「他记着呢。」",
    situation: "",
    dialogue: "上个月的承诺，他记着呢。",
    choices: [
      { text: "……", effects: { bossTrust: -1 }, result: "你没能兑现承诺。" }
    ]
  },
};

const EVENTS = [
  {
    id: "dreamer", name: "幻想家", emoji: "✨", color: "#c084fc",
    tagline: "「我想实现的时候一定会进展顺利」",
    situation: "幻想家找到你，眼神发亮：",
    dialogue: "制作人！我昨晚想到了一个超酷的功能——城市建造系统+NPC情绪引擎+实时动态天气！直接对标最近很火的那个猛男捡树枝！我问了朋友，实现起来应该不难的！",
    choices: [
      { text: "好主意！加进去！",    effects: { progress: -3, morale:  -5, budget: 8, bossTrust: 1, qualityDebt: 8 }, hidden: { judgment: -1 }, result: "范围扩了，进度变慢，但是预算变高了。团队觉得你是一个耳根子很软的制作人。" },
      { text: "先写进愿望清单",      effects: { progress: 3, morale: -4, budget: -1, bossTrust: -2 }, hidden: { honesty: 1 }, result: "一切如常，幻想家有点失落，私下里说你很会画饼。他离开时没有说再见。" },
      { text: "做完核心玩法再说",    effects: { progress: 2, morale: 5, budget: -5, bossTrust: -1 }, hidden: { judgment: 1, quality: 1 }, result: "幻想家郁闷地走了。团队很欣赏你的坚定。但上面觉得你不愿突破。" },
    ]
  },
  {
    id: "impulse", name: "灵机一动", emoji: "💡", color: "#fbbf24",
    tagline: "「我最近玩了一个这个，我们也加一下」",
    situation: "灵机一动冲进办公室，手机屏幕冲你晃：",
    dialogue: "我最近在玩《原X》，好可爱！我们也做一个向导角色！还有《白神话》的变身机制！都加上吧！",
    choices: [
      { text: "好！美术程序都动起来！",  effects: { progress: -2, morale: -8, budget: 10, bossTrust: 1, qualityDebt: 5 }, hidden: { judgment: -1 }, result: "美术组和程序组加班加点，团队疲惫不堪。但你们折腾出来的效果为你们换到了一笔预算。" },
      { text: "做个可行性评估",          effects: { progress: -1, morale: -2, budget: -4, bossTrust: 3 }, hidden: { judgment: 1, honesty: 1 }, result: "结论：都不可行。浪费了点时间和钱，但总比全做强。" },
      { text: "我们有自己的方向，专注",  effects: { progress: 3, morale: -6, budget: -2, bossTrust: 1 }, hidden: { judgment: 1 }, result: "他有点受伤，但项目没偏轨。" },
    ]
  },
  {
    id: "castle", name: "空中楼阁", emoji: "🏰", color: "#38bdf8",
    tagline: "「先做出来再说，验证是其次」",
    situation: "空中楼阁把你叫进小会议室，压低声音：",
    dialogue: "下个月没有内部PV，就拿不到下季度预算！我不管你验证没验证完，先做一版漂亮的Demo出来！",
    choices: [
      { text: "好，全员停下来做Demo",    effects: { progress: -8, morale:  -3, budget: 12, bossTrust: 2, qualityDebt: 20 }, hidden: { honesty: -1 }, result: "预算到手了——虽然没要的那么多。核心问题被埋进去，以后会爆的。" },
      { text: "据理力争拒绝",            effects: { progress: 2, morale: 5, budget: -12, bossTrust: 2 }, hidden: { honesty: 1, grit: 1 }, result: "预算缩水了，但进度和士气都保住了。" },
      { text: "把现有进度包装成Demo",    effects: { progress: -3, morale: 3, budget: 3, bossTrust: -2, qualityDebt: 8 }, hidden: { honesty: -1 }, result: "小聪明发挥了作用，上面暂时满意了。" },
    ]
  },
  {
    id: "paratrooper", name: "伞兵", emoji: "🪂", color: "#4ade80",
    tagline: "「我不会乱动的」（但一定会的）",
    situation: "空降的这位执行制作人听说是老板花了大价钱挖来的，他在全员会议上笑着说：",
    dialogue: "大家好！我是新来的执行制作人，会辅助制作人把这个内容做好。我觉得你们做得挺好的，会尽量不动大家的东西。对了，我只是有一些小小的方向性调整……",
    choices: [
      { text: "当然！洗耳恭听！",          effects: { progress: -6, morale: -6, budget: 8, bossTrust: 3, qualityDebt: 5 }, hidden: { grit: -1 }, result: "「小小调整」= 三个月白干，方向大变。士气大受挫败，但上面很满意新的效果，批了更多预算。" },
      { text: "先完成当前里程碑再谈",       effects: { progress: 5, morale: -3, budget: -3, bossTrust: -3 }, hidden: { grit: 1 }, result: "争取到了缓冲期。但他记住这事了。从此看你的眼神都多了三分敌意。预算也被卡了。" },
      { text: "邀请他深入了解实际现状",     effects: { progress: 2, morale: 3, budget: -3, bossTrust: -1 }, hidden: { people: 1 }, result: "他理解了现状，后来的调整合理了很多。团队觉得你会办事。" },
    ]
  },
  {
    id: "perfectionist", name: "完美主义", emoji: "♾️", color: "#f87171",
    tagline: "「我们需要重构代码」",
    situation: "主程发来一份十页技术文档：",
    dialogue: "制作人，我研究了一下现有架构，技术债非常严重。如果不在这个阶段重构，后期每个功能的开发成本会翻倍。大概需要……六周。",
    choices: [
      { text: "重构！代码质量第一！",      effects: { progress: -8, morale: 10, budget: -8, bossTrust: 1, qualityDebt: -10 }, hidden: { quality: 1 }, result: "六周后代码看起来似乎是干净了，但你看见程序组有几个人看你的目光有点躲闪。" },
      { text: "局部重构最关键的部分",      effects: { progress: -3, morale: 5, budget: -5, bossTrust: 1, qualityDebt: -3 }, hidden: { quality: 1 }, result: "折中方案，程序组勉强接受。进度基本没动。" },
      { text: "先上线，后续版本再还债",    effects: { progress: 5, morale: -8, budget: 3, bossTrust: 2, qualityDebt: 10 }, hidden: { honesty: -1 }, result: "程序组心碎，但项目在往前走。上面挺满意的。" },
    ]
  },
  {
    id: "preacher", name: "布道者", emoji: "📋", color: "#2dd4bf",
    tagline: "「先建立一套完善的文档流」",
    situation: "布道者在群里发了一条很长的消息：",
    dialogue: "继续开发之前，我们应该先对齐需求文档的格式规范，建立完善文档体系。我安排了一个两天的全员工作坊……",
    choices: [
      { text: "全员参加！规范很重要！",  effects: { progress: -4, morale: 5, budget: -8, bossTrust: 2 }, hidden: { quality: 1 }, result: "规范建好了。没有一个人照着用。但大家觉得被尊重了。" },
      { text: "出个简版规范就好",        effects: { progress: -1, morale: -2, budget: -3, bossTrust: 1 }, hidden: { judgment: 1 }, result: "执行率30%，但总比没有强。三方都不满意。" },
      { text: "这个阶段结束了再搞",      effects: { progress: 3, morale: -5, budget: 0, bossTrust: -1 }, hidden: { quality: -1 }, result: "布道者很失望。进度稳住了，但流程债留着了。" },
    ]
  },
  {
    id: "firefighter", name: "救火队", emoji: "🚒", color: "#fb923c",
    tagline: "「借你50%的美术几个月」",
    situation: "来自上级的通知：",
    dialogue: "N项目下个月上线，严重缺人，需要从你们组抽调50%的美术支援三个月。你们的开发计划自行调整一下。",
    choices: [
      { text: "以大局为重，送人",          effects: { progress: -8, morale: -5, budget: 8, bossTrust: 3 }, hidden: { grit: -1 }, result: "美术走了，但上面记了你的配合。给了点预算补偿。三个月的空档期，还是很难熬。" },
      { text: "据理力争，只给20%",          effects: { progress: -3, morale: 2, budget: -5, bossTrust: 1 }, hidden: { grit: 1 }, result: "谈判部分成功，损失减半。上面不太高兴，但团队知道你替他们争取了。" },
      { text: "换延期批复+资源补偿",        effects: { progress: -2, morale: -2, budget: 8, bossTrust: -2 }, hidden: { judgment: 1 }, result: "批了延期，补了点预算。进度算保住了。" },
    ]
  },
  {
    id: "quitter", name: "减员", emoji: "🧳", color: "#94a3b8",
    tagline: "「我要离开这个伤心的城市」",
    situation: "核心程序员发来私信：",
    dialogue: "制作人……我想辞职。我跟女朋友分手了，在这个城市实在待不下去了。战斗系统我会交接好的。",
    choices: [
      { text: "升职加薪挽留！",          effects: { progress: 2, morale: 6, budget: -15, bossTrust: -1 }, hidden: { people: 1 }, result: "他留下来了，进度也稳了。但钱花出去了，心还没完全回来。" },
      { text: "祝福他，认真做好交接",    effects: { progress: -2, morale: -3, budget: -5, bossTrust: 3 }, hidden: { honesty: 1, people: 1 }, result: "交接花了三周，新人熟悉又花了一个月。人走了，活儿耽误了。但上面说处理得体。" },
      { text: "给他批一个月调整假",      effects: { progress: -2, morale: 10, budget: -8, bossTrust: -1 }, hidden: { people: 1, grit: 1 }, result: "他回来了，状态超好。团队对你刮目相看。" },
    ]
  },
  {
    id: "blamer", name: "甩锅侠", emoji: "🥏", color: "#a78bfa",
    tagline: "「不是功能没做好，是需求没提清楚」",
    situation: "程序和策划在项目群里对线起来了：",
    dialogue: "「功能做错了，两周白费！」「需求文档写得清清楚楚！」「没人看那个破文档！」两边都来找你投诉对方。",
    choices: [
      { text: "站程序：策划需求要更清晰",    effects: { progress: 2, morale: -8, budget: 2, bossTrust: -1 }, hidden: { people: -1 }, result: "策划崩溃。进度正常推进，但他们开始消极怠工。上面觉得你偏心。" },
      { text: "站策划：程序要主动沟通",      effects: { progress: 0, morale: -6, budget: 3, bossTrust: -2 }, hidden: { people: -1 }, result: "程序组寒心，开始只按字面意思做需求，进度也慢了点。" },
      { text: "拉双方当面对齐，建沟通机制",  effects: { progress: -3, morale: 8, budget: -5, bossTrust: 1 }, hidden: { people: 1, judgment: 1 }, result: "握手言和，建立了每周小对齐机制。这周白费了，但长远受益。" },
    ]
  },
  {
    id: "cowboy", name: "自由发挥", emoji: "🤠", color: "#f97316",
    tagline: "「我这么设计，耽误你的需求吗？」",
    situation: "主美做完了一个月的UI给你看效果：",
    dialogue: "制作人！我把界面全重新设计了！沉浸式无UI风格超酷！哦对了，你要的功能界面……我还没做。",
    choices: [
      { text: "哇好酷！就用这个！",            effects: { progress: -5, morale: 10, budget: -8, bossTrust: 1, qualityDebt: 5 }, hidden: { quality: -1 }, result: "测试时玩家找不到任何功能在哪。又重做了。主美很开心。" },
      { text: "先完成需求，创意留下个版本",    effects: { progress: 4, morale: -8, budget: 0, bossTrust: 1 }, hidden: { judgment: 1 }, result: "主美不开心，但需求按时交付了。" },
      { text: "保留方向但加基础UI引导",        effects: { progress: -2, morale: 3, budget: -3, bossTrust: 1, qualityDebt: 2 }, hidden: { judgment: 1, quality: 1 }, result: "折中方案，视觉和可用性都保住了。" },
    ]
  },
  {
    id: "legacy", name: "屎山", emoji: "🗻", color: "#d97706",
    tagline: "「在这上面加功能不如重写一个」",
    situation: "程序发现了一个严重问题：",
    dialogue: "存档系统要接三年前的老代码，没文档没注释，改一行可能崩十个地方。要做这个功能，必须先重写这部分。",
    choices: [
      { text: "重写！不在屎山上建高楼！",    effects: { progress: -7, morale: 8, budget: -8, bossTrust: 2, qualityDebt: -10 }, hidden: { quality: 1, grit: 1 }, result: "重写花了六周。这一个功能的代码终于干净了。" },
      { text: "小步带防护地改，写测试覆盖",  effects: { progress: -2, morale: 2, budget: -3, bossTrust: 1, qualityDebt: -3 }, hidden: { quality: 1 }, result: "慢是慢了，但改完了，没崩。稳健但不便宜。" },
      { text: "这个功能砍掉，规避问题",      effects: { progress: 3, morale: -6, budget: 3, bossTrust: -1, qualityDebt: 15 }, hidden: { honesty: -1 }, result: "功能砍了，进度和预算都好看了。屎山留给了下一任制作人。" },
    ]
  },
  {
    id: "visionary", name: "远见", emoji: "🔭", color: "#60a5fa",
    tagline: "「这个系统以后会扩展的」",
    situation: "主程兴致勃勃地找到你：",
    dialogue: "制作人，任务系统我重新设计了！考虑到以后可能做开放世界，我搭了个支撑10000任务并发的框架，还有编辑器工具、热更新接口……只需要三个月做基础框架。",
    choices: [
      { text: "太有远见了！做！",                  effects: { progress: -8, morale: 10, budget: -12, bossTrust: 3, qualityDebt: 5 }, hidden: { quality: -1 }, result: "三个月后框架搭好了。游戏里还没有一个任务。" },
      { text: "先做够用的版本，扩展性以后再说",    effects: { progress: 4, morale: -6, budget: -2, bossTrust: 1 }, hidden: { judgment: 1 }, result: "主程有点受伤，但两周做完了一个能用的系统。" },
      { text: "保留架构思路，但砍到MVP",            effects: { progress: -1, morale: 3, budget: -3, bossTrust: 2, qualityDebt: 3 }, hidden: { judgment: 1, quality: 1 }, result: "框架优雅，功能精简，两边都还能接受。" },
    ]
  },
  {
    id: "meeting", name: "铁头功", emoji: "📅", color: "#0ea5e9",
    tagline: "「这个、那个，都需要碰头会」",
    situation: "你打开本周日历，目瞪口呆：",
    dialogue: "周一全组对齐（2h）+ 周二技术评审（1.5h）+ 周三美术评审（1.5h）+ 周四跨部门同步（1h）+ 周五周总结（1h）+ 明天临时需求评估会。",
    choices: [
      { text: "全参加！保持信息同步！",          effects: { progress: -4, morale: 5, budget: 0, bossTrust: 1 }, hidden: { people: 1 }, result: "参加了所有会议。什么正事都没做。但大家觉得你很投入。" },
      { text: "只参关键会，其余授权组长",        effects: { progress: 2, morale: -3, budget: 0, bossTrust: -1 }, hidden: { judgment: 1 }, result: "关键信息没丢，大半时间找回来了。组长有点压力。" },
      { text: "推行异步更新机制，减少会议",      effects: { progress: 2, morale: -4, budget: -3, bossTrust: 1 }, hidden: { grit: 1 }, result: "效率上来了，但有人不适应，需要磨合成本。" },
    ]
  },
  {
    id: "thunder", name: "雷公", emoji: "⚡", color: "#facc15",
    tagline: "「这种事我也没法控制」",
    situation: "突发状况！",
    dialogue: "公司网络基础设施崩溃，全员居家。Build服务器挂了要修三天。美术组说家里电脑带不动引擎。",
    choices: [
      { text: "停工等待恢复",                effects: { progress: -6, morale: 5, budget: 0, bossTrust: -2 }, hidden: { grit: -1 }, result: "恢复后大家很有精神。两周白过了。" },
      { text: "能做什么做什么",              effects: { progress: -1, morale: -3, budget: -3, bossTrust: 2 }, hidden: { grit: 1 }, result: "效率减半，但至少在推进。大家都很累。" },
      { text: "租云端开发环境保效率",        effects: { progress: 0, morale: 8, budget: -12, bossTrust: 2 }, hidden: { people: 1, judgment: 1 }, result: "花了不少钱，开发基本没停。团队很感激。" },
    ]
  },
  // For pendingEvents trigger only
  {
    id: "water_reveal", name: "进度修正", emoji: "💧", color: "#64748b",
    tagline: "「所以那个数字……」",
    situation: "你在复盘上个月的里程碑，翻到了一些细节：",
    dialogue: "那两个「完整关卡」——你亲自去跑测了一下，发现一个是美术场景，没有碰撞体，走进去会穿模；另一个通关逻辑还没写，只能走到中间。\n你又打开了当时他们给你的演示视频，确实能跑，但只在那一张专用测试地图上。\n你打开进度表，盯着那几个数字看了很久。",
    choices: [
      { text: "召集团队重新对齐真实进度", effects: { progress: -5, morale: -5, budget: 3, bossTrust: 3 }, hidden: { honesty: 1, grit: 1 }, result: "会议上你当众指出了问题。有人沉默，有人低头。气氛很糟，但你终于知道自己在哪里。" },
      { text: "私下找主程重新评估",        effects: { progress: -3, morale: 0, budget: -3, bossTrust: 2, qualityDebt: 10 }, hidden: { honesty: 1 }, result: "花了两天重新盘了一遍。数字调小了。只有你们两个人知道。" },
      { text: "默默调整内心预期",          effects: { progress: -2, morale: 2, budget: 0, bossTrust: -2, qualityDebt: 5 }, hidden: { honesty: -1 }, result: "你一个人坐着，把进度表里几个数字改小了。没有人知道。你也不确定这样做对不对。" },
    ]
  },
  // ---- 大公司病 ----
  {
    id: "corp_kpi", name: "KPI季", emoji: "📊", color: "#7678f0",
    tagline: "「季度OKR必须今天提交」",
    situation: "HR发来通知：",
    dialogue: "本季度OKR填报截止今日。格式要求：17栏Excel，需要部门主管、技术Lead、项目负责人三方签字，上传至内网OA系统（注意：OA系统今天维护，需等下午三点后上传）。",
    choices: [
      { text: "全员认真填，合规为上",        effects: { progress: -2, morale: -5, budget: 2, bossTrust: 3 }, hidden: { honesty: 1 }, result: "规规矩矩填完了。团队花了整整一天半。没有一个字会被人看到。" },
      { text: "复制去年的改改",              effects: { progress: 0, morale: -2, budget: 0, bossTrust: -1 }, hidden: { honesty: -1 }, result: "敷衍了事。系统审核居然过了。" },
      { text: "你来填，让团队继续开发",      effects: { progress: 1, morale: 5, budget: -3, bossTrust: -2 }, hidden: { people: 1, grit: 1 }, result: "你一个人扛了所有行政工作。团队很感激你。你很累。" },
    ]
  },
  {
    id: "corp_approval", name: "18层审批", emoji: "📝", color: "#8b5cf6",
    tagline: "「这个需要走完整流程」",
    situation: "一个新的技术方案需要审批：",
    dialogue: "但是摆在你面前的是一个很长的流程：需求评审→技术评审→总监确认→PMO备案→财务评估→法务审查→CTO审批→……预计走完需要三周。\n这意味着，三周之后，你才能着手开发。原则上这期间开发不能进行依赖此方案的任何功能。",
    choices: [
      { text: "走完全流程，合规操作",        effects: { progress: -4, morale: -3, budget: 0, bossTrust: 3 }, hidden: { honesty: 1 }, result: "三周后终于批了。你学会了什么叫「等待」。" },
      { text: "找关键人直接拍板",            effects: { progress: -1, morale: 0, budget: -5, bossTrust: -1 }, hidden: { honesty: -1, grit: 1 }, result: "请了个饭，三天搞定。有人在背后说你「不走程序」。" },
      { text: "先做，边走流程边推进",        effects: { progress: 2, morale: -3, budget: 0, bossTrust: -2, qualityDebt: 3 }, hidden: { honesty: -1 }, result: "进度推了，但批复下来发现需要改动。还好改动不大。" },
    ]
  },
  // ---- 市场热潮 ----
  {
    id: "market_trend", name: "跟风热", emoji: "🌊", color: "#06b6d4",
    tagline: "「这个方向现在很热，我们也要做」",
    situation: "老板看到了一篇爆款分析文章，紧急拉你开会：",
    dialogue: "《极寒幸存者》这周月流水破亿！生存建造类型现在最热！我们的游戏能不能加入这个元素？或者干脆转型？你来评估一下，下周给我方案。",
    choices: [
      { text: "全力融入，方向转型",                effects: { progress: -6, morale: 3, budget: -5, bossTrust: 2, qualityDebt: 8 }, hidden: { judgment: -1 }, result: "兴奋持续了三天。团队发现转型意味着三个月白干。" },
      { text: "表面融入，加个「探索模式」",        effects: { progress: -2, morale: -2, budget: -3, bossTrust: 1, qualityDebt: 5 }, hidden: { honesty: -1 }, result: "做出了一个四不像。玩家不买账，老板也不满意。" },
      { text: "礼貌拒绝，坚守核心方向",            effects: { progress: 1, morale: -5, budget: 0, bossTrust: -2 }, hidden: { judgment: 1, grit: 1 }, result: "老板有点不开心。但项目没乱。不久后那个热点凉了。" },
    ]
  },
  // ---- P3 新事件 ----
  {
    id: "bet_deal", name: "对赌协议", emoji: "🎰", color: "#dc2626",
    tagline: "「本季度营收未达标，全员奖金缩水」",
    situation: "财务发来一封邮件：",
    dialogue: "根据对赌协议条款，本季度公司营收未达预期，全员季度奖金将缩水50%。你的项目团队已经知道了这个消息……你没有办法阻止这件事，但你需要应对它。",
    choices: [
      { text: "召开全员会议，稳定军心",      effects: { progress: -1, morale: -5, budget: 0, bossTrust: 2 }, hidden: { people: 1 }, result: "你说了很多鼓励的话。大家礼貌地鼓了掌。士气还是跌了。" },
      { text: "加大画饼，许诺上线奖励",      effects: { progress: 1, morale: -3, budget: 0, bossTrust: -2, qualityDebt: 3 }, hidden: { honesty: -1 }, result: "一半人信了。另一半人开始悄悄更新简历。" },
      { text: "私下里补贴几个核心成员",    effects: { progress: 1, morale: 8, budget: -15, bossTrust: 2 }, hidden: { people: 1, grit: 1 }, result: "你赢得了一些信心。代价是项目的预算。" },
    ]
  },
  {
    id: "stock_trap", name: "股票绑架", emoji: "📈", color: "#16a34a",
    tagline: "「走也不是，留也不是」",
    situation: "主程私下找到你：",
    dialogue: "制作人，我有个事……我手上有公司期权，归属期还有8个月，但我已经拿到了一个好offer。走的话期权全没了，但留下来……你懂的，我现在状态确实不太行。",
choices: [
      { text: "留住他，给他更好的条件",          effects: { progress: 1, morale: -2, budget: -8, bossTrust: 3, qualityDebt: 3 }, hidden: { people: 1 }, result: "他留下来了，状态还是不太好。但上面觉得你留住了关键人才。" },
      { text: "放他走，快速启动交接",             effects: { progress: -2, morale: 3, budget: -3, bossTrust: 2 }, hidden: { honesty: 1, people: 1 }, result: "他感激你的理解。交接很痛苦，但完成后团队反而透了口气。" },
      { text: "帮他争取调岗，换个环境再撑撑",    effects: { progress: -2, morale: 5, budget: 0, bossTrust: -2 }, hidden: { people: 1 }, result: "调岗批了，他换了组。你消耗了政治资本，但留住了关系。" },
    ]
  },
  {
    id: "brooks_law", name: "救场招人", emoji: "🧑‍💼", color: "#7c3aed",
    tagline: "「加人就能加快进度」（真的吗？）",
    situation: "进度落后，你考虑紧急扩充团队：",
    dialogue: "HR说有三个候选人可以快速入职。但你的老程序说：「加人只会让我们更慢，至少前一个月。」人月神话你不是没读过……",
    choices: [
      { text: "大量招人，相信人海战术",        effects: { progress: -4, morale: -5, budget: -10, bossTrust: 3, qualityDebt: 5 }, hidden: { judgment: -1 }, result: "新人带教拖慢了节奏。但老板满意你响应迅速。四周后才看到效果。" },
      { text: "只招一个最关键岗位",            effects: { progress: -1, morale: -2, budget: -5, bossTrust: 2 }, hidden: { judgment: 1 }, result: "带教成本尚可。三周后那个人开始产出。谨慎但有效。" },
      { text: "不招人，靠现有团队硬扛",        effects: { progress: 3, morale: -6, budget: 0, bossTrust: -1, qualityDebt: 3 }, hidden: { grit: 1 }, result: "团队压力很大，但没有被新人拖慢。进度稳住了。" },
    ]
  },
  {
    id: "kpi_review", name: "KPI施压", emoji: "📉", color: "#9333ea",
    tagline: "「你觉得这个进度正常吗？」",
    situation: "季度复盘会上，领导把一个数字推到你面前：",
    dialogue: "「项目进度看起来……有点慢啊。我们下个季度的KPI目标是这个数，你觉得能完成吗？」那个数字需要你接下来每周产出翻倍。",
    choices: [
      { text: "拍胸脯保证，完不成自罚",          effects: { progress: 1, morale: -5, budget: 0, bossTrust: 3, qualityDebt: 5 }, hidden: { honesty: -1 }, result: "领导满意地点头。团队听说了，集体沉默。你用承诺换了信任。" },
      { text: "如实分析风险，提出可达目标",        effects: { progress: 1, morale: 3, budget: -2, bossTrust: 1 }, hidden: { honesty: 1, grit: 1 }, result: "领导皱了皱眉，但接受了合理目标。团队觉得你靠谱。" },
      { text: "用漂亮的PPT转移注意力",            effects: { progress: -1, morale: 2, budget: -3, bossTrust: -1, qualityDebt: 3 }, hidden: { honesty: -1 }, result: "这周做PPT了，没做正事。但领导暂时满意了。" },
    ]
  },
  MANPOWER_EVENT,
];

function getTeamShortageEvent(direction, count, profile) {
  const size = profile.projectTeamSize;
  const need = profile.sweetSpot;
  return {
    id: "team_shortage",
    name: "人手不足",
    emoji: "👤",
    color: "#f97316",
    tagline: "有些职能根本没人管",
    situation: "你看着排期表，发现——",
    dialogue: `${size}人的项目，核心管理层只有${count}个人。
有些职能直接没人管，下面的人不知道该听谁的。
${count < need - 1 ? "现在不是效率问题，是有些事情根本没人做。" : "勉强能转，但每个人都在超负荷。"}`,
    choices: [
      {
        text: "赶工补上，核心团队顶上去。",
        effects: { progress: 3, morale: -5, budget: 0, bossTrust: -1, qualityDebt: 10 },
        result: "你让每个人多管一摊。进度是动了，但粗糙得让人心虚。",
        hidden: { grit: 1 },
      },
      {
        text: "紧急招人，预算不是现在省的时候。",
        effects: { progress: 0, morale: 3, budget: -8, bossTrust: 1 },
        result: "你批了招聘。人还没到，但团队知道你在解决问题。",
        hidden: { people: 1 },
      },
      {
        text: "调整目标，做少做精。",
        effects: { progress: -5, morale: 3, budget: 0, bossTrust: 2, qualityDebt: -5 },
        result: "你砍了一些非核心需求。团队松了口气，但老板问你怎么进度慢了。",
        hidden: { judgment: 1 },
      },
    ],
  };
}

function getTeamOvercrowdEvent(direction, count, profile) {
  const size = profile.projectTeamSize;
  return {
    id: "team_overcrowd",
    name: "人浮于事",
    emoji: "🪑",
    color: "#94a3b8",
    tagline: "有人在工位上刷手机",
    situation: "你路过办公区，注意到——",
    dialogue: `${count}个核心管理层，${size}人的项目。
有些人在工位上刷手机。不是他们不努力，是不知道该干什么。
指挥链太长了，决策比执行慢。`,
    choices: [
      {
        text: "精简团队，只留关键岗。",
        effects: { progress: 0, morale: -8, budget: 8, bossTrust: 1 },
        result: "你裁了两个人。剩下的效率反而上来了，但没人说你好。",
        hidden: { people: -1, grit: 1 },
      },
      {
        text: "给闲置的人找事做——开拓新方向。",
        effects: { progress: 3, morale: -2, budget: -5, bossTrust: -1, qualityDebt: 5 },
        result: "多了几个副项目。主进度快了点，但精力更分散了。",
        hidden: { judgment: -1 },
      },
      {
        text: "不管，让它自然消化。",
        effects: { progress: 0, morale: -2, budget: -3, bossTrust: 1 },
        result: "多出来的人慢慢找到了位置。也可能没有。预算在烧。",
        hidden: {},
      },
    ],
  };
}

const DIRECTION_SPECIFIC_EVENTS = [
  {
    id: "dir_openworld_scope",
    direction: "OPENWORLD",
    minWeek: 9,
    name: "范围蔓延",
    emoji: "🗺️",
    color: "#38bdf8",
    tagline: "「12个区域，还是7个？」",
    situation: "策划提交了一份区域清单：",
    dialogue: "清单上有12个区域，按优先级排列。前5个是核心区域，已经开工。后7个是如果来得及的区域——其中3个有独特的玩法设计，2个是风景打卡点，还有2个是玩家会期待的标准配置。程序组说：按现有速度，最多再做3个。",
    choices: [
      { text: "全部做，加人加班。", effects: { progress: -3, morale: -2, budget: -5, bossTrust: 3, qualityDebt: 15 }, hidden: { quality: -1 }, result: "三个月后，12个区域都有了。每个区域的深度，大约是你最初设计的三分之一。" },
      { text: "砍到7个，保证每个区域有内容。", effects: { progress: 3, morale: -5, budget: 0, bossTrust: -2, qualityDebt: 3 }, hidden: { quality: 1 }, result: "7个区域，每个都至少有2小时内容。策划在群里发了一张图：原本的12区地图，5个被划掉了。" },
      { text: "核心5个做深，后7个做浅——开放世界本来就是看风景。", effects: { progress: 3, morale: 2, budget: -3, bossTrust: -1, qualityDebt: 8 }, hidden: { judgment: -1 }, result: "5个区域有深度，7个区域是空壳。上线后，有玩家发帖：这个世界很大，但是空的。" },
    ]
  },
  {
    id: "dir_br_rival",
    direction: "BATTLE_ROYALE",
    minWeek: 6,
    name: "对手抢先",
    emoji: "🪂",
    color: "#f97316",
    tagline: "「他们比我们早两周。」",
    situation: "运营组发来一条消息：",
    dialogue: "隔壁那家吃鸡今天上线了。我们看了一下，品质一般，但他们赶在前面了。用户评论第一条：又是吃鸡，又一个换皮。你看了看自己的进度表。如果加速，两周内也能上。但那个版本你还记得QA上周的报告。",
    choices: [
      { text: "加速赶工，两周内上线。", effects: { progress: 6, morale: -8, budget: 0, bossTrust: 2, qualityDebt: 12 }, hidden: { grit: -1 }, result: "你赶上了。上线首日DAU还行，但第二天留存你让运营不要把数据发到群里。" },
      { text: "按节奏做，品质第一。", effects: { progress: -2, morale: 3, budget: 0, bossTrust: -1 }, hidden: { grit: 1 }, result: "你多花了三周。上线时，市场上已经有四款吃鸡了。但你的评分是它们中最高的。没有人发朋友圈庆祝。" },
      { text: "调整方向，避开正面竞争——我们做差异化玩法。", effects: { progress: -4, morale: 2, budget: -5, bossTrust: 1 }, hidden: { judgment: -1 }, result: "你花了两天开会，定了一个新的差异化方向。程序组说可以做，但之前的内容要砍掉40%。你在会议室里坐了很久。" },
    ]
  },
  {
    id: "dir_openworld_depth",
    direction: "OPENWORLD",
    minWeek: 16,
    name: "深度不足",
    emoji: "🕳️",
    color: "#38bdf8",
    tagline: "玩家说，看完了，然后呢？",
    situation: "内测反馈整理出来了：",
    dialogue: "你花了两个小时看玩家反馈。大部分人说画面好，地图大。但有一条评论被点了200个赞：风景看完了，然后呢？每个村庄的NPC说一样的话，每个地牢的怪物换了个皮。你打开内容完成度表，核心区域的主线完成率82%，支线完成率37%，随机事件完成率11%。",
    choices: [
      { text: "砍地图面积，把内容密度提上去。", effects: { progress: -5, morale: 3, budget: -5, qualityDebt: -8 }, hidden: { quality: 1 }, result: "你砍掉了3个区域的面积，把内容集中到剩下的区域里。地图缩小了20%，但每个角落都有东西做。" },
      { text: "招文案和任务设计师，补支线内容。", effects: { progress: -2, budget: -12, qualityDebt: 3 }, hidden: { judgment: 1 }, result: "招了5个人写任务。两个月后支线完成率从37%到了65%。但新人写的任务风格不统一。" },
      { text: "用系统生成填充——程序化任务。", effects: { progress: 3, budget: -5, qualityDebt: 12 }, hidden: { quality: -1 }, result: "程序化内容上线了。玩家第一天觉得新鲜，第二天发现规律，第三天写了长文分析算法模板。" },
    ]
  },
  {
    id: "dir_br_server",
    direction: "BATTLE_ROYALE",
    minWeek: 14,
    name: "服务器崩溃",
    emoji: "💥",
    color: "#f97316",
    tagline: "50人同时掉线了",
    situation: "压测数据出来了：",
    dialogue: "技术主管的脸色很不好看。压测报告上写：100人同场景，帧率稳定。200人同场景，帧率波动。50人同场景但其中30人在同一建筑内，服务器开始丢包。他放下报告说：这不是优化的问题，是架构的问题。要彻底解决，需要重写同步层。至少四周。",
    choices: [
      { text: "重写。这是核心功能，不能上线后翻车。", effects: { progress: -8, morale: 5, budget: -10, qualityDebt: -8 }, hidden: { quality: 1 }, result: "四周后同步层重写完了。压测过了。但进度掉了两周。" },
      { text: "做场景拆分和人数上限，不重写架构。", effects: { progress: -2, morale: -3, budget: -3, qualityDebt: 5 }, hidden: { grit: 1 }, result: "你把单场景人数上限从50改成了30，做了场景拆分。玩家不会注意到限制——除非他们真的挤在一起。" },
      { text: "先上，出了问题再修。", effects: { progress: 3, morale: -5, qualityDebt: 15, bossTrust: -1 }, hidden: { honesty: -1 }, result: "你决定赌一把。上线第一天，热门时段直接炸服。" },
    ]
  },
  {
    id: "dir_anime_gacha",
    direction: "ANIME",
    minWeek: 12,
    name: "抽卡节奏",
    emoji: "🎴",
    color: "#ec4899",
    tagline: "免费石头给太多了？",
    situation: "运营和策划吵起来了：",
    dialogue: "运营说：内测数据出来了，免费石头太多，玩家抽卡意愿不够。付费率只有2.3%。策划说：石头少了我怎么留人？二游的核心就是养成节奏！运营翻开竞品数据：隔壁付费率5.8%，他们的免费石头只有我们的一半。你看了看设计表，当前方案玩家3天一个十连，竞品是5天。",
    choices: [
      { text: "削减免费产出，推付费。", effects: { morale: -8, budget: 8, bossTrust: 2 }, hidden: { people: -1 }, result: "改了。付费率确实上去了，到4.1%。但社区里出现了一个帖子标题：制作人是不是想钱想疯了？" },
      { text: "保持节奏，靠皮肤和限定池赚。", effects: { progress: -3, budget: -5, morale: 3 }, hidden: { judgment: 1 }, result: "你坚持了养成节奏。皮肤和限定池的收入比预期少了20%，但DAU比竞品高了30%。" },
      { text: "折中——主线石头不变，砍日常石头。", effects: { morale: -3, budget: 3, qualityDebt: 3 }, hidden: { quality: -1 }, result: "数字上看起来两全其美。但玩家很快就算出来了：总产出少了15%。社区用暗改这个词。" },
    ]
  },
  {
    id: "dir_slg_alliance",
    direction: "SLG",
    minWeek: 15,
    name: "盟主出走",
    emoji: "🏰",
    color: "#0ea5e9",
    tagline: "我们服的第一联盟解散了",
    situation: "运营发来紧急消息：",
    dialogue: "1服最大的联盟盟主今天发公告退游了。原因是对上周更新的兵种平衡不满。他带着200个核心成员去了竞品。1服的流水占我们总流水的15%。他在论坛发了一篇帖子，标题是一个SLG老玩家的告别，写得很走心。回复已经500+了。",
    choices: [
      { text: "回滚兵种平衡，在社区公开道歉。", effects: { progress: -5, morale: 5, budget: -5, bossTrust: -2 }, hidden: { people: 1 }, result: "你回了。盟主发了一条消息：还在看。但200人里只回来了40个。" },
      { text: "坚持平衡改动，但给流失用户专属回归礼包。", effects: { morale: -3, budget: -8, bossTrust: 1 }, hidden: { honesty: 1 }, result: "礼包做了。回来的不到20人。但剩下的玩家觉得你在认真做平衡。" },
      { text: "安插内部运营号接管联盟，维持活跃假象。", effects: { budget: -5, qualityDebt: 8 }, hidden: { honesty: -1 }, result: "托号上线了。联盟数字还在，但假的就是假的。两个月后有人扒出来盟主是内部人员。" },
    ]
  },
  {
    id: "dir_ai_cost",
    direction: "AI_NATIVE",
    minWeek: 12,
    name: "训练成本",
    emoji: "💰",
    color: "#8b5cf6",
    tagline: "这个月的API账单你看了吗？",
    situation: "财务发来一张表格：",
    dialogue: "AI服务的月度账单：上个月8万，这个月12万，趋势是每月增长40%。你算了一下，按这个速度，三个月后光AI调用费就占项目预算的25%。技术说可以自建模型降低成本，但前期投入需要30万。运营说可以降级模型精度，但对话质量会明显下降。",
    choices: [
      { text: "投资自建模型，长线省钱。", effects: { progress: -5, budget: -15, qualityDebt: -5 }, hidden: { judgment: 1 }, result: "你批了30万。三个月后调用费降到了2万/月。但前三个月的账单加在一起，财务每个例会上都会提一次。" },
      { text: "降级模型，控制成本。", effects: { budget: 5, progress: -2, qualityDebt: 10 }, hidden: { quality: -1 }, result: "换了便宜模型。对话确实变蠢了——玩家开始截图NPC的弱智发言发到论坛。" },
      { text: "砍AI功能，只保留核心场景的AI对话。", effects: { progress: -3, budget: -3, morale: -5 }, hidden: { grit: 1 }, result: "你砍掉了70%的AI交互场景。剩下的30%确实够用。团队里有人问：那我们还是AI原生吗？你没有回答。" },
    ]
  },
  {
    id: "dir_romance_copycat",
    direction: "ROMANCE",
    minWeek: 14,
    name: "抄袭指控",
    emoji: "⚖️",
    color: "#ec4899",
    tagline: "你家男主是不是抄的？",
    situation: "微博热搜第43位：",
    dialogue: "一个画师发了一组对比图，左边是你们游戏的男主立绘，右边是她两年前的原创角色。相似度……说实话，有60%。不是1:1抄袭，但构图、配色、表情角度确实像。评论区已经分成了两派：一派在骂你们，一派在说碰瓷。法务看了说：法律上不一定构成抄袭，但舆论上你们已经输了。",
    choices: [
      { text: "公开回应，提供设计过程文档自证。", effects: { progress: -3, morale: 3, budget: -3, bossTrust: 1 }, hidden: { honesty: 1 }, result: "你整理了从草图到定稿的12版迭代过程，发了长文。画师删了原帖。但热度已经过了。" },
      { text: "私下和解，给画师一笔补偿。", effects: { budget: -10, morale: -3, bossTrust: -1 }, hidden: { people: 1 }, result: "你让人联系了画师，给了一笔合作费。她发了新帖说已解决。评论区有人说：果然心虚，给了封口费。" },
      { text: "不回应，等热度过去。", effects: { morale: -5, bossTrust: -2, qualityDebt: 5 }, hidden: { honesty: -1 }, result: "你选择了沉默。三天后热搜下去了。但社区里抄袭游戏的标签留了下来。" },
    ]
  },
  {
    id: "dir_idle_content",
    direction: "IDLE",
    minWeek: 16,
    name: "长线枯竭",
    emoji: "📉",
    color: "#10b981",
    tagline: "第45天，所有内容都推完了",
    situation: "留存数据出来了：",
    dialogue: "运营在周会上放了一张图：7日留存45%，30日留存22%，45日留存8%。问题很明显——45天后所有内容推完了，没有新内容可玩。竞品是6周一次大更新。你们的产能是8周。中间有两周空窗期。程序说可以做一个肉鸽模式无限延伸寿命，但需要4周开发。策划说可以做一套数值深渊，1周就能上线。",
    choices: [
      { text: "做肉鸽模式，真正延长寿命。", effects: { progress: -5, budget: -8, morale: 3, qualityDebt: -3 }, hidden: { quality: 1 }, result: "四周后肉鸽上线了。留存从8%回升到了15%。但那四周里又走了10%的用户。" },
      { text: "做数值深渊，先堵住漏洞。", effects: { progress: -1, morale: -3, qualityDebt: 8 }, hidden: { judgment: -1 }, result: "数值深渊一周就上线了。45日留存回到了12%。但两个月后，玩家算出了最优解，深渊变成了日常打卡。" },
      { text: "加速版本节奏，6周更新一次。", effects: { progress: -3, budget: -10, qualityDebt: 5 }, hidden: { grit: 1 }, result: "你把版本节奏从8周压到了6周。团队开始了永不停歇的版本冲刺。留存稳住了。但连续三轮之后，有3个人提了离职。" },
    ]
  },
  {
    id: "dir_mini_cpc",
    direction: "MINI_GAME",
    minWeek: 12,
    name: "买量成本",
    emoji: "📊",
    color: "#f59e0b",
    tagline: "一个注册用户20块了",
    situation: "买量周报：",
    dialogue: "CPC从上个月的8块涨到了20块。买量经理说：微信流量越来越贵，小游戏赛道挤了，同类型这周上了6个。你看了看ROI——当前LTV是35块，获客成本20块，利润15块。如果CPC继续涨到30，就亏了。他问：要不要暂停买量等价格下来？",
    choices: [
      { text: "暂停买量，转向自然量。", effects: { budget: 8, morale: -5, progress: -2 }, hidden: { judgment: 1 }, result: "买量停了。DAU从5万跌到了8千。但留下的8千是真正喜欢游戏的人。你花了两个月做口碑，自然量慢慢涨到了1.5万。" },
      { text: "继续买量，但提高LTV——加付费点。", effects: { budget: -5, progress: -3, qualityDebt: 8 }, hidden: { honesty: -1 }, result: "你让策划加了3个付费点。LTV从35涨到了50。CPC涨到30也不亏了。但玩家社区出现了一个帖子：这游戏的付费墙越来越厚了。" },
      { text: "换赛道——做海外版，东南亚CPC才5块。", effects: { progress: -5, budget: -10, morale: 3 }, hidden: { grit: 1 }, result: "你花了一个月做本地化。东南亚确实便宜——CPC 5块，LTV 12块，利润7块。但7块的利润……你在Excel里坐了很久。" },
    ]
  },
  {
    id: "dir_legacy_stubborn",
    direction: "LEGACY",
    minWeek: 14,
    name: "固执核心",
    emoji: "🧱",
    color: "#64748b",
    tagline: "我玩了这个游戏三年，你们不能这样改",
    situation: "你收到了一封很长的私信：",
    dialogue: "一个三年的老玩家，写了两千字。他反对你最近的一个设计改动——你把每日任务从5个减到了3个，增加了周常任务。理由是减轻日常负担。他说：我每天下班后做5个任务，这是我唯一的社交。你们改成3个，我不知道剩下的时间干什么。后面跟了47条回复，全是一样的意思：改回去。",
    choices: [
      { text: "改回去。老玩家是基本盘。", effects: { progress: -3, morale: 3, budget: -3 }, hidden: { people: 1 }, result: "你改回去了。47条回复变成了47个谢谢。但新玩家反馈说日常太重了。你同时得罪不了两边。" },
      { text: "坚持改动。新玩家才是增长。", effects: { morale: -5, bossTrust: 1, qualityDebt: 3 }, hidden: { judgment: 1 }, result: "你在社区发了一封很长的信解释为什么改。三天后帖子沉了。一个月后DAU涨了8%，但核心论坛的日活跌了30%。" },
      { text: "做两套日常——老玩家5个，新玩家3个。", effects: { progress: -2, budget: -5, qualityDebt: 5 }, hidden: { quality: -1 }, result: "两套系统上线了。老玩家满意了。但维护两套日常让策划每周多花两天。新功能上线更慢了。" },
    ]
  },
  {
    id: "dir_metaverse_empty",
    direction: "METAVERSE",
    minWeek: 14,
    name: "空城",
    emoji: "🏙️",
    color: "#06b6d4",
    tagline: "社交广场上只有12个人",
    situation: "你打开了自己的游戏：",
    dialogue: "凌晨两点，你登进了自己游戏的虚拟社交广场。当前在线人数：12。其中8个是挂机的，2个是测试号，1个在跳舞，1个是你。你翻了一下后台数据——日活最高峰是发布会那天，3万人同时在线。现在是第8周，日均在线400人。广场上那个巨大的虚拟屏幕还在循环播放宣传视频。画面里，成千上万的虚拟角色在欢呼。",
    choices: [
      { text: "做活动，把人拉回来。办一场虚拟演唱会。", effects: { progress: -3, budget: -12, morale: 3, qualityDebt: 3 }, hidden: { quality: -1 }, result: "演唱会做了。那天在线人数回到了5000。第二天跌回了600。你花了一笔钱，买了一个好看的数字。" },
      { text: "砍掉社交广场，把资源集中到核心玩法。", effects: { progress: 3, morale: -8, budget: -3, qualityDebt: -5 }, hidden: { judgment: 1 }, result: "你做了一个痛苦的决定。广场关了。剩下的用户失去了社交空间，但有核心玩法的人留住了。DAU跌了40%，但留存率反而升了。" },
      { text: "找KOL入驻，用内容填充空间。", effects: { budget: -8, morale: 3, qualityDebt: 5 }, hidden: { people: -1 }, result: "你签了三个主播在游戏里做节目。效果持续了两周。主播走了，观众也走了。你在结算表上看到了那笔签约费。" },
    ]
  },
];

const CORP_EVENTS = ["corp_kpi", "corp_approval", "kpi_review", "market_trend"];

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
    id: "m1_review",
    month: 1,
    name: "立项启动评审", emoji: "🚀", color: "#7678f0",
    tagline: "「方向定了吗？」",
    situation: "第一个月末，上面来看原型：",
    dialogue: "投资方代表坐在会议室里，笑着问：「能跑吗？大概什么感觉？我不需要完整的，能动就行。」你扫了一眼团队——他们昨晚熬通宵做了一个能跑的东西。",
    choices: [
      { text: "展示这个能跑的版本", effects: { progress: 0, morale: 2, budget: 2, bossTrust: -1, qualityDebt: 3 }, hidden: { honesty: -1 }, result: "他们满意地点头。你没有告诉他们这是昨晚才做的。" },
      { text: "如实说明当前进度和风险", effects: { progress: -2, morale: 2, budget: 0, bossTrust: 1 }, hidden: { honesty: 1 }, result: "他皱了皱眉，但最终点头：「诚实是好事。」进度没虚报，心里稳了。" },
      { text: "先找人确认这个版本有多少是真实的", effects: { progress: -1, morale: -1, budget: 0, bossTrust: 1 }, hidden: { judgment: 1 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    id: "m2_review",
    month: 2,
    name: "MVP 评审", emoji: "🎮", color: "#0ea5e9",
    tagline: "「核心玩法能玩通吗？」",
    situation: "第二个月末，内部评审：",
    dialogue: "总监把手柄放下来：「核心循环我玩了十分钟，感觉还行，就是……有几个地方我有点疑问。」\n他翻开了一页记满问题的纸。",
    choices: [
      { text: "逐条解释，打消疑虑", effects: { progress: 0, morale: 2, budget: 2, bossTrust: -1, qualityDebt: 3 }, hidden: { honesty: -1 }, result: "你回答了所有问题。有三个你其实不确定，但你说得很自信。" },
      { text: "承认部分问题，给出修复计划", effects: { progress: -3, morale: 3, budget: 0, bossTrust: 2 }, hidden: { honesty: 1, grit: 1 }, result: "他看起来有点失望，但接受了时间表。进度是真实的。" },
      { text: "先确认这十分钟他没玩到的地方是什么情况", effects: { progress: -1, morale: -1, budget: 0, bossTrust: 1 }, hidden: { judgment: 1 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    id: "m3_review",
    month: 3,
    name: "基础闭环评审", emoji: "🔄", color: "#10b981",
    tagline: "「从头玩到尾，不崩吗？」",
    situation: "第三个月末，里程碑测试：",
    dialogue: "QA组发来报告：「我们跑了一遍主流程……有一些情况。」你们约好了今天下午向上汇报全流程可用性。",
    choices: [
      { text: "先开会，QA的问题会后再处理", effects: { progress: 0, morale: -2, budget: 3, bossTrust: -1, qualityDebt: 5 }, hidden: { honesty: -1 }, result: "汇报很顺利。QA报告被你压到了下周。" },
      { text: "推迟汇报，先处理QA问题", effects: { progress: -4, morale: 3, budget: 0, bossTrust: 2 }, hidden: { honesty: 1, quality: 1 }, result: "上面有点不满意被推迟。但你知道自己在哪里。" },
      { text: "让心腹先看一下QA报告里哪些是真正的问题", effects: { progress: -1, morale: -1, budget: 0, bossTrust: 1, qualityDebt: 3 }, hidden: { judgment: 1 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    id: "m4_review",
    month: 4,
    name: "内容量产评审", emoji: "📦", color: "#f59e0b",
    tagline: "「内容够吗？」",
    situation: "第四个月末，内容进度核查：",
    dialogue: "主策划发来一个表格：「按计划，本月应该完成60%的关卡内容。我这边看到的数字是58%，差不多。」你的主程私下发消息：「那个数字是怎么算出来的？」",
    choices: [
      { text: "确认数字，继续推进", effects: { progress: 0, morale: 2, budget: 2, bossTrust: -1, qualityDebt: 8 }, hidden: { honesty: -1 }, result: "58%通过了。你没有去追那条私信。上面也没追。" },
      { text: "要求重新核查内容完成标准", effects: { progress: -6, morale: 3, budget: 0, bossTrust: 2 }, hidden: { honesty: 1, quality: 1 }, result: "核查花了三天。真实数字是41%。上面很不高兴。" },
      { text: "先回那条私信，问清楚", effects: { progress: -2, morale: -1, budget: 0, bossTrust: 1 }, hidden: { judgment: 1 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
  {
    id: "m5_review",
    month: 5,
    name: "整体验收评审", emoji: "🔍", color: "#ef4444",
    tagline: "「这个游戏，能上线吗？」",
    situation: "第五个月末，外部评审：",
    dialogue: "发行方带了三个人来，玩了两个小时。会议室里安静了很长时间。最后他们说：「我们有一些反馈……」",
    choices: [
      { text: "接受反馈，承诺全部修改", effects: { progress: -4, morale: -3, budget: 3, bossTrust: 2, qualityDebt: 5 }, hidden: { honesty: -1 }, result: "他们满意地走了。你看着那份修改清单，感觉最后一个月不够用。" },
      { text: "区分必改和不改，谈判范围", effects: { progress: -2, morale: 3, budget: 0, bossTrust: -1 }, hidden: { judgment: 1, grit: 1 }, result: "谈了两个小时。砍掉了一半修改项。进度有损但可控。" },
      { text: "先私下确认团队能做到哪些", effects: { progress: -1, morale: -1, budget: 0, bossTrust: 1, qualityDebt: 3 }, hidden: { judgment: 1 }, result: "你找人问了。心里大概有底了。" },
    ]
  },
];

function MonthSummaryCard({ data, bossTrust, people, peopleHintShown, onNext }) {
  const { month, delta, progress, weeksLeft, monthlyMoraleDecay, qdDrain, qualityDebt } = data;
  const flavor = MONTH_FLAVORS[month - 1] || "";
  return (
    <div style={{ padding: "24px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 12, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13, color: "#c7c7c7", fontFamily: "monospace" }}>— 月度小结 —</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#888" }}>第{month}月结束</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "monospace", fontSize: 14, lineHeight: 1.6 }}>
          <div>本月进度推进了 <span style={{ color: delta >= 0 ? "#4ade80" : "#f87171" }}>{delta >= 0 ? "+" : ""}{delta}%</span></div>
          <div style={{ color: "#c7c7c7" }}>距离上线还有 <span style={{ color: "#888" }}>{100 - progress}%</span></div>
          <div style={{ color: "#c7c7c7" }}>剩余 <span style={{ color: weeksLeft < 8 ? "#f87171" : "#888" }}>{weeksLeft}</span> 周</div>
          {monthlyMoraleDecay && (
            <div style={{ color: "#f97316" }}>本月士气自然消耗：-{monthlyMoraleDecay}</div>
          )}
          {qdDrain > 0 && (
            <div style={{ color: "#f87171" }}>{getQualityDebtDrainMsg(qualityDebt)}</div>
          )}
          {bossTrust <= 2 && bossTrust > 0 && (
            <div style={{ color: "#f87171", fontStyle: "italic", marginTop: 4 }}>高层最近在跟其他人打听你项目的情况。</div>
          )}
          {people < 3 && !peopleHintShown && (
            <div style={{ color: "#9ca3af", fontStyle: "italic", marginTop: 4 }}>走廊里遇到的人越来越少了。你不太确定，是他们不在了，还是他们不想跟你说话了。</div>
          )}
        </div>
        <div style={{ fontSize: 14, color: "#3a3a4a", fontStyle: "italic", borderTop: "1px solid #1a1a2e", paddingTop: 12 }}>
          「{flavor}」
        </div>
        <button onClick={onNext}
          style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer", textAlign: "left", transition: "border-color 0.15s, color 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
          进入第{month + 1}月 →
        </button>
      </div>
    </div>
  );
}

// ---- helpers ---------------------------------------------------------------

function getIndustryBackgroundChoices(eventId, industryBackground) {
  const map = {
    realestate: {
      bet_deal: {
        text: "重新谈条款",
        tag: "背景",
        effects: { budget: 5, bossTrust: -1 },
        result: "你在另一个行业见过更苛刻的合同。你拿出笔，在对方的条款上划了几道。他沉默了一会儿，点了头。你不确定他是真的接受了，还是在等。"
      },
      stock_trap: {
        text: "我们谈的不是股票，是退出机制",
        tag: "背景",
        effects: { budget: 8, qualityDebt: 5 },
        result: "你把对话从激励转移到了结构上。他没想到你懂这个。条款重签了——但你知道，你用项目质量换了谈判空间。"
      },
      capital_wave: {
        text: "我们来谈一个对双方都合理的结构",
        tag: "背景",
        effects: { budget: 12, bossTrust: 1 },
        result: "你把融资谈成了一次甲方合作，而不是投资人介入。他很满意——你用的是他的语言。"
      },
    },
    film: {
      dreamer: {
        text: "先做一个概念验证，最低成本",
        tag: "背景",
        effects: { morale: 5, budget: -5, qualityDebt: -3 },
        result: "你在影视圈学会了一件事：再大的想法，先拍个三分钟的概念片。他眼睛亮了。你用最小的投入，给了他一个出口。"
      },
      castle: {
        text: "我们做一个垂直切片，证明这个方向能跑",
        tag: "背景",
        effects: { progress: -5, morale: 8, qualityDebt: -5 },
        result: "这是影视圈的老方法：先做最难的那一段，证明整体可行。团队打起精神来了——他们喜欢有人知道自己在干什么。"
      },
    },
    blockchain: {
      bet_deal: {
        text: "重新定义这个项目的价值叙事",
        tag: "背景",
        effects: { budget: 12, bossTrust: 1, qualityDebt: 8 },
        result: "你讲了一个更大的故事——用户规模、生态位、长线价值。他听进去了。钱批下来了，预期也被你推高了。你自己也知道，这个故事要靠后面的数据撑。"
      },
      stock_trap: {
        text: "把这个包装成一次战略布局",
        tag: "背景",
        effects: { budget: 10, morale: -5 },
        result: "你给这个局面加了一层框架，让它听起来像主动选择而不是被动接受。团队不太信，但老板满意了。"
      },
      capital_wave: {
        text: "给他讲一个Web3没讲完的故事",
        tag: "背景",
        effects: { budget: 15, bossTrust: 1, qualityDebt: 10 },
        result: "你太熟悉这套话术了。他的眼睛里有你认识的那种光。钱来了，期望也来了。你在心里算了一下，后面的数据要多好看才能撑住这个故事。"
      },
    },
  };
  return map[industryBackground]?.[eventId];
}

function colorDesc(desc) {
  return desc.split(/([\+\-]\d+)/).map((p, i) =>
    /^\+\d+/.test(p) ? <span key={i} style={{ color: "#4ade80" }}>↑</span>
    : /^\-\d+/.test(p) ? <span key={i} style={{ color: "#f87171" }}>↓</span>
    : <span key={i}>{p}</span>
  );
}

function effectArrows(netValue) {
  if (netValue === 0) return "—";
  return netValue > 0 ? "↑" : "↓";
}

function StatBar({ label, value, color, onClick, displayValue }) {
  const safeValue = isNaN(value) ? 0 : value;
  const pct = Math.max(0, Math.min(100, safeValue));
  const danger = pct < 20;
  const shown = displayValue !== undefined ? (isNaN(displayValue) ? 0 : displayValue) : safeValue;
  return (
    <div style={{ flex: 1, minWidth: 0, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "monospace", color: danger ? "#f87171" : "#c7c7c7", marginBottom: 3, lineHeight: 1.4 }}>
        <span>{label}</span><span style={{ color: danger ? "#f87171" : color }}>{shown}</span>
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
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, padding: "2px 8px", borderRadius: 4, background: pos ? "#052e16" : "#450a0a", border: `1px solid ${pos ? "#166534" : "#7f1d1d"}`, color: pos ? "#4ade80" : "#f87171", fontSize: 13, fontFamily: "monospace" }}>
      {pos ? "▲" : "▼"} {label}
    </span>
  );
}

function ChoicePreview({ effects, progressBonus }) {
  const np = (effects.progress || 0) + BASE_PROGRESS + (progressBonus || 0);
  const nm = effects.morale || 0;
  const nb = effects.budget || 0;
  const c = (v) => v > 0 ? "#4ade80" : v < 0 ? "#f87171" : "#c7c7c7";
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 13, fontFamily: "monospace", opacity: 0.85 }}>
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
      <button key={key} onClick={() => setWorkMode(key)} style={{ flex: 1, padding: "7px 6px", fontSize: 13, fontFamily: "monospace", background: active ? "#1a1a2e" : "#08080f", border: `1px solid ${active ? "#4a4a7a" : "#1e1e2e"}`, color: active ? "#c0c0e0" : "#c7c7c7", borderRadius: 6, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
        <span>{m.emoji}</span><span>{m.label}</span><span style={{ color: active ? "#c7c7c7" : "#c7c7c7", fontSize: 12 }}>{m.ap + (apBonus||0)}AP</span>
      </button>
    );
  };
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: "#c7c7c7", marginBottom: 5, fontFamily: "monospace" }}>工作模式 · 剩余 {Math.max(0, WORK_MODES[workMode].ap + (apBonus||0) - apSpent)}AP</div>
      <div style={{ display: "flex", gap: 5, marginBottom: isOvertime ? 5 : 0 }}>
        {["normal", "overtime", "extreme"].map(modeBtn)}
      </div>
      {isOvertime && (
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={() => setOvertimeType("pay")} style={{ flex: 1, padding: "7px 8px", fontSize: 13, background: overtimeType === "pay" ? "#0d2010" : "#08080f", border: `1px solid ${overtimeType === "pay" ? "#166534" : "#1e1e2e"}`, color: overtimeType === "pay" ? "#4ade80" : "#c7c7c7", borderRadius: 6, cursor: "pointer" }}>
            💰 付加班费 -{WORK_MODES[workMode].budgetCost}预算
          </button>
          <button onClick={() => setOvertimeType("pie")} style={{ flex: 1, padding: "7px 8px", fontSize: 13, background: overtimeType === "pie" ? "#2d0a0a" : "#08080f", border: `1px solid ${overtimeType === "pie" ? "#7f1d1d" : "#1e1e2e"}`, color: overtimeType === "pie" ? "#f87171" : "#c7c7c7", borderRadius: 6, cursor: "pointer" }}>
            🥧 画饼{pieCount > 0 ? `×${pieCount + 1}` : ""} -{piePenalty}士气
          </button>
        </div>
      )}
    </div>
  );
}

function ActionMenu({ state, workMode, apSpent, freezeDone, onAction }) {
  const apTotal = WORK_MODES[workMode].ap + (state.apBonusPerWeek || 0);
  const apLeft = Math.max(0, apTotal - apSpent);
  const isMonthEnd = state.week % 4 === 0;
  const ctx = { freezeDone, isMonthEnd };

  const available = ACTIONS
    .filter(a => a.available(state, ctx))
    .filter(a => !state.usedActions.includes(a.id));
  if (available.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: "#c7c7c7", marginBottom: 5, fontFamily: "monospace" }}>本周行动</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {available.map(action => {
          const canAfford = apLeft >= action.ap;
          return (
            <button key={action.id} onClick={() => onAction(action)} disabled={!canAfford} style={{ padding: "7px 10px", fontSize: 13, background: canAfford ? "#0c0c18" : "#080808", border: `1px solid ${canAfford ? "#2a2a3a" : "#161616"}`, color: canAfford ? "#999" : "#c7c7c7", borderRadius: 6, cursor: canAfford ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}
              onMouseEnter={e => canAfford && (e.currentTarget.style.borderColor = "#4a4a7a")}
              onMouseLeave={e => canAfford && (e.currentTarget.style.borderColor = "#2a2a3a")}>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span>{action.emoji}</span>
                <span>{action.label}</span>
                <span style={{ color: "#c7c7c7", fontFamily: "monospace" }}>{action.ap}AP</span>
              </div>
              <div style={{ fontSize: 12, fontFamily: "monospace", color: canAfford ? "#c7c7c7" : "#2a2a2a" }}>{colorDesc(action.desc)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- intro + card screens --------------------------------------------------

function IntroScreen({ onNext }) {
  const fadeUp = (delay) => ({
    animation: `fadeUp 0.6s ease ${delay}s forwards`,
    opacity: 0,
  });
  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ fontSize: 40, marginBottom: 24, textAlign: "center", ...fadeUp(0) }}>🎮</div>
      <div style={{ fontSize: 15, color: "#c7c7c7", fontFamily: "monospace", lineHeight: 2, marginBottom: 32 }}>
        <p style={{ color: "#c7c7c7", ...fadeUp(0.1) }}>你今年35岁。</p>
        <p style={{ color: "#c7c7c7", ...fadeUp(0.25) }}>被毕业已经是半年前的事，</p>
        <p style={{ color: "#c7c7c7", ...fadeUp(0.4) }}>现在你是一位X滴司机。</p>
        <p style={{ marginTop: 16, color: "#c7c7c7", ...fadeUp(0.55) }}>有一天，你接到了一位神秘乘客，</p>
        <p style={{ color: "#c7c7c7", ...fadeUp(0.7) }}>他很反常地和你聊了一路的天，直到把他送到了公司园区。</p>
        <p style={{ marginTop: 16, color: "#c7c7c7", ...fadeUp(0.85) }}>他说现在他无人可用，那些肥头大耳的老将都被他开除完了，</p>
        <p style={{ color: "#c7c7c7", ...fadeUp(1.0) }}>他愿意给你一次机会——</p>
        <p style={{ marginTop: 16, color: "#c7c7c7", ...fadeUp(1.15) }}>担任游戏制作人，试用期六个月。</p>
        <p style={{ color: "#c7c7c7", ...fadeUp(1.3) }}>你必须在24周内把游戏送上线。</p>
        <p style={{ color: "#c7c7c7", ...fadeUp(1.45) }}>否则……开除速度一定会很快！</p>
      </div>
      <button onClick={onNext} style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer", width: "100%", transition: "all 0.15s", ...fadeUp(1.7) }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
        接这个项目 →
      </button>
    </div>
  );
}

function getActiveCardGroups(pickedCards) {
  return CARD_GROUPS.filter(g => !g.condition || g.condition(pickedCards));
}

function CardScreen({ step, pickedCards, onPick, onNext }) {
  const activeGroups = getActiveCardGroups(pickedCards);
  const group = activeGroups[step];
  const groupIdx = CARD_GROUPS.indexOf(group);
  const picked = pickedCards[groupIdx];

  return (
    <div key={`card-${step}`} style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: 24 }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ fontSize: 12, color: "#c7c7c7", fontFamily: "monospace", marginBottom: 12, animation: "fadeUp 0.35s ease 0s forwards", opacity: 0 }}>
        {step + 1} / {activeGroups.length}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#999", marginBottom: 4, animation: "fadeUp 0.35s ease 0.1s forwards", opacity: 0 }}>{group.title}</div>
      {group.subtitle
        ? <div style={{ fontSize: 12, color: "#6a6a7a", marginBottom: 20, fontStyle: "italic", animation: "fadeUp 0.35s ease 0.2s forwards", opacity: 0 }}>{group.subtitle}</div>
        : <div style={{ marginBottom: 20 }} />
      }
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {group.cards.map((card, cardIdx) => {
          const isSelected = picked?.id === card.id;
          return (
            <button key={card.id} onClick={() => !picked && onPick(step, card)} style={{ flex: 1, padding: "16px 10px", background: isSelected ? "#0d1a0d" : "#0c0c18", border: `1px solid ${isSelected ? "#166534" : "#1e1e2e"}`, borderRadius: 10, cursor: picked ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s", animation: `fadeUp 0.35s ease ${0.25 + cardIdx * 0.1}s forwards`, opacity: 0 }}
              onMouseEnter={e => !picked && (e.currentTarget.style.borderColor = "#4a4a7a")}
              onMouseLeave={e => !picked && !isSelected && (e.currentTarget.style.borderColor = "#1e1e2e")}>
              <span style={{ fontSize: 32 }}>{card.emoji}</span>
              <span style={{ fontSize: 14, color: isSelected ? "#4ade80" : "#888" }}>{card.label}</span>
            </button>
          );
        })}
      </div>
      {picked && (
        <div style={{ background: "#0c0c18", border: "1px solid #1a2a1a", borderRadius: 10, padding: "12px 14px", marginBottom: 20, animation: "fadeUp 0.35s ease 0s forwards", opacity: 0 }}>
          <div style={{ fontSize: 12, color: "#c7c7c7", marginBottom: 4, fontFamily: "monospace" }}>{picked.emoji} {picked.label}</div>
          <div style={{ fontSize: 15, color: "#4ade80", lineHeight: 1.6 }}>{picked.reveal}</div>
        </div>
      )}
      {picked && (
        <button onClick={onNext} style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer", width: "100%", transition: "all 0.15s", animation: "fadeUp 0.35s ease 0.25s forwards", opacity: 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
          {step < activeGroups.length - 1 ? "下一张 →" : "开始制作！🚀"}
        </button>
      )}
    </div>
  );
}

// ---- main app --------------------------------------------------------------

const DIRECTIONS = {
  CASUAL: { id: "CASUAL", label: "休闲轻度", pitch: "低门槛，高频付费，玩家上手快。" },
  CARD: { id: "CARD", label: "传统卡牌", pitch: "抽卡钩子，玩家留存稳定。" },
  SLG: { id: "SLG", label: "策略长线", pitch: "长线留存，但慢热。" },
  ARPG: { id: "ARPG", label: "动作RPG", pitch: "差异化竞争，走精品路线。" },
  MOBA: { id: "MOBA", label: "竞技MOBA", pitch: "三分天下，你来做第四个。" },
  IDLE: { id: "IDLE", label: "放置挂机", pitch: "不烧钱不烧脑，低成本稳健。" },
  OPENWORLD: { id: "OPENWORLD", label: "开放世界", pitch: "标杆已立，跟不上就出局。" },
  ROMANCE: { id: "ROMANCE", label: "女性向养成", pitch: "新蓝海，先入场先吃肉。" },
  PARTY: { id: "PARTY", label: "派对社交", pitch: "UGC是流量密码，已经有人证明了。" },
  AI_NATIVE: { id: "AI_NATIVE", label: "AI原生", pitch: "赌对了，未来三年吃红利。" },
  ANIME: { id: "ANIME", label: "二次元游戏", pitch: "美术+IP+故事驱动，用户粘性极高。" },
  BATTLE_ROYALE: { id: "BATTLE_ROYALE", label: "战术竞技", pitch: "吃鸡风口，用户量爆炸增长。" },
  AUTO_CHESS: { id: "AUTO_CHESS", label: "自走棋", pitch: "窗口期品类，做出来就是钱。" },
  CHESS_CARD: { id: "CHESS_CARD", label: "棋牌", pitch: "斗地主/麻将，用户基数大。" },
  IP_PORT: { id: "IP_PORT", label: "页游转手", pitch: "端/页游IP移植手游，捷径。" },
  SIM: { id: "SIM", label: "模拟经营", pitch: "江南百景图风，长线付费。" },
  METAVERSE: { id: "METAVERSE", label: "元宇宙", pitch: "概念风口，先入场占坑。" },
  GLOBAL: { id: "GLOBAL", label: "出海全球化", pitch: "面向海外市场，增量空间。" },
  MINI_GAME: { id: "MINI_GAME", label: "小游戏买量", pitch: "微信生态，低成本获客。" },
  LEGACY: { id: "LEGACY", label: "叔系老游戏", pitch: "面向30+男性，慢节奏情怀。" },
  PC_MMO: { id: "PC_MMO", label: "重度端游移植", pitch: "把PC MMO搬上手机，吃老用户。" },
};

const DIRECTION_TEAM_SCALE = {
  MINI_GAME:     { projectTeamSize: 5,  budgetDrainMultiplier: 0.5,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  CASUAL:        { projectTeamSize: 8,  budgetDrainMultiplier: 0.6,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  IDLE:          { projectTeamSize: 8,  budgetDrainMultiplier: 0.6,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  CHESS_CARD:    { projectTeamSize: 6,  budgetDrainMultiplier: 0.5,  sweetSpot: 2, minViable: 1, overcrowd: 4 },
  ROMANCE:       { projectTeamSize: 12, budgetDrainMultiplier: 0.8,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  AUTO_CHESS:    { projectTeamSize: 15, budgetDrainMultiplier: 0.9,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  CARD:          { projectTeamSize: 15, budgetDrainMultiplier: 0.9,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  SIM:           { projectTeamSize: 18, budgetDrainMultiplier: 1.0,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  LEGACY:        { projectTeamSize: 18, budgetDrainMultiplier: 1.0,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  SLG:           { projectTeamSize: 25, budgetDrainMultiplier: 1.2,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  ANIME:         { projectTeamSize: 30, budgetDrainMultiplier: 1.3,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  PARTY:         { projectTeamSize: 25, budgetDrainMultiplier: 1.2,  sweetSpot: 3, minViable: 2, overcrowd: 5 },
  ARPG:          { projectTeamSize: 35, budgetDrainMultiplier: 1.4,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  GLOBAL:        { projectTeamSize: 40, budgetDrainMultiplier: 1.5,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  AI_NATIVE:     { projectTeamSize: 35, budgetDrainMultiplier: 1.4,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  METAVERSE:     { projectTeamSize: 45, budgetDrainMultiplier: 1.6,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  IP_PORT:       { projectTeamSize: 40, budgetDrainMultiplier: 1.5,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  BATTLE_ROYALE: { projectTeamSize: 50, budgetDrainMultiplier: 1.7,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  MOBA:          { projectTeamSize: 50, budgetDrainMultiplier: 1.7,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  OPENWORLD:     { projectTeamSize: 60, budgetDrainMultiplier: 1.8,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  PC_MMO:        { projectTeamSize: 55, budgetDrainMultiplier: 1.8,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
};

const YEAR_DATA = {
  2012: {
    hot: ["IP_PORT", "CHESS_CARD"],
    mocked: "PC_MMO",
    catchphrase: "移动市场还是一片蓝海。页转手是捷径，月入千万不是梦",
    representatives: ["忘仙手游", "世界OL"],
    mockedFlavor: "「你还在做老掉牙的端游？手机用户哪有耐心肝这个。」",
    specialEvents: ["chess_card_jqk"],
    narrateA: "2012年，页游转手开始成为主流。",
    narrateB: "棋牌类游戏用户基数大，变现快。",
  },
  2013: {
    hot: ["CARD", "CASUAL"],
    mocked: "SLG",
    catchphrase: "2013是卡牌年，无卡牌不手游",
    representatives: ["你叫MT", "X掌门"],
    mockedFlavor: "「SLG？太复杂了，手机用户不爱动脑子。」",
    narrateA: "隔壁组策划下班时说了句话:\"我们日活破百万了，就靠加了个SSR保底。\"你点点头，好像听懂了。",
    narrateB: "产品会上有人提了个词:\"抽卡钩子。\"没有人问这是什么。大家都在点头。",
  },
  2014: {
    hot: ["ANIME", "SLG", "ARPG"],
    mocked: "MOBA",
    catchphrase: "年轻人做二次元，中年人做COK出海赚美金",
    representatives: ["LiveLove学园偶像祭", "列皇的纷争"],
    mockedFlavor: "「手机玩MOBA是反人类，操作根本做不了。」",
    narrateA: "这一年，二次元和SLG开始分庭抗礼。",
    narrateB: "MOBA还在观望，没人敢碰移动端这块蛋糕。",
  },
  2015: {
    hot: ["MOBA", "ARPG"],
    mocked: "CARD",
    catchphrase: "MOBA是下一个风口，2015是重度化元年",
    representatives: ["亡者农药", "梦幻东游手游"],
    mockedFlavor: "「卡牌已经烂大街了，没前途。」",
    narrateA: "2015年，MOBA成为手游新宠。",
    narrateB: "ARPG端转手验证了重度化之路的可行性。",
  },
  2016: {
    hot: ["ANIME", "SLG", "MOBA"],
    mocked: "CARD",
    catchphrase: "美术即正义，非酋欧皇出圈",
    representatives: ["痒痒鼠", "莫非王臣"],
    mockedFlavor: "「你的卡牌和痒痒鼠比……算了，不比了。没美术没剧情，必死。」",
    narrateA: "痒痒鼠刷屏，二次元手游证明了自己的商业价值。",
    narrateB: "莫非王臣让SLG从圈层走向大众。",
  },
  2017: {
    hot: ["ROMANCE", "SLG", "BATTLE_ROYALE"],
    mocked: "CARD",
    mustInclude: "BATTLE_ROYALE",
    catchphrase: "女性向是蓝海，SLG买量永动机",
    representatives: ["恋与出品人", "乱世亡者"],
    mockedFlavor: "「二次元卡牌退烧了，你现在还做这个？」",
    hotWeights: [1.0, 1.0, 0.5],
    narrateA: "公司楼道里有人在玩一个游戏，跳伞，捡枪。他在电话里说:\"大吉大利，今晚吃鸡。\"",
    narrateB: "恋与出品人证明了女性向市场的巨大潜力。",
  },
  2018: {
    hot: ["BATTLE_ROYALE", "ANIME", "IDLE"],
    mocked: "ARPG",
    catchphrase: "大吉大利今晚吃鸡，买量为王ROI至上",
    representatives: ["荒原行动", "激烈战场"],
    mockedFlavor: "「MMO已死，传统ARPG没人肝了。」",
    narrateA: "吃鸡手游席卷市场，战术竞技成为新赛道。",
    narrateB: "放置类游戏悄悄崛起，低成本高回报。",
  },
  2019: {
    hot: ["AUTO_CHESS", "IDLE", "CARD"],
    mocked: "OPENWORLD",
    catchphrase: "万物皆可自走棋，窗口期只有三个月",
    representatives: ["少少自走棋", "FXO"],
    mockedFlavor: "「开放世界？成本高，手机带不动，赚不回来。」",
    specialEvents: ["auto_chess_window"],
    narrateA: "自走棋玩法爆红，三个月内二十多款产品上线。",
    narrateB: "开放世界概念开始有人讨论，但大家都觉得成本太高。",
  },
  2020: {
    hot: ["OPENWORLD", "IDLE", "SIM"],
    mocked: "CASUAL",
    catchphrase: "原鬼定义3A手游，开放世界是入场券",
    representatives: ["原鬼", "江南千景图"],
    mockedFlavor: "「纯换皮买量？用户审美疲劳了，买量见顶了。」",
    specialEvents: ["capital_wave"],
    narrateA: "原神公测，重新定义了手游的品质天花板。",
    narrateB: "疫情带来用户增长，模拟经营类异军突起。",
  },
  2021: {
    hot: ["ARPG", "OPENWORLD", "METAVERSE"],
    mocked: "CARD",
    catchphrase: "武侠吃鸡破圈，端手游联动是未来",
    representatives: ["永X无间", "幻想山海"],
    mockedFlavor: "「没内容留不住人，老套卡牌没未来。」",
    narrateA: "元宇宙概念爆红，游戏圈人人都在谈。",
    narrateB: "永X无间证明了买断制端游在国内仍有市场。",
  },
  2022: {
    hot: ["SLG", "OPENWORLD", "GLOBAL"],
    mocked: "CARD",
    catchphrase: "动物SLG是蓝海，出海是唯一增量",
    representatives: ["大大蚁国", "原鬼（持续）"],
    mockedFlavor: "「现在三端互通都是大势所趋了，你还只做国内单端？」",
    narrateA: "出海成为热词，国产游戏开始走向全球。",
    narrateB: "SLG新品类不断涌现，动物题材成为新宠。",
  },
  2023: {
    hot: ["PARTY", "AI_NATIVE", "OPENWORLD"],
    mocked: "SLG",
    catchphrase: "AI重构生产，UGC是第二曲线",
    representatives: ["顺火暖手游", "蛋宰派对"],
    mockedFlavor: "「UGC什么一看就是骗局，踏踏实实做个SLG……」对方笑了。",
    narrateA: "技术群里有人发了一张AI生成的原画，跟美术组画的差不多。",
    narrateB: "蛋宰派对让派对游戏和UGC成为新热点。",
  },
  2024: {
    hot: ["ANIME", "SLG", "MINI_GAME"],
    mocked: "CASUAL",
    catchphrase: "二游卷内容，SLG卷买量，小游戏卷ROI",
    representatives: ["绝区壹", "三国：nslg", "永劫X间手游（陪跑）"],
    mockedFlavor: "「三端互通光是UI就搞不定，老实点做休闲手游，成本低。」对方不是嘲讽，是真心建议。",
    narrateA: "小游戏生态成熟，微信成为新的流量洼地。",
    narrateB: "二游进入内容卷时代，没有好剧情好美术根本活不下去。",
  },
  2025: {
    hot: ["AI_NATIVE", "LEGACY"],
    mocked: "OPENWORLD",
    catchphrase: "AI即内容，内容即留存",
    representatives: ["崩坏：星穹轨道", "AI叙事类新游"],
    mockedFlavor: "「你还搁那开放世界呢？开放世界你做得完么？」",
    narrateA: "AI原生游戏开始出现，AI成为标配工具。",
    narrateB: "怀旧向游戏证明了老用户的付费能力。",
  },
  2026: {
    hot: [],
    mocked: null,
    catchphrase: "AI不是功能，是底层",
    representatives: ["AI驱动叙事社交", "空间交互手游"],
    special: "confused_year",
    narrateA: "2026年，没有人知道下一个风口在哪里。",
    narrateB: "AI渗透到每个环节，成为基础设施。",
  },
};
const UNLOCK_TABLE = [
  {
    playerBackground: "designer",
    industryBackground: null,
    direction: "AUTO_CHESS",
    years: [2018],
    selectBonus: { matchThresholdDelta: -5 },
    inPoolBonus: { qualityDebtDelta: -5 },
    pitch: "这个玩法形态你在卡牌设计里隐约想到过。",
  },
  {
    playerBackground: "engineer",
    industryBackground: null,
    direction: "OPENWORLD",
    years: [2017, 2018, 2019],
    selectBonus: { matchThresholdDelta: -5 },
    inPoolBonus: { progressEfficiencyMultiplier: 1.1 },
    pitch: "别人说做不到，但你知道技术上是可行的。",
  },
  {
    playerBackground: "engineer",
    industryBackground: null,
    direction: "BATTLE_ROYALE",
    years: [2017, 2018],
    selectBonus: { qualityDebtDelta: -10 },
    inPoolBonus: { qualityDebtDelta: -5 },
    pitch: "同步架构和服务器优化，技术是吃鸡游戏的核心竞争力。",
  },
  {
    playerBackground: "artist",
    industryBackground: null,
    direction: "ANIME",
    years: [2013, 2014, 2015],
    selectBonus: { qualityDebtAccumRate: 0.9 },
    inPoolBonus: { mockedMoralePenaltyMultiplier: 0.5 },
    pitch: "美术品质就是护城河，这个赛道你有感觉。",
  },
  {
    playerBackground: "pm",
    industryBackground: null,
    direction: "GLOBAL",
    years: [2019, 2020, 2021],
    selectBonus: { budgetCostMultiplier: 0.95 },
    inPoolBonus: { manageUpMultiplier: 1.2 },
    pitch: "跨地区协作你推过，出海的坑你比别人少踩。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "realestate",
    direction: "SLG",
    years: [2012, 2013, 2014, 2015, 2016],
    selectBonus: { budgetDelta: 10 },
    inPoolBonus: { firefighterExtraChoice: true },
    pitch: "长线系统性运营——这个逻辑你在另一个行业做过。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "education",
    direction: "ROMANCE",
    years: [2015, 2016, 2017],
    selectBonus: { moraleDelta: 5 },
    inPoolBonus: { comfortMultiplier: 1.1 },
    pitch: "情感连接和内容驱动，你比游戏圈的人更懂用户。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "finance",
    direction: "MINI_GAME",
    years: [2022, 2023],
    selectBonus: { budgetPrecisionDisplay: true },
    inPoolBonus: { budgetPrecisionDisplay: true },
    pitch: "成本低、赔率高——这个结构你一眼算明白了。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "film",
    direction: "IP_PORT",
    years: [2012, 2013, 2014, 2015, 2016, 2017],
    selectBonus: { qualityDebtDelta: -10 },
    inPoolBonus: { qualityDebtDelta: -10 },
    pitch: "IP改编的大坑你在影视圈见过，你知道怎么绕。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "blockchain",
    direction: "METAVERSE",
    years: [2020, 2021],
    selectBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    inPoolBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    pitch: "这个概念你比所有人都先见过——至少你是这么认为的。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "blockchain",
    direction: "AI_NATIVE",
    years: [2024, 2025, 2026],
    selectBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    inPoolBonus: { bossTrustDelta: 1, budgetDelta: 10 },
    pitch: "从链圈到AI，你擅长在风口里找钱。",
  },
  {
    playerBackground: "outsider",
    industryBackground: "mcn",
    direction: "PARTY",
    years: [2021, 2022, 2023, 2024],
    selectBonus: { manageUpMultiplier: 1.2 },
    inPoolBonus: { bossInterveneMultiplier: 0.8 },
    pitch: "社交裂变和UGC，你在直播间天天干这个。",
  },
];

function getBackgroundUnlock(playerBackground, industryBackground, marketYear) {
  if (!playerBackground) return [];
  return UNLOCK_TABLE.filter(rule => {
    if (rule.playerBackground !== playerBackground) return false;
    if (rule.industryBackground !== null && rule.industryBackground !== industryBackground) return false;
    if (!rule.years.includes(marketYear)) return false;
    return true;
  });
}

function getBackgroundBonus(state, key) {
  if (!state.backgroundBonuses) return null;
  for (const bonus of state.backgroundBonuses) {
    if (bonus[key] !== undefined) return bonus[key];
  }
  return null;
}

function hasBackgroundBonus(state, key) {
  if (!state.backgroundBonuses) return false;
  for (const bonus of state.backgroundBonuses) {
    if (bonus[key] !== undefined) return true;
  }
  return false;
}

function getInfoDistortion(honesty) {
  if (honesty >= 7) return 0;
  if (honesty >= 5) return 0.1;
  if (honesty >= 3) return 0.2;
  return 0.3;
}

function buildDirectionPool(marketYear, playerBackground, industryBackground) {
  const year = YEAR_DATA[marketYear];

  if (year.special === "confused_year") return null;

  const hot = year.hot;
  const mocked = year.mocked;
  const mustInclude = year.mustInclude;

  let basePool;
  if (hot.length <= 2) {
    basePool = [...hot, mocked].filter(Boolean);
  } else {
    const remainingHot = hot.slice(1).filter(d => d !== mustInclude);
    const secondary = remainingHot[Math.floor(Math.random() * remainingHot.length)];
    basePool = [hot[0], mocked, secondary];
    if (mustInclude && !basePool.includes(mustInclude)) {
      basePool.push(mustInclude);
    }
  }

  const unlocks = getBackgroundUnlock(playerBackground, industryBackground, marketYear);

  if (unlocks.length === 0) {
    return basePool.map(d => ({ direction: d }));
  }

  let pool = basePool.map(d => ({ direction: d }));

  for (const unlock of unlocks) {
    const existingIdx = pool.findIndex(p => p.direction === unlock.direction);
    if (existingIdx >= 0) {
      pool[existingIdx] = {
        ...pool[existingIdx],
        backgroundBonus: unlock.inPoolBonus || unlock.selectBonus,
        pitch: unlock.pitch,
        tag: "背景加成",
      };
    } else {
      pool.push({
        direction: unlock.direction,
        backgroundBonus: unlock.selectBonus,
        pitch: unlock.pitch,
        tag: "背景加成",
      });
    }
  }

  return pool;
}

function checkDirectionMatch(gameDirection, marketYear) {
  const { hot, mocked } = YEAR_DATA[marketYear];

  if (gameDirection === hot[0]) return "primary";
  if (hot.slice(1).includes(gameDirection)) return "secondary";
  if (gameDirection === mocked) return "mocked";
  return "neutral";
}

function getMockedEvent(marketYear) {
  const flavor = YEAR_DATA[marketYear]?.mockedFlavor || "「这个方向已经过时了。」";
  return {
    id: "peer_mock",
    name: "同行质疑",
    emoji: "👀",
    color: "#64748b",
    tagline: "「你确定要做这个方向？」",
    situation: "行业沙龙上，有人认出了你做的方向：",
    dialogue: flavor,
    choices: [
      { text: "我们做的不一样。", effects: { morale: 3, bossTrust: 0 }, result: "他点点头，没再说什么。你知道他不信。" },
      { text: "微笑，换话题。", effects: { morale: 0, bossTrust: 0 }, result: "你们换了个话题。那句话留在空气里。" },
      { text: "「你说得对，我们在重新评估。」", effects: { morale: -5, bossTrust: 1 }, result: "他满意地点头。你的老板后来不知从哪听说了这件事，觉得你很务实。" },
    ],
  };
}

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

const COMPANY_DIRECTION_FILTER = {
  big: ["OPENWORLD", "ARPG", "MOBA", "SLG"],
  mid: ["CARD", "ARPG", "MOBA", "ROMANCE", "IDLE"],
  small: ["CASUAL", "CARD", "IDLE", "PARTY", "ROMANCE"],
};

const DIRECTION_SELECT_EVENT = {
  id: "direction_select",
  name: "方向选择",
  emoji: "🎯",
  color: "#7678f0",
  tagline: "立项评审前一天",
  situation: "市场上什么都有人做，但不是什么都有人买单。你需要定下方向。",
  dialogue: "老板在等你的立项方案。\n\n你必须在这几天确定产品方向，否则……他会帮你选。",
  choices: [],
};

const PEER_MOCK_EVENT = {
  id: "peer_mock",
  name: "同行质疑",
  emoji: "😏",
  color: "#ef4444",
  tagline: "行业聚会",
  situation: "月度行业沙龙。",
  dialogue: "一个做了三年热门赛道的制作人看着你：\n\n\"还在做那个方向？现在没人玩这个了。\"\n\n他不是在问，是在陈述。",
  choices: [
    { text: "「我们做的不一样。」", effects: { morale: 3, bossTrust: 0 }, result: "你坚持了自己的判断。" },
    { text: "微笑，换话题。", effects: { morale: 0, bossTrust: 0 }, result: "你没有接话，心里有自己的算盘。" },
    { text: "「你说得对，我们在重新评估。」", effects: { morale: -5, bossTrust: -1 }, result: "你开始怀疑自己的选择。" },
  ],
};

const CONFUSED_YEAR_STRATEGY_EVENT = {
  id: "confused_year_strategy",
  name: "你要做什么？",
  emoji: "🌫️",
  color: "#64748b",
  tagline: "「这一年，没有人知道答案。」",
  situation: "立项会上，老板问了你一个问题：",
  dialogue: "「你觉得我们应该做什么方向？」\n\n会议室安静了。\n前几年的风口一个接一个地凉了，资本开始退潮，行业里雷声不断。\n没有人知道下一个风口在哪里——甚至没有人确定还有没有风口。\n你看着白板，上面写着三个选项。",
  choices: [
    { text: "「跟上AI，这是唯一确定的方向。」", effects: { morale: -3 }, direction: "AI_NATIVE", result: "团队沉默了一下。有人在记事本上写了'AI'，然后划掉了，然后又写上。" },
    { text: "「先活下去，做能卖出去的东西。」", effects: { budget: 5 }, direction: "LEGACY", result: "这是最保守的答案。老板点了点头，没有表现出失望，也没有表现出期待。" },
    { text: "「我们找一个别人还没做的缝隙——成本低，赌出来就大赚。」", effects: { morale: 5, bossTrust: -1 }, direction: "MINI_GAME", result: "他抬头看了你一眼。「小游戏？」他顿了一下，「……行，你来负责。」投资方那边，你知道他们现在更喜欢这个。" },
  ],
};

const CAPITAL_WAVE_EVENT = {
  id: "capital_wave",
  name: "资本来了",
  emoji: "💰",
  color: "#10b981",
  tagline: "「只要利润率比银行存款高，他们就愿意投。」",
  situation: "你接到了一个陌生电话：",
  dialogue: "对方自报家门，是某投资机构的合伙人。\n\n「我们最近在看游戏赛道。你们项目……有没有融资计划？\n只要你告诉我，你提供的利润率比银行存款利率高，我们就可以谈。」\n你看了一眼手里的预算表。",
  choices: [
    { text: "「我们对融资开放，欢迎深入了解。」", effects: { budget: 20, bossTrust: 1 }, scheduledEvent: { delay: 8, id: "capital_pressure" }, result: "他很满意。钱进来了。你隐约觉得这笔钱有点烫手。" },
    { text: "「我们暂时不考虑外部融资。」", effects: { morale: 3 }, result: "他说了声好，挂了电话。你不知道这个决定对不对。" },
    { text: "「能不能先了解一下你们的诉求？」", effects: { budget: 10, bossTrust: 0 }, scheduledEvent: { delay: 6, id: "capital_pressure" }, result: "谈了两个小时。你拿到了钱，但也多了一个需要汇报的人。" },
  ],
};

const CAPITAL_PRESSURE_EVENT = {
  id: "capital_pressure",
  name: "资本来问账了",
  emoji: "📊",
  color: "#f59e0b",
  tagline: "「DAU多少？留存怎么样？」",
  situation: "投资方合伙人发来一条消息，语气和第一次打电话时完全不同：",
  dialogue: "「你们上个月的数据我看了。\nDAU没达到我们投前聊的预期。\n留存率……我们需要见一面。\n对了，我有几个建议，你们的方向可能需要调整一下。」\n你看着消息，想起他第一次打电话时的语气。",
  choices: [
    { text: "「好，我们来聊。」", effects: { bossTrust: -1, morale: -5 }, scheduledEvent: { delay: 4, id: "capital_direction_change" }, result: "见面谈了两个小时。他的「建议」其实是要求。你带着一页修改意见回到公司，不知道怎么跟团队说。" },
    { text: "「数据我来解释，方向我们不会改。」", effects: { bossTrust: 1, morale: 3, budget: -10 }, result: "他沉默了很久。「好，你来负责。」\n你知道这句话的意思——如果后面数据还不行，这是你签字的。" },
    { text: "「我们需要更多时间，数据还在爬坡。」", effects: { morale: -3 }, scheduledEvent: { delay: 3, id: "capital_pressure" }, result: "他接受了。这个月。\n你在日历上标了下次汇报的日期，感觉像是在倒计时。" },
  ],
};

const CAPITAL_DIRECTION_CHANGE_EVENT = {
  id: "capital_direction_change",
  name: "资方建议",
  emoji: "📋",
  color: "#dc2626",
  tagline: "「有几个小建议，你们评估一下。」",
  situation: "投资方发来了修改后的「建议清单」，格式化成了一份PPT：",
  dialogue: "第3页：「建议增加付费点设计，参考XX游戏」\n第7页：「建议优化变现路径，DAU转化率目标提升至X%」\n第12页：「建议评估方向调整可行性，当前赛道竞争过于激烈」\n最后一页写着：「以上建议请于两周内给出书面回复。」",
  choices: [
    { text: "「部分接受，付费点我们可以优化。」", effects: { qualityDebt: 10, budget: 8 }, result: "你把第3页的意见转给了策划组。他们没有说什么，开始改需求文档。" },
    { text: "「全部拒绝，按我们的节奏来。」", effects: { bossTrust: -2, morale: 8 }, result: "你发了一封非常礼貌的拒绝邮件。团队知道了，有人私下找你说了声谢谢。\n你不知道这件事会有什么后果。" },
    { text: "「开个会，让团队自己决定接受哪些。」", effects: { morale: -5, progress: -3 }, result: "会开了三个小时。最后达成的共识是：什么都没定。但大家都有点累。" },
  ],
};

const CHESS_CARD_JQK_EVENT = {
  id: "chess_card_jqk",
  name: "翻译问题",
  emoji: "🃏",
  color: "#8b5cf6",
  tagline: "「J应该叫什么？」",
  situation: "本地化团队发来了一个紧急问题：",
  dialogue: "「我们的棋牌游戏要上线，但扑克牌的JQK怎么翻译成中文？\nJ叫'武士'？'骑士'？还是就叫'J'？\nQ叫'皇后'还是'女王'？K叫'国王'还是'老K'？\n用户研究显示，35岁以上用户认'老K'，18-25岁用户认'K'……\n这是个紧急问题，今晚要定。」",
  choices: [
    { text: "「J/Q/K，国际化，年轻用户优先。」", effects: { morale: 3 }, result: "上线后，有用户投诉说'不中国'。有用户说'终于正常了'。各占一半。" },
    { text: "「武士/皇后/国王，本土化。」", effects: { progress: -1 }, result: "改文案花了一天。上线后没人提这件事。" },
    { text: "「这不是紧急问题，维持原样先上。」", effects: { qualityDebt: 5 }, result: "维持了J/Q/K英文。第一个差评是关于这个的。" },
  ],
};

const AUTO_CHESS_WINDOW_EVENT = {
  id: "auto_chess_window",
  name: "窗口期",
  emoji: "⏳",
  color: "#f59e0b",
  tagline: "「只有三个月。」",
  situation: "老朋友发来消息：",
  dialogue: "「自走棋这个品类，我认识的几个团队都在做。\n有人说窗口期只有三个月——做出来就是钱，做不出来就什么都没了。\n你们现在进度怎么样？」\n你看了一眼进度条。",
  choices: [
    { text: "「全力冲刺，窗口期内上线。」", effects: { progress: 10, morale: -12, qualityDebt: 15 }, result: "上线了。质量粗糙，但赶上了窗口。" },
    { text: "「按计划做，质量第一。」", effects: { morale: 5 }, result: "你没有改变节奏。三个月后，市场上已经有七款自走棋。" },
    { text: "「重新评估，窗口期可能已经关了。」", effects: { progress: -5, bossTrust: 1 }, result: "你跟老板说了你的判断。他沉默了一会儿，说：'你觉得我们还要继续吗？'" },
  ],
};

const MARKET_BOOM_EVENT = {
  id: "market_boom",
  name: "市场热潮",
  emoji: "🔥",
  color: "#f97316",
  tagline: "风口来了",
  situation: "整个行业都在讨论一个新方向。",
  dialogue: "老板转发了三篇行业分析文章给你，末尾附了一句话：\n\n\"我们要不要跟？\"",
  choices: [
    { text: "坚守方向，不跟风", effects: { progress: 0, morale: 5 }, result: "你顶住了压力，但老板有些失望。", kpiEffect: "tighten" },
    { text: "表面融入，核心不变", effects: { progress: -2, morale: 0 }, result: "你加了一些时髦概念，至少面子上过得去。", kpiEffect: "none" },
    { text: "全力跟风，改方向", effects: { progress: -8, morale: -5 }, result: "你推翻了之前的积累，全力追赶风口。方向匹配度下降了。", kpiEffect: "loosen", directionDamage: true },
  ],
};

const NARRATE_EVENTS = {
  type: "narration",
};

const PHASE_LABELS = [
  { min: 0, label: "概念原型期" }, { min: 25, label: "核心开发期" },
  { min: 50, label: "功能收尾期" }, { min: 75, label: "上线冲刺期" },
];

function PrologueScreen({ initState, onStart }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setShown(1), 300),
      setTimeout(() => setShown(2), 800),
      setTimeout(() => setShown(3), 1200),
      setTimeout(() => setShown(4), 1800),
      setTimeout(() => setShown(5), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const year = initState.marketYear;
  const sizeLabel = { big: "大厂", mid: "中型公司", small: "小厂" }[initState.companySize] || "公司";
  const bgLabel = { designer: "策划", engineer: "程序", artist: "美术", pm: "项管", outsider: "跨行业" }[initState.playerBackground] || "";
  const yearData = YEAR_DATA[year];
  const catchphrase = (yearData && yearData.catchphrase) || "";

  const line = (minShown, delay, content, style) => ({
    opacity: shown >= minShown ? 1 : 0,
    transform: shown >= minShown ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
    ...style,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#666", marginBottom: 24, ...line(1, 0) }}>
        你坐下了。
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 14, color: "#888", lineHeight: 2, marginBottom: 8, ...line(2, 0) }}>
        {year}年 · {sizeLabel} · {bgLabel}出身
      </div>
      {catchphrase && (
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 20, fontStyle: "italic", ...line(2, 0.15) }}>
          「{catchphrase}」
        </div>
      )}
      <div style={{ fontFamily: "monospace", fontSize: 14, color: "#777", lineHeight: 1.8, marginBottom: 20, ...line(3, 0) }}>
        工位上有一台电脑，<br />
        桌角贴着一张便利贴——<br />
        <span style={{ color: "#aaa" }}>「6个月。别搞砸了。」</span>
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#555", lineHeight: 1.6, marginBottom: 32, ...line(4, 0) }}>
        预算 {initState.budget} · 士气 {initState.morale} · 信任 {initState.bossTrust}
      </div>
      <button
        onClick={onStart}
        style={{
          background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8,
          padding: "13px 14px", fontSize: 15, cursor: "pointer", width: "100%",
          transition: "all 0.15s",
          ...line(5, 0),
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
        开始 →
      </button>
    </div>
  );
}

function OnboardingScreen({ pickedCards, onDone }) {
  const [step, setStep] = useState(0);

  const screens = [
    {
      header: "第0周  入职",
      content: <>前台坐着一个人，在等你。<br /><br />你大概知道那是公司的某个高层，<br />也是老板的弟弟，<br />叫 Tom。<br /><br />他没有站起来，淡淡地抬起上眼皮。<br /><br />「来了。跟我来。」</>,
      button: "继续 →"
    },
    {
      header: "我有多少时间？",
      content: <>「试用期六个月，24周。」<br /><br />「你要在这24周里，<br />  把游戏的完成度推到100。」<br />「每4周，上面会来看一次进度。<br />  那是你证明自己的节点。」</>,
      button: "继续 →"
    },
    {
      header: "我每周要做什么？",
      content: <>「你有行动点。分配给你觉得重要的事。」<br /><br />  推进度  /  维持团队  /  管理老板<br /><br />「行动结束，会有一件事找上门。」<br /><br />「那件事需要你做决定。」<br /><br />「没有标准答案。」</>,
      button: "继续 →"
    },
    {
      header: "别让这四个东西归零",
      content: <>Tom 指了指走廊尽头的白板。<br /><br />  📈 进度         推到100才算过<br />  💪 士气         归零项目解散<br />  💰 预算         烧完项目停摆<br />  🤝 老板信任     跌光你被开除<br /><br />「士气、预算、老板信任，<br />任何一个先到底，就结束了。」</>,
      button: "继续 →"
    },
    {
      header: "",
      content: <>Tom 转身要走，停了一下。<br /><br />「还有一件事。」<br /><br />「这里没有人会告诉你怎么做选择。」<br /><br />「但每一个决定，都会被记住。」<br /><br />你不确定他说的是"我哥会记住"，<br />还是别的什么。</>,
      button: "好，我准备好了 →"
    }
  ];

  const current = screens[step];

  const handleNext = () => {
    if (step < screens.length - 1) {
      setStep(step + 1);
    } else {
      onDone();
    }
  };

  return (
    <div key={`onboard-${step}`} style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div>
        <div style={{ fontSize: 12, color: "#c7c7c7", fontFamily: "monospace", marginBottom: 12, animation: "fadeUp 0.4s ease 0s forwards", opacity: 0 }}>
          {step + 1} / {screens.length}
        </div>
        {current.header && (
          <div style={{ fontSize: 17, fontWeight: 700, color: "#999", marginBottom: 20, animation: "fadeUp 0.4s ease 0.2s forwards", opacity: 0 }}>{current.header}</div>
        )}
        <div style={{ fontFamily: "monospace", fontSize: 15, color: "#c7c7c7", lineHeight: 1.8, marginBottom: 32, animation: "fadeUp 0.4s ease 0.5s forwards", opacity: 0 }}>
          {current.content}
        </div>
        <button onClick={handleNext}
          style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer", width: "100%", transition: "all 0.15s", textAlign: "left", animation: "fadeUp 0.4s ease 0.9s forwards", opacity: 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
          {current.button}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [appPhase, setAppPhase] = useState("intro"); // "intro" | "cards" | "onboarding" | "prologue" | "game"
   const [cardStep, setCardStep] = useState(0);
   const [pickedCards, setPickedCards] = useState([]);
   const [prologueState, setPrologueState] = useState(null);

   const [state, setState] = useState(() => {
     const years = [2010, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
     const marketYear = years[Math.floor(Math.random() * years.length)];
     return { week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false, lucidConfidant: null, scheduledEvents: [], lucidPhase1: null, lucidTriggered: false, bossTrust: Math.floor(Math.random() * 6) + 3, hireBurdenWeeksLeft: 0, hireBurdenRate: 0, hireScale: null, problemEmployee: null, activeBonus: 0, manpowerTriggered: false, teamSlots: [], qualityDebt: 0, gameDirection: null, directionChosen: false, directionDelayPenalty: false, marketYear, companySize: "mid", kpiState: "normal", ipType: "none", ipActive: false, ipProtectUsed: 0, ipProtectCount: 0, ipRevealShown: false, overtimeThisWeek: false, narrationsUsed: [], consecutiveGoodMonths: 0, kpiBoostMonths: 0, manageUpCount: 0, progressLastMonth: 0, industryBackground: null, playerBackground: null, backgroundBonuses: [], honesty: 10, people: 10, quality: 10, judgment: 10, grit: 10, crisisComfortCount: 0, teamComfortCount: 0, bossTrustHitZero: false, fakeProgress: 0, honestyHintShown: false, honestyMidHintShown: false, peopleHintShown: false, qualityHintShown: false, usedActions: [], lastManageUpResult: null };
   });

  const [workMode, setWorkMode] = useState("normal");
  const [overtimeType, setOvertimeType] = useState("pay");
  const [pieCount, setPieCount] = useState(0);
  const [apSpent, setApSpent] = useState(0);
  const [freezeDone, setFreezeDone] = useState(false);
  const [activeTip, setActiveTip] = useState(null);
  const [teamPanelExpanded, setTeamPanelExpanded] = useState(false);
  const [recruitCandidate, setRecruitCandidate] = useState(null);
  const [layoffPanelOpen, setLayoffPanelOpen] = useState(false);
  const [layoffConfirmMember, setLayoffConfirmMember] = useState(null);
  const [layoffPendingMember, setLayoffPendingMember] = useState(null);
  const [recruitResultMessage, setRecruitResultMessage] = useState("");

  const apTotalForAction = WORK_MODES[workMode].ap + (state.apBonusPerWeek || 0);
  const apLeftForAction = Math.max(0, apTotalForAction - apSpent);
  const isMonthEndForAction = state.week % 4 === 0;
  const ctxForAction = { freezeDone, isMonthEnd: isMonthEndForAction };
  const healthTierForAction = getProductHealthTier(getProductHealthScore(state.qualityDebt, state.gameDirection, state.marketYear));

   const takeAction = useCallback((action) => {
     if (apLeftForAction < action.ap) return;
     if (!action.available(state, ctxForAction)) return;
     if (state.usedActions.includes(action.id)) return;
     setRecruitResultMessage("");

     if (action.id === "campus" || action.id === "social") {
       const roles = ['engineer', 'designer', 'qa'];
       const role = roles[Math.floor(Math.random() * roles.length)];
       const tags = action.id === "campus" ? CAMPUS_TAGS : SOCIAL_TAGS;
       const shuffled = [...tags].sort(() => Math.random() - 0.5);
       const selectedTags = shuffled.slice(0, 2);
       const seniority = action.id === "campus" ? "fresh" : (Math.random() < 0.5 ? "mid" : "veteran");
       const isTroublemaker = action.id === "social" && Math.random() < 0.3;

       setRecruitCandidate({
         type: action.id,
         role,
         seniority,
         tags: selectedTags,
         apCost: action.ap,
         hiddenType: isTroublemaker ? "troublemaker" : null,
       });
       setRecruitResultMessage("");
       setState(prev => ({ ...prev, usedActions: [...prev.usedActions, action.id] }));
       setApSpent(p => p + action.ap);
       return;
     }

     if (action.id === "layoff") {
       setLayoffPanelOpen(true);
       setState(prev => ({ ...prev, usedActions: [...prev.usedActions, action.id] }));
       setApSpent(p => p + action.ap);
       return;
     }

     setState(prev => {
       let result = action.apply(prev);
       if (action.id === "care" || action.id === "comfort") {
         const healDelta = result.morale - prev.morale;
         if (healDelta > 0) {
           const mult = healthTierForAction.healMult;
           result = { ...result, morale: Math.min(100, prev.morale + Math.round(healDelta * mult)) };
         }
       }
       return { ...result, usedActions: [...result.usedActions, action.id] };
     });
     setApSpent(p => p + action.ap);
     if (action.id === "freeze") setFreezeDone(true);
   }, [apLeftForAction, state, ctxForAction, healthTierForAction]);

  const handleHireCandidate = useCallback(() => {
    if (!recruitCandidate) return;
    const { type, role, seniority, apCost, hiddenType } = recruitCandidate;
    const newMember = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      seniority,
      source: type,
      contribution: seniority === "veteran"
        ? { progressEfficiency: 1.2, moraleBase: 0, budgetCoeff: 1.3 }
        : seniority === "mid"
        ? { progressEfficiency: 0.9, moraleBase: 2, budgetCoeff: 0.9 }
        : { progressEfficiency: 0.5, moraleBase: -2, budgetCoeff: 0.5 },
      weeksJoined: 0,
      hiddenType,
    };
    setState(prev => ({
      ...prev,
      teamSlots: [...prev.teamSlots, newMember],
      budget: type === "social" ? Math.max(0, prev.budget - 15) : prev.budget,
    }));
    setApSpent(p => p + apCost);
    setRecruitResultMessage(`${ROLE_NAMES[role]} 加入了团队。`);
    setRecruitCandidate(null);
  }, [recruitCandidate]);

  const handleSkipCandidate = useCallback(() => {
    setRecruitCandidate(null);
    setRecruitResultMessage("");
  }, []);

  const handleRequestLayoffConfirm = useCallback((member) => {
    setLayoffPendingMember(member);
  }, []);

  const handleConfirmLayoff = useCallback(() => {
    if (!layoffPendingMember) return;
    const memberId = layoffPendingMember.id;
    setState(prev => ({
      ...prev,
      teamSlots: prev.teamSlots.filter(m => m.id !== memberId),
      bossTrust: Math.max(0, prev.bossTrust - 1),
      morale: Math.max(0, prev.morale - 10),
      people: Math.max(0, prev.people - 2),
    }));
    setLayoffConfirmMember(layoffPendingMember);
    setLayoffPendingMember(null);
    setLayoffPanelOpen(false);
  }, [layoffPendingMember]);

  const handleCancelLayoffConfirm = useCallback(() => {
    setLayoffPendingMember(null);
  }, []);

  const handleCloseLayoffResult = useCallback(() => {
    setLayoffConfirmMember(null);
  }, []);

  const [weekPhase, setWeekPhase] = useState("planning"); // "planning" | "event"
  const [showMonthSummary, setShowMonthSummary] = useState(false);
  const [monthSummaryData, setMonthSummaryData] = useState(null);
  const [monthStartProgress, setMonthStartProgress] = useState(0);

  const [pendingMilestone, setPendingMilestone] = useState(null);

  const [event, setEvent] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState("");
  const [lastConfidantReveal, setLastConfidantReveal] = useState("");
  const [lastBossReaction, setLastBossReaction] = useState("");
  const [lastEffects, setLastEffects] = useState(null);
  const [lastWorkEffect, setLastWorkEffect] = useState(null);
  const [animKey, setAnimKey] = useState(0);

   const pickEvent = useCallback((gameState) => {
     const s = gameState || state;
     const newWeek = s.week + 1;
     
     if (s.week === 1 && !s.narrationsUsed?.includes("narrateA") && s.marketYear && YEAR_DATA[s.marketYear]) {
       const yearData = YEAR_DATA[s.marketYear];
       return {
         id: "narration",
         type: "narration",
         text: yearData.narrateA,
         narrateKey: "narrateA",
         emoji: "📰",
         color: "#64748b",
         name: "行业动态",
         tagline: "",
         situation: "",
         dialogue: yearData.narrateA,
       };
     }
     
        if (!s.directionChosen && newWeek >= 2 && newWeek < 5) {
          const pool = buildDirectionPool(s.marketYear, s.playerBackground, s.industryBackground);
          
          if (pool === null) {
            return CONFUSED_YEAR_STRATEGY_EVENT;
          }
          
          const choices = pool.map(item => ({
            text: item.tag
              ? `${DIRECTIONS[item.direction].label} — ${item.pitch} [背景加成]`
              : `${DIRECTIONS[item.direction].label} — ${DIRECTIONS[item.direction].pitch}`,
            effects: {},
            direction: item.direction,
            backgroundBonus: item.backgroundBonus || null,
            result: `你决定走${DIRECTIONS[item.direction].label}路线。`,
          }));
          choices.push({
            text: "我再想想 — 再等一周，但老板会不高兴",
            effects: { budget: -3, bossTrust: -1 },
            direction: null,
            result: "你决定先不急着定方向。老板皱了皱眉，但没说什么。",
          });
          return { ...DIRECTION_SELECT_EVENT, choices };
        }
      
      if (!s.directionChosen && newWeek >= 5) {
       if (newWeek === 5) {
         const availableDirs = COMPANY_DIRECTION_FILTER[s.companySize] || COMPANY_DIRECTION_FILTER.mid;
         const randomDir = availableDirs[Math.floor(Math.random() * availableDirs.length)];
         return {
           id: "direction_forced",
           name: "老板定了",
           emoji: "😤",
           color: "#dc2626",
           tagline: "「就这样吧」",
           situation: "老板等不及了。",
           dialogue: "他帮你选了方向。",
           choices: [{ text: `接受：${DIRECTIONS[randomDir].label}`, effects: { morale: -8 }, direction: randomDir, result: "你失去了选择权。" }],
         };
       }
     }
     
     const milestoneMonth = Math.ceil((newWeek - 1) / 4);
     if (milestoneMonth >= 1 && milestoneMonth <= 5 && (newWeek - 1) % 4 === 0) {
       const milestone = MILESTONE_EVENTS.find(m => m.month === milestoneMonth);
       if (milestone) return milestone;
     }
     
     if (s.ipActive && !s.ipRevealShown && newWeek >= 2 && newWeek <= 4) {
       return {
         id: "ip_reveal",
         name: "IP授权方",
         emoji: "📜",
         color: "#8b5cf6",
         tagline: "「对了，还有个事」",
         situation: "在你正式接手这个项目之前，有人提到了IP方。",
         dialogue: "你点点头，说没问题。\n\n你当时不知道这意味着什么。",
         choices: [{ text: "知道了", effects: {}, result: "你记下了这件事。" }],
       };
     }
     
      if (s.gameDirection && !s.narrationsUsed?.includes("peer_mock")) {
        const yearData = YEAR_DATA[s.marketYear];
        if (yearData?.mocked && yearData.mocked === s.gameDirection && newWeek >= 8 && newWeek <= 12 && Math.random() < 0.4) {
          return getMockedEvent(s.marketYear);
        }
      }

      if (s.marketYear === 2012 && s.gameDirection === "CHESS_CARD" && newWeek >= 2 && newWeek <= 5 && !s.narrationsUsed?.includes("chess_card_jqk")) {
        return CHESS_CARD_JQK_EVENT;
      }

      if (s.marketYear === 2019 && s.gameDirection === "AUTO_CHESS" && newWeek === 12 && !s.narrationsUsed?.includes("auto_chess_window")) {
        return AUTO_CHESS_WINDOW_EVENT;
      }

      if (s.marketYear === 2020 && newWeek >= 8 && newWeek <= 16 && !s.narrationsUsed?.includes("capital_wave") && Math.random() < 0.3) {
        return CAPITAL_WAVE_EVENT;
      }
     
     const monthEnd = (newWeek - 1) % 4 === 0;
     
     if (!monthEnd && s.marketYear && YEAR_DATA[s.marketYear]) {
       const used = s.narrationsUsed || [];
       const yearData = YEAR_DATA[s.marketYear];
       if (!used.includes("narrateB") && Math.random() < 0.25) {
         return {
           id: "narration",
           type: "narration",
           text: yearData.narrateB,
           narrateKey: "narrateB",
           emoji: "📰",
           color: "#64748b",
           name: "行业动态",
           tagline: "",
           situation: "",
           dialogue: yearData.narrateB,
         };
       }
     }
     
     if (milestoneMonth >= 2 && milestoneMonth <= 5 && !s.marketBoomTriggered && Math.random() < 0.08) {
       return MARKET_BOOM_EVENT;
     }
     
       if (s.scheduledEvents && s.scheduledEvents.length > 0) {
         const due = s.scheduledEvents.find(e => e.week <= newWeek);
         if (due) {
           if (due.id === "boss_talk") return BOSS_TALK;
           if (due.id === "hire_reveal") return HIRE_REVEAL_EVENT;
           if (due.id === "capital_pressure") return CAPITAL_PRESSURE_EVENT;
           if (due.id === "capital_direction_change") return CAPITAL_DIRECTION_CHANGE_EVENT;
           if (TRUST_DECAY_EVENTS[due.id]) {
             return TRUST_DECAY_EVENTS[due.id];
           }
           const event = EVENTS.find(e => e.id === due.id) || LUCID_P2;
           return event;
         }
       }
     
      if (s.pendingEvents && s.pendingEvents.length > 0) {
        if (s.pendingEvents[0] === "zombie_reveal") return ZOMBIE_REVEAL;
        if (s.pendingEvents[0] === "market_trend") return getMarketTrendEvent(s.marketYear);
        const pendingEvent = EVENTS.find(e => e.id === s.pendingEvents[0]);
        if (pendingEvent) return pendingEvent;
      }
     
     if (!s.lucidTriggered && newWeek >= 3 && newWeek <= 16 && Math.random() < 0.125) {
       return LUCID_P1;
     }
     
      let pool = [...EVENTS.filter(e => e.id !== "market_trend")];
      
      if (s.kpiState === "tight") {
        CORP_EVENTS.forEach(id => {
          if (id === "market_trend" && Math.random() < 0.3) {
            pool.push(getMarketTrendEvent(s.marketYear));
            return;
          }
          const e = EVENTS.find(x => x.id === id);
          if (e && Math.random() < 0.3) pool.push(e);
        });
       pool = pool.filter(e => {
         if (e.id === "dreamer" || e.id === "visionary") return Math.random() < 0.7;
         return true;
       });
     } else if (s.kpiState === "loose") {
       const creativeIds = ["dreamer", "visionary", "castle"];
       creativeIds.forEach(id => {
         const e = EVENTS.find(x => x.id === id);
         if (e && Math.random() < 0.3) pool.push(e);
       });
       pool = pool.filter(e => {
         if (CORP_EVENTS.includes(e.id)) return Math.random() < 0.7;
         return true;
       });
     }
     
      if (s.bossTrust <= 4) {
        CORP_EVENTS.forEach(id => {
          if (id === "market_trend") {
            pool.push(getMarketTrendEvent(s.marketYear));
            return;
          }
          const e = EVENTS.find(x => x.id === id);
          if (e) pool.push(e);
        });
      }
      if (s.bossTrust >= 8) {
        pool = pool.filter(e => !CORP_EVENTS.includes(e.id) || Math.random() < 0.5);
      }
     
      if (!s.manpowerTriggered && newWeek >= 5 && newWeek <= 18 && pool.find(e => e.id === "manpower")) {
        const idx = pool.findIndex(e => e.id === "manpower");
        if (idx >= 0) pool.splice(idx, 1);
        if (Math.random() < 0.1) {
          return MANPOWER_EVENT;
        }
      } else {
        const idx = pool.findIndex(e => e.id === "manpower");
        if (idx >= 0) pool.splice(idx, 1);
      }
      
      const honestyWeightMod = s.honesty >= 7 ? 0.8
                              : s.honesty >= 5 ? 1.0
                              : s.honesty >= 3 ? 1.2
                              : 1.4;
      if (honestyWeightMod !== 1.0) {
        const affectedIds = ["corp_kpi", "corp_approval", "kpi_review", "trust_decay_hidden_progress", "trust_decay_promise_broken"];
        const poolCopy = [...pool];
        pool = [];
        for (const e of poolCopy) {
          if (affectedIds.includes(e.id)) {
            if (honestyWeightMod > 1.0) {
              const extraCopies = Math.floor(honestyWeightMod);
              for (let i = 0; i < extraCopies; i++) pool.push(e);
            } else if (honestyWeightMod < 1.0 && Math.random() > 0.8) {
              continue;
            }
          }
          pool.push(e);
        }
      }

      const isMilestoneWeek = milestoneMonth >= 1 && milestoneMonth <= 5 && (newWeek - 1) % 4 === 0;
      if (isMilestoneWeek && s.honesty >= 7 && !(s.narrationsUsed || []).includes("honesty_bonus") && Math.random() < 0.3) {
        return {
          id: "honesty_bonus",
          name: "踏实",
          emoji: "🤝",
          color: "#64748b",
          tagline: "上面说，你报的数字靠谱",
          situation: "月度结算后，你收到一条消息：",
          dialogue: "投资方代表发来一条简短的微信：「看了你的月报，数字比较实在。继续。」没有什么特别的事，但你知道——在所有人都在注水的时候，这个评价很值钱。",
          choices: [
            { text: "继续如实汇报。", effects: { budget: 5, bossTrust: 1 }, hidden: { honesty: 1 }, result: "你回了个「收到」。预算多一点，信任多一点。" }
          ]
        };
      }

      if (s.gameDirection && s.directionChosen) {
        const dirEvents = DIRECTION_SPECIFIC_EVENTS.filter(e =>
          e.direction === s.gameDirection
          && newWeek >= e.minWeek
          && !(s.narrationsUsed || []).includes(e.id)
        );
        pool = [...pool, ...dirEvents];

        const profile = DIRECTION_TEAM_SCALE[s.gameDirection];
        if (profile && s.teamSlots.length < profile.minViable
            && newWeek >= 5 && !(s.narrationsUsed || []).includes("team_shortage")) {
          return getTeamShortageEvent(s.gameDirection, s.teamSlots.length, profile);
        }
        if (profile && s.teamSlots.length > profile.overcrowd
            && newWeek >= 8 && !(s.narrationsUsed || []).includes("team_overcrowd")) {
          return getTeamOvercrowdEvent(s.gameDirection, s.teamSlots.length, profile);
        }
      }
      
      const selectedEvent = pool[Math.floor(Math.random() * pool.length)];
       if (selectedEvent && selectedEvent.id === "firefighter" && hasBackgroundBonus(s, "firefighterExtraChoice")) {
         return {
           ...selectedEvent,
           choices: [...selectedEvent.choices, {
             text: "提出置换方案——我们借出美术，他们让出技术资源。",
             effects: { progress: -2, morale: 1, budget: 3, bossTrust: 1 },
             hidden: { judgment: 1, people: 1 },
             result: "对方没想到你会提这个。美术借出去了，但技术组借到了两个后端——正好你们缺服务器端的人。上面觉得你会办事。"
           }]
         };
       }
       return selectedEvent;
   }, [state]);

  useEffect(() => {
    if (appPhase === "game") setEvent(pickEvent(state));
  }, [appPhase]);

  // Card handlers
  const handleCardPick = (step, card) => {
    const activeGroups = getActiveCardGroups(pickedCards);
    const groupIdx = CARD_GROUPS.indexOf(activeGroups[step]);
    const newPicks = [...pickedCards];
    newPicks[groupIdx] = card;
    setPickedCards(newPicks);
  };

  const handleCardNext = () => {
    const activeGroups = getActiveCardGroups(pickedCards);
    if (cardStep < activeGroups.length - 1) {
      setCardStep(s => s + 1);
    } else {
      setAppPhase("onboarding");
    }
  };

  const handleOnboardingDone = useCallback(() => {
    const initState = buildInitialState(pickedCards);
    setPrologueState(initState);
    setAppPhase("prologue");
  }, [pickedCards]);

  const handlePrologueStart = useCallback(() => {
    if (!prologueState) return;
    setState(prologueState);
    setAppPhase("game");
    setEvent(pickEvent(prologueState));
  }, [prologueState]);

   const handleChoice = useCallback((choice, optionType) => {
     const mode = WORK_MODES[workMode];
     let moralePenalty = 0, budgetCost = 0, newPieCount = pieCount;
     if (workMode !== "normal") {
       if (overtimeType === "pay") { budgetCost = mode.budgetCost; }
       else { moralePenalty = calcPiePenalty(workMode, pieCount, state.progress); newPieCount = pieCount + 1; }
     }
     const workEffect = { workMode, overtimeType, progressBonus: mode.progressBonus, budgetCost, moralePenalty };
     const healthTier = getProductHealthTier(getProductHealthScore(state.qualityDebt, state.gameDirection, state.marketYear));

     let newConfidant = state.confidant;
     let newLucidConfidant = state.lucidConfidant;
     let confidantAppend = "";
     
       if (event?.id === "direction_select" || event?.id === "direction_forced" || event?.id === "confused_year_strategy") {
         if (choice.direction === null) {
           setState(prev => {
             const newWeek = prev.week + 1;
             const newTeamSlots = prev.teamSlots.map(m => ({
               ...m,
               weeksJoined: (m.weeksJoined || 0) + 1,
               contribution: (m.weeksJoined || 0) >= 6
                 ? { ...m.contribution, progressEfficiency: Math.min(m.contribution.progressEfficiency + 0.3, 1.0) }
                 : m.contribution
             }));
             return {
               ...prev,
               week: newWeek,
               survived: prev.survived + 1,
               morale: Math.max(0, prev.morale + (choice.effects.morale || 0)),
               budget: Math.max(0, Math.min(150, prev.budget + (choice.effects.budget || 0))),
               bossTrust: Math.min(10, Math.max(0, prev.bossTrust + (choice.effects.bossTrust || 0))),
               qualityDebt: Math.max(0, Math.min(100, prev.qualityDebt + (choice.effects.qualityDebt || 0))),
               teamSlots: newTeamSlots,
               directionDelayPenalty: true,
               usedActions: [],
               lastManageUpResult: null,
             };
           });
           setLastResult(choice.result);
           setLastEffects(choice.effects);
           setLastWorkEffect(workEffect);
           setPieCount(newPieCount);
           setShowResult(true);
           return;
         }
         const bonus = choice.backgroundBonus;
         let bonusEffects = { morale: 0, budget: 0, bossTrust: 0, qualityDebt: 0 };
         if (bonus) {
           if (bonus.qualityDebtDelta) bonusEffects.qualityDebt = bonus.qualityDebtDelta;
           if (bonus.budgetDelta) bonusEffects.budget = bonus.budgetDelta;
           if (bonus.bossTrustDelta) bonusEffects.bossTrust = bonus.bossTrustDelta;
           if (bonus.moraleDelta) bonusEffects.morale = bonus.moraleDelta;
         }
          const dirBudgetDelta = getDirectionBudgetDelta(choice.direction);
          const dirBudgetMsg = dirBudgetDelta !== 0 ? getDirectionBudgetMsg(dirBudgetDelta) : '';
          setState(prev => ({
            ...prev,
            gameDirection: choice.direction,
            directionChosen: true,
            morale: Math.max(0, prev.morale + (choice.effects.morale || 0) + bonusEffects.morale),
            budget: Math.max(0, Math.min(150, prev.budget + (choice.effects.budget || 0) + bonusEffects.budget + dirBudgetDelta)),
            bossTrust: Math.min(10, Math.max(0, prev.bossTrust + (choice.effects.bossTrust || 0) + bonusEffects.bossTrust)),
            qualityDebt: Math.max(0, Math.min(100, prev.qualityDebt + (choice.effects.qualityDebt || 0) + bonusEffects.qualityDebt)),
            backgroundBonuses: choice.backgroundBonus ? [choice.backgroundBonus] : [],
          }));
          setLastResult(choice.result + (dirBudgetMsg ? '\n' + dirBudgetMsg : ''));
         setLastEffects(choice.effects);
         setLastWorkEffect(workEffect);
         setPieCount(newPieCount);
         setShowResult(true);
         return;
       }

        if (choice.hidden) {
          setState(prev => {
            let newState = { ...prev };
            Object.entries(choice.hidden).forEach(([key, val]) => {
              if (newState[key] !== undefined) {
                newState[key] = Math.max(0, Math.min(10, newState[key] + val));
              }
            });
            if (event?.id?.startsWith("dir_")) {
              newState.narrationsUsed = [...(prev.narrationsUsed || []), event.id];
            }
            if (event?.id === "team_shortage" || event?.id === "team_overcrowd") {
              newState.narrationsUsed = [...(prev.narrationsUsed || []), event.id];
            }
            return newState;
          });
        } else if (event?.id?.startsWith("dir_") || event?.id === "team_shortage" || event?.id === "team_overcrowd") {
          setState(prev => ({
            ...prev,
            narrationsUsed: [...(prev.narrationsUsed || []), event.id],
          }));
        }

       if (event?.id === "chess_card_jqk") {
        setState(prev => ({
          ...prev,
          morale: Math.min(100, Math.max(0, prev.morale + (choice.effects.morale || 0))),
          progress: Math.max(0, prev.progress + (choice.effects.progress || 0)),
          qualityDebt: Math.min(100, prev.qualityDebt + (choice.effects.qualityDebt || 0)),
          narrationsUsed: [...(prev.narrationsUsed || []), "chess_card_jqk"],
        }));
        setLastResult(choice.result);
        setLastEffects(choice.effects);
        setLastWorkEffect(workEffect);
        setPieCount(newPieCount);
        setShowResult(true);
        return;
      }

      if (event?.id === "auto_chess_window") {
        setState(prev => ({
          ...prev,
          progress: Math.max(0, prev.progress + (choice.effects.progress || 0)),
          morale: Math.min(100, Math.max(0, prev.morale + (choice.effects.morale || 0))),
          qualityDebt: Math.min(100, prev.qualityDebt + (choice.effects.qualityDebt || 0)),
          bossTrust: Math.min(10, Math.max(0, prev.bossTrust + (choice.effects.bossTrust || 0))),
          narrationsUsed: [...(prev.narrationsUsed || []), "auto_chess_window"],
        }));
        setLastResult(choice.result);
        setLastEffects(choice.effects);
        setLastWorkEffect(workEffect);
        setPieCount(newPieCount);
        setShowResult(true);
        return;
      }

      if (event?.id === "capital_wave") {
        let newScheduledEvents = [...state.scheduledEvents];
        if (choice.scheduledEvent) {
          newScheduledEvents.push({ id: choice.scheduledEvent.id, week: state.week + choice.scheduledEvent.delay });
        }
        setState(prev => ({
          ...prev,
          budget: Math.min(100, Math.max(0, prev.budget + (choice.effects.budget || 0))),
          bossTrust: Math.min(10, Math.max(0, prev.bossTrust + (choice.effects.bossTrust || 0))),
          morale: Math.min(100, Math.max(0, prev.morale + (choice.effects.morale || 0))),
          scheduledEvents: newScheduledEvents,
          narrationsUsed: [...(prev.narrationsUsed || []), "capital_wave"],
        }));
        setLastResult(choice.result);
        setLastEffects(choice.effects);
        setLastWorkEffect(workEffect);
        setPieCount(newPieCount);
        setShowResult(true);
        return;
      }

      if (event?.id === "capital_pressure") {
        let newScheduledEvents = state.scheduledEvents.filter(e => e.id !== "capital_pressure");
        if (choice.scheduledEvent) {
          newScheduledEvents.push({ id: choice.scheduledEvent.id, week: state.week + choice.scheduledEvent.delay });
        }
        setState(prev => ({
          ...prev,
          bossTrust: Math.min(10, Math.max(0, prev.bossTrust + (choice.effects.bossTrust || 0))),
          morale: Math.min(100, Math.max(0, prev.morale + (choice.effects.morale || 0))),
          budget: Math.min(100, Math.max(0, prev.budget + (choice.effects.budget || 0))),
          scheduledEvents: newScheduledEvents,
        }));
        setLastResult(choice.result);
        setLastEffects(choice.effects);
        setLastWorkEffect(workEffect);
        setPieCount(newPieCount);
        setShowResult(true);
        return;
      }

      if (event?.id === "capital_direction_change") {
        setState(prev => ({
          ...prev,
          qualityDebt: Math.min(100, prev.qualityDebt + (choice.effects.qualityDebt || 0)),
          budget: Math.min(100, Math.max(0, prev.budget + (choice.effects.budget || 0))),
          bossTrust: Math.min(10, Math.max(0, prev.bossTrust + (choice.effects.bossTrust || 0))),
          morale: Math.min(100, Math.max(0, prev.morale + (choice.effects.morale || 0))),
          progress: Math.max(0, prev.progress + (choice.effects.progress || 0)),
          scheduledEvents: prev.scheduledEvents.filter(e => e.id !== "capital_direction_change"),
        }));
        setLastResult(choice.result);
        setLastEffects(choice.effects);
        setLastWorkEffect(workEffect);
        setPieCount(newPieCount);
        setShowResult(true);
        return;
      }
     
     if (event?.id === "ip_reveal") {
       setState(prev => ({ ...prev, ipRevealShown: true }));
       setLastResult(choice.result);
       setLastEffects({});
       setLastWorkEffect(workEffect);
       setPieCount(newPieCount);
       setShowResult(true);
       return;
     }
     
     if (event?.id === "peer_mock") {
       const bossTrustDelta = choice.effects.bossTrust || 0;
       let moraleEffect = choice.effects.morale || 0;
       const moraleMultiplier = getBackgroundBonus(state, "mockedMoralePenaltyMultiplier");
       if (moraleMultiplier && moraleEffect < 0) {
         moraleEffect = Math.round(moraleEffect * moraleMultiplier);
       }
       setState(prev => ({
         ...prev,
         morale: Math.min(100, Math.max(0, prev.morale + moraleEffect)),
         bossTrust: Math.min(10, Math.max(0, prev.bossTrust + bossTrustDelta)),
         narrationsUsed: [...(prev.narrationsUsed || []), "peer_mock"],
       }));
       setLastResult(choice.result);
       setLastEffects(choice.effects);
       setLastWorkEffect(workEffect);
       setPieCount(newPieCount);
       setShowResult(true);
       return;
     }
     
     if (event?.id === "market_boom") {
       setState(prev => {
         let newKpiState = prev.kpiState;
         if (choice.kpiEffect === "tighten") {
           newKpiState = prev.kpiState === "loose" ? "normal" : "tight";
         } else if (choice.kpiEffect === "loosen") {
           newKpiState = prev.kpiState === "tight" ? "normal" : "loose";
         }
         return {
           ...prev,
           progress: Math.max(0, prev.progress + (choice.effects.progress || 0)),
           morale: Math.min(100, Math.max(0, prev.morale + (choice.effects.morale || 0))),
           kpiState: newKpiState,
           marketBoomTriggered: true,
         };
       });
       setLastResult(choice.result);
       setLastEffects(choice.effects);
       setLastWorkEffect(workEffect);
       setPieCount(newPieCount);
       setShowResult(true);
       return;
     }
     
      if (event?.type === "narration") {
        setState(prev => {
          const newWeek = prev.week + 1;
          const expectedProgress = (newWeek / TOTAL_WEEKS) * 100;
          const newMomentum = prev.progress > expectedProgress + 10 ? 1 : prev.progress < expectedProgress - 10 ? -1 : 0;
          let newQualityDebt = prev.qualityDebt || 0;
          if (!prev.overtimeThisWeek) {
            newQualityDebt = Math.max(0, newQualityDebt - 2);
          }
          const newTeamSlots = prev.teamSlots.map(m => ({
            ...m,
            weeksJoined: (m.weeksJoined || 0) + 1,
            contribution: (m.weeksJoined || 0) >= 6
              ? { ...m.contribution, progressEfficiency: Math.min(m.contribution.progressEfficiency + 0.3, 1.0) }
              : m.contribution
          }));
           return {
             ...prev,
             week: newWeek,
             survived: prev.survived + 1,
             progressMomentum: newMomentum,
             qualityDebt: newQualityDebt,
             teamSlots: newTeamSlots,
             overtimeThisWeek: false,
             narrationsUsed: [...(prev.narrationsUsed || []), event.narrateKey],
             usedActions: [],
             lastManageUpResult: null,
           };
        });
        setLastResult("");
        setLastEffects({});
        setLastWorkEffect(workEffect);
        setPieCount(newPieCount);
        setShowResult(true);
        return;
      }
    let pendingAdd = null;
    let bossReact = "";
    let lucidPhase1 = state.lucidPhase1;
    let lucidTriggered = state.lucidTriggered;
    let newScheduledEvents = [...state.scheduledEvents];
    const currentMonth = Math.ceil(state.week / 4);

    if (event?.id === "lucid_p1") {
      lucidPhase1 = choice.phase1;
      lucidTriggered = true;
      if (choice.phase1 === "B") {
        state.bossTrust = Math.max(0, state.bossTrust - 1);
      }
      newScheduledEvents.push({ id: "lucid_p2", week: state.week + 2 });
    } else if (event?.id === "lucid_p2") {
      const outcome = choice.outcome;
      if (outcome === "unstable") {
        newLucidConfidant = { subtype: "unstable", usesLeft: 3 };
      } else {
        newLucidConfidant = { subtype: outcome };
      }
      bossReact = LUCID_OUTRO[outcome];
    }

    const isMilestone = MILESTONE_EVENTS.some(m => m.name === event?.name);
    if (isMilestone) {
      if (optionType === "A") {
        pendingAdd = "water_reveal";
        bossReact = BOSS_OK;
        state.bossTrust = Math.min(10, state.bossTrust + 1);
      } else if (optionType === "B") {
        bossReact = BOSS_NG;
        state.bossTrust = Math.max(0, state.bossTrust - 1);
      } else if (optionType === "C" && state.confidant) {
        confidantAppend = CONFIDANT_REVEALS[currentMonth][state.confidant.type];
        if (state.lucidConfidant?.subtype === "unstable") {
          pendingAdd = null;
          newLucidConfidant = { ...state.lucidConfidant, usesLeft: state.lucidConfidant.usesLeft - 1 };
          if (newLucidConfidant.usesLeft <= 0) newLucidConfidant = null;
        } else {
          if (Math.random() < 0.5) pendingAdd = null;
          else pendingAdd = "water_reveal";
        }
        bossReact = BOSS_OK;
      } else if (optionType === "D" && state.lucidConfidant?.subtype === "inner") {
        confidantAppend = LUCID_INSIGHTS[currentMonth];
        pendingAdd = null;
        bossReact = "";
      } else if (optionType === "C" && !state.confidant) {
        bossReact = BOSS_OK;
      } else {
        bossReact = BOSS_OK;
      }
     } else if (event?.id === "manpower" || event?.id === "brooks_law" || event?.id === "paratrooper") {
       if (choice.action === "ipProtect") {
         if (state.ipProtectCount === 1) {
           confidantAppend = " IP方的法务说，他们已经帮你们挡了两次了。他顿了一下，没有说第三句话。你听懂了。";
         }
       } else if (event?.id === "manpower") {
         if (choice.action === "large") {
           state.hireScale = "large";
           state.hireBurdenWeeksLeft = 4;
           state.hireBurdenRate = 2;
         } else if (choice.action === "small") {
           state.hireScale = "small";
           state.hireBurdenWeeksLeft = 3;
           state.hireBurdenRate = 1;
         } else if (choice.action === "refuse") {
           state.bossTrust = Math.max(0, state.bossTrust - 2);
         }
         state.manpowerTriggered = true;
       }
     } else if (event?.id === "hire_reveal") {
       if (choice.outcome === "god") {
         state.activeBonus = 1;
       } else if (choice.outcome === "code" || choice.outcome === "morale") {
         state.problemEmployee = { type: choice.outcome, isInfiltrator: choice.isInfiltrator };
         if (choice.isInfiltrator) state.bossTrust = Math.max(0, state.bossTrust - 2);
       }
       state.hireScale = null;
     } else if (event?.id === "boss_talk") {
       if (choice.outcome === "A") {
         state.bossTrust = Math.min(10, state.bossTrust + 3);
       } else if (choice.outcome === "B") {
         state.bossTrust = Math.min(10, state.bossTrust + 1);
       } else if (choice.outcome === "C") {
         state.gamePhase = "lose";
         state.loseReason = `老板失去了信心。项目在第${state.week}周被终止，你正式离开了这家公司。`;
       }
       // 从 scheduledEvents 移除
       const talkIdx = newScheduledEvents.findIndex(e => e.id === "boss_talk");
       if (talkIdx >= 0) newScheduledEvents.splice(talkIdx, 1);
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

      if (event?.id === "water_reveal" && optionType === 1) {
        newScheduledEvents.push({ id: "trust_decay_hidden_progress", week: state.week + 6 });
      }
      if (event?.id === "kpi_review" && optionType === 0) {
        newScheduledEvents.push({ id: "trust_decay_promise_broken", week: state.week + 4 });
      }
      if (event?.id === "trust_decay_hidden_progress" || event?.id === "trust_decay_promise_broken") {
        const tdIdx = newScheduledEvents.findIndex(e => e.id === event.id);
        if (tdIdx >= 0) newScheduledEvents.splice(tdIdx, 1);
        if (event?.id === "trust_decay_promise_broken") {
          const expectedProgress = (state.week / TOTAL_WEEKS) * 100;
          if (state.progress >= expectedProgress - 10) {
            choice = { ...choice, effects: {} };
          }
        }
      }
     if (event?.id !== "water_reveal" && !isMilestone) {
       bossReact = "";
     }
    if (event?.id === "water_reveal") {
      bossReact = "";
    }

    const tempWeek = state.week + 1;
    const tempMonth = Math.ceil(tempWeek / 4);
    const tempDirDrain = state.gameDirection
      ? (DIRECTION_TEAM_SCALE[state.gameDirection]?.budgetDrainMultiplier || 1.0)
      : 1.0;
    workEffect.weeklyDrain = Math.round(getWeeklyBudgetDrain(tempMonth) * tempDirDrain * getKpiBudgetMultiplier(state.kpiState));

      setState(prev => {
        const pb = (prev.progressBonus || 0) + (prev.progressMomentum || 0) + (prev.activeBonus || 0);
        const hirePenalty = prev.hireBurdenWeeksLeft > 0 ? prev.hireBurdenRate : 0;
        const teamCoeff = getTeamProgressCoeff(prev.teamSlots, prev.gameDirection);
        let newProgress = Math.min(100, Math.max(0, prev.progress + Math.round(BASE_PROGRESS * teamCoeff) + (choice.effects.progress || 0) + mode.progressBonus + pb - hirePenalty));
        let moraleDelta = (choice.effects.morale || 0) - moralePenalty;
        if (moraleDelta < 0) {
          const kpiMult = prev.kpiState === "tight" ? 1.15 : prev.kpiState === "loose" ? 0.9 : 1.0;
          moraleDelta = Math.round(moraleDelta * kpiMult);
        }
        moraleDelta = Math.round(moraleDelta * healthTier.dmgMult);
        let newMorale = Math.min(100, Math.max(0, prev.morale + moraleDelta));
        const newWeek = prev.week + 1;
        const month = Math.ceil(newWeek / 4);
        const teamSize = prev.teamSlots.filter(s => s !== null).length;
        const weeklyDecay = getMoraleDecay(prev.qualityDebt, teamSize, month)
                          * getPeopleDecayMultiplier(prev.people)
                          * (prev.bossTrust >= 8 ? 0.8 : 1.0);
        newMorale = Math.max(0, newMorale - weeklyDecay);
        const directionDrainMult = prev.gameDirection
          ? (DIRECTION_TEAM_SCALE[prev.gameDirection]?.budgetDrainMultiplier || 1.0)
          : 1.0;
        const weeklyDrain = Math.round(getWeeklyBudgetDrain(month) * directionDrainMult * getKpiBudgetMultiplier(prev.kpiState));
        let newBudget = Math.min(100, Math.max(0, prev.budget + (choice.effects.budget || 0) - budgetCost - weeklyDrain));
      const expectedProgress = (newWeek / TOTAL_WEEKS) * 100;
      const newMomentum = newProgress > expectedProgress + 10 ? 1 : newProgress < expectedProgress - 10 ? -1 : 0;
      const newPending = [...(prev.pendingEvents || [])];
      const newScheduled = [...newScheduledEvents];
      const newHireBurdenWeeksLeft = Math.max(0, prev.hireBurdenWeeksLeft - 1);
      if (prev.hireBurdenWeeksLeft === 1) {
        newScheduled.push({ id: "hire_reveal", week: newWeek + 1 });
      }
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
      if (event?.id === "lucid_p2") {
        const idx = newScheduled.findIndex(e => e.id === "lucid_p2");
        if (idx >= 0) newScheduled.splice(idx, 1);
      }
      if (prev.problemEmployee?.type === "code") {
        if (newProgress < expectedProgress) {
          newProgress = Math.max(0, newProgress - 2);
        }
      }
      if (prev.problemEmployee?.type === "morale") {
        if (newMorale < 50) {
          newMorale = Math.max(0, newMorale - 3);
        }
      }
      let newQualityDebt = prev.qualityDebt || 0;
      if (!prev.overtimeThisWeek) {
        newQualityDebt = Math.max(0, newQualityDebt - 2);
      }
      if (choice.effects.qualityDebt) {
        newQualityDebt = Math.min(100, newQualityDebt + choice.effects.qualityDebt);
      }
      if (event?.id === "manpower" && choice.action && choice.action !== "ipProtect") {
        newQualityDebt = Math.min(100, newQualityDebt + 5);
      }
      if (event?.id === "castle" && optionType === 0 && prev.industryBackground === "film") {
        newQualityDebt = Math.min(100, newQualityDebt + 5);
      }
       const mcnTechEvents = ["legacy", "perfectionist", "visionary"];
       if (prev.industryBackground === "mcn" && prev.week <= 8 && event && mcnTechEvents.includes(event.id)) {
         const progDelta = (choice.effects.progress || 0);
         const morDelta = (choice.effects.morale || 0);
         const budDelta = (choice.effects.budget || 0);
         newProgress = Math.min(100, Math.max(0, prev.progress + Math.round(progDelta * 1.2)));
         newMorale = Math.min(100, Math.max(0, prev.morale + Math.round(morDelta * 1.2)));
         newBudget = Math.min(100, Math.max(0, prev.budget + Math.round(budDelta * 1.2)));
       }
       if (prev.industryBackground === "film" && event?.id === "market_trend" && optionType === 1) {
         const progDelta = choice.effects.progress || 0;
         const morDelta = choice.effects.morale || 0;
         newProgress = Math.min(100, Math.max(0, prev.progress + (progDelta < 0 ? Math.round(progDelta * 0.5) : progDelta)));
         newMorale = Math.min(100, Math.max(0, prev.morale + (morDelta < 0 ? Math.round(morDelta * 0.5) : morDelta)));
       }
      if (prev.industryBackground === "education" && newQualityDebt > (prev.qualityDebt || 0)) {
        const qdGain = newQualityDebt - (prev.qualityDebt || 0);
        newQualityDebt = (prev.qualityDebt || 0) + Math.round(qdGain * 1.1);
      }
      const newTeamSlots = prev.teamSlots.map(m => ({
        ...m,
        weeksJoined: (m.weeksJoined || 0) + 1,
        contribution: (m.weeksJoined || 0) >= 6
          ? { ...m.contribution, progressEfficiency: Math.min(m.contribution.progressEfficiency + 0.3, 1.0) }
          : m.contribution
      }));
       let gamePhase = "playing", loseReason = "";
       let realProgress = newProgress;
       if (newProgress >= 100) {
         realProgress = Math.max(0, newProgress - prev.fakeProgress);
         if (realProgress < 100) {
           newProgress = realProgress;
         }
       } else if (newWeek > TOTAL_WEEKS) {
         realProgress = Math.max(0, newProgress - prev.fakeProgress);
         newProgress = realProgress;
       }
       if (realProgress >= 100) {
         if (newQualityDebt >= 80) {
           gamePhase = "bad_release";
         } else if (prev.gameDirection && YEAR_DATA[prev.marketYear]) {
           const yearData = YEAR_DATA[prev.marketYear];
           const isConfusedYear = yearData.special === "confused_year";
           
           let matchType;
           if (isConfusedYear) {
             matchType = "confused";
           } else {
             matchType = checkDirectionMatch(prev.gameDirection, prev.marketYear);
           }
           
           const budgetLoss = 1 - newBudget / 100;
           const trustNorm = prev.bossTrust / 10;
           const moraleNorm = newMorale / 100;
           const composite = moraleNorm * 0.3 + trustNorm * 0.3 - budgetLoss * 0.4;
           
            if (matchType === "mocked") {
              const hasBgBonus = getBackgroundBonus(prev, "matchThresholdDelta") !== null;
              const counterThreshold = hasBgBonus ? 0.6 : 0.7;
              if (composite >= counterThreshold) {
                gamePhase = "counter_win";
              } else {
                gamePhase = "bad_release";
              }
            } else {
             const hiddenScore = prev.honesty + prev.people + prev.quality + prev.judgment + prev.grit;
             const tier = getEndingTier(hiddenScore);
             gamePhase = tier;
           }
         } else {
           const hiddenScore = prev.honesty + prev.people + prev.quality + prev.judgment + prev.grit;
           const tier = getEndingTier(hiddenScore);
           gamePhase = tier;
         }
       }
      if (gamePhase === "playing" && newMorale <= 0) { gamePhase = "lose"; loseReason = "团队士气归零，所有人集体摆烂，项目解散。"; }
      if (gamePhase === "playing" && newBudget <= 0) { gamePhase = "lose"; loseReason = "预算耗尽，上面决定砍掉项目。"; }
      if (gamePhase === "playing" && newWeek > TOTAL_WEEKS) { gamePhase = "lose"; loseReason = `第${newWeek}周，超过6个月试用期。当年对你有知遇之恩的那个人冷面出现在会议室，对你说，你被开除了！`; }
      if (gamePhase === "playing" && event?.id === "boss_talk" && choice.outcome === "C") { gamePhase = "lose"; loseReason = `老板失去了信心。项目在第${state.week}周被终止，你正式离开了这家公司。`; }
      let newVerify = prev.verifyUsedThisMonth;
      if (isMilestone) newVerify = false;
      let effectBossTrust = choice.effects.bossTrust || 0;
      let newHonestyHintShown = prev.honestyHintShown;
      let newHonestyMidHintShown = prev.honestyMidHintShown;
      if (isMilestone) {
        const honestyDrain = prev.honesty < 3 ? -2
                          : prev.honesty < 5 ? -1
                          : 0;
        effectBossTrust += honestyDrain;
        if (prev.honesty < 3 && !newHonestyHintShown) {
          newHonestyHintShown = true;
        }
        if (prev.honesty < 5 && !newHonestyMidHintShown) {
          newHonestyMidHintShown = true;
        }
      }
      let newQualityHintShown = prev.qualityHintShown;
      if (!isMilestone && event?.id !== "boss_talk" && prev.quality < 3 && !newQualityHintShown) {
        newQualityHintShown = true;
      }
      let newIpProtectCount = prev.ipProtectCount;
      if (choice.action === "ipProtect") {
        newIpProtectCount = Math.max(0, prev.ipProtectCount - 1);
      }
      const distortion = getInfoDistortion(prev.honesty);
      let finalFakeProgress = prev.fakeProgress;
      let finalProgress = newProgress;
      if (distortion > 0) {
        const fakeBonus = Math.round(distortion * 5);
        finalProgress = Math.min(100, newProgress + fakeBonus);
        finalFakeProgress = prev.fakeProgress + fakeBonus;
      }
      if (event?.id === "water_reveal") {
        finalProgress = Math.max(0, finalProgress - prev.fakeProgress);
        finalFakeProgress = 0;
      }
      return { ...prev, week: newWeek, progress: finalProgress, morale: newMorale, budget: newBudget, gamePhase, loseReason, survived: prev.survived + 1, pendingEvents: newPending, progressMomentum: newMomentum, confidant: newConfidant, verifyUsedThisMonth: newVerify, lucidConfidant: newLucidConfidant, scheduledEvents: newScheduled, lucidPhase1, lucidTriggered, hireBurdenWeeksLeft: newHireBurdenWeeksLeft, hireBurdenRate: prev.hireBurdenRate, hireScale: prev.hireScale, problemEmployee: prev.problemEmployee, activeBonus: prev.activeBonus, bossTrust: Math.min(10, Math.max(0, prev.bossTrust + effectBossTrust)), manpowerTriggered: prev.manpowerTriggered, qualityDebt: newQualityDebt, teamSlots: newTeamSlots, overtimeThisWeek: false, fakeProgress: finalFakeProgress, honestyHintShown: newHonestyHintShown, honestyMidHintShown: newHonestyMidHintShown, qualityHintShown: newQualityHintShown, ipProtectCount: newIpProtectCount, usedActions: [], lastManageUpResult: null };
    });

    setPieCount(newPieCount);
    setLastResult(choice.result);
    setLastConfidantReveal(confidantAppend);
    setLastBossReaction(bossReact);
    setLastEffects(choice.effects);
    setLastWorkEffect(workEffect);
    setShowResult(true);
    }, [workMode, overtimeType, pieCount, state.progress, state.progressBonus, event, state.confidant, state.lucidConfidant, state.scheduledEvents, state.lucidPhase1, state.lucidTriggered, state.bossTrust, state.hireBurdenWeeksLeft, state.hireBurdenRate, state.hireScale, state.problemEmployee, state.activeBonus, state.manpowerTriggered, state.gamePhase, state.loseReason, state.teamSlots, state.qualityDebt, state.overtimeThisWeek]);

   const nextEvent = useCallback(() => {
     setShowResult(false);
     setLastResult("");
     setLastConfidantReveal("");
     setLastEffects(null);
     setLastWorkEffect(null);
     setApSpent(0);
     setWeekPhase("planning");
     setRecruitResultMessage("");
     setRecruitCandidate(null);

     let externalMsg = "";
     if (state.lucidConfidant?.subtype === "external" && Math.random() < 0.2) {
       externalMsg = `📱 ${EXTERNAL_MESSAGES[Math.floor(Math.random() * EXTERNAL_MESSAGES.length)]}`;
     }

      let newLucidConfidant = state.lucidConfidant;
      if (state.lucidConfidant?.subtype === "unstable" && state.lucidConfidant.usesLeft <= 0) {
        externalMsg = "他最终还是提了离职。你已经不记得他用的是哪家猎头了。";
        newLucidConfidant = null;
      }
      setLastBossReaction(externalMsg);
      if (newLucidConfidant !== state.lucidConfidant) {
        setState(prev => ({ ...prev, lucidConfidant: newLucidConfidant }));
      }

    const curWeek = state.week;
    if (curWeek % 4 === 1 && curWeek > 1 && curWeek <= 21) {
      const month = Math.ceil((curWeek - 1) / 4);
      const delta = Math.round(state.progress - monthStartProgress);
      const teamSize = state.teamSlots.filter(s => s !== null).length;
      const weeklyDecay = getMoraleDecay(state.qualityDebt, teamSize, month)
                        * getPeopleDecayMultiplier(state.people)
                        * (state.bossTrust >= 8 ? 0.8 : 1.0);
      const monthlyMoraleDecay = Math.round(weeklyDecay * 4);
      const qdDrain = getQualityDebtProgressDrain(state.qualityDebt);
      setMonthSummaryData({ month, delta, progress: state.progress, weeksLeft: TOTAL_WEEKS - curWeek, monthlyMoraleDecay, qdDrain, qualityDebt: state.qualityDebt });
      setShowMonthSummary(true);
      setMonthStartProgress(state.progress);
    } else {
      setState(prev => {
        setEvent(pickEvent(prev));
        return prev;
      });
      setAnimKey(k => k + 1);
    }
  }, [pickEvent, state.week, state.progress, state.lucidConfidant, monthStartProgress]);

  const dismissMonthSummary = useCallback(() => {
    setShowMonthSummary(false);
    setMonthSummaryData(null);
    setState(prev => {
      const expectedProgress = (prev.week / 24) * 100;
      let newBossTrust = prev.bossTrust;
      let newBudget = prev.budget;
      let newProgress = prev.progress;
      let newQualityDebt = prev.qualityDebt;
      const qdDrain = getQualityDebtProgressDrain(prev.qualityDebt);
      if (qdDrain > 0) newProgress = Math.max(0, newProgress - qdDrain);
      let qualityMessage = null;
      let newScheduled = [...(prev.scheduledEvents || [])];
      let newKpiState = prev.kpiState;
      let newConsecutiveGood = prev.consecutiveGoodMonths || 0;
      let newKpiBoostMonths = prev.kpiBoostMonths || 0;
      let newManageUpCount = prev.manageUpCount || 0;
      let newMorale = prev.morale;
      let kpiTightenMessage = null;
      
      const increment = prev.progress - prev.progressLastMonth;
      const target = 16;
      
      if (increment >= target * 1.25) {
        newKpiBoostMonths += 1;
        if (newKpiBoostMonths >= 2) {
          newKpiState = newKpiState === "tight" ? "normal" : newKpiState === "normal" ? "loose" : "loose";
          newKpiBoostMonths = 0;
        }
        newBossTrust = Math.min(10, newBossTrust + 1);
      } else if (increment < target) {
        newKpiBoostMonths = 0;
        if (newKpiState === "loose") {
          newKpiState = "normal";
          kpiTightenMessage = "空气开始变了。不明显，但你感觉得到。";
        } else if (newKpiState === "normal") {
          newKpiState = "tight";
          kpiTightenMessage = "他这个月找你谈了两次。语气越来越短。你知道这意味着什么。";
        }
        newBossTrust = Math.max(0, newBossTrust - 1);
      } else {
        newKpiBoostMonths = Math.max(0, newKpiBoostMonths - 1);
      }
      
      if (newManageUpCount >= 3 && Math.random() < 0.5) {
        newKpiState = newKpiState === "tight" ? "normal" : newKpiState === "normal" ? "loose" : "loose";
        newManageUpCount = 0;
      }
      
      const progressDelta = prev.progress - expectedProgress;
      if (progressDelta >= 10) {
        newConsecutiveGood = Math.min(newConsecutiveGood + 1, 2);
      } else {
        newConsecutiveGood = 0;
      }
      
      if (prev.manageUpCount >= 3 && Math.random() < 0.5) {
        newKpiState = newKpiState === "tight" ? "normal" : newKpiState === "normal" ? "loose" : "loose";
      }
      
      if (prev.ipActive && prev.ipType === "strong" && prev.qualityDebt >= 50) {
        newQualityDebt = Math.max(0, newQualityDebt - 20);
        newProgress = Math.max(0, newProgress - 8);
        qualityMessage = "IP方发来本月品质审查报告，标注了17处与IP调性不符的内容。没有商量余地。你让团队停下来，把这些地方重新做了一遍。";
      }
      
      if (newBossTrust <= 2 && newBossTrust > 0) {
        newBudget = Math.max(0, newBudget - 5);
      }
      if (newBossTrust <= 0 && !newScheduled.some(e => e.id === "boss_talk")) {
        newScheduled.push({ id: "boss_talk", week: prev.week + 1 });
      }
      if (prev.qualityDebt >= 60 && !qualityMessage) {
        const clawback = Math.floor((newQualityDebt - 50) * 0.3);
        newProgress = Math.max(0, newProgress - clawback);
        newQualityDebt = Math.max(0, newQualityDebt - 20);
        qualityMessage = `月度复盘。你们做的东西摆在那里，没有人说什么。但你注意到，其他组的人路过时会停一下——不是欣赏，是那种"啊，原来可以这样"的表情。你知道那个停顿意味着什么。进度表上，${clawback}%的工作需要返工。`;
       } else if (prev.qualityDebt >= 30 && !qualityMessage) {
         qualityMessage = "有人在内部群里发了一条消息：\"我们的标准是这个吗？\"没有人回复。";
       }
       
       if (prev.morale < 20) {
          newBossTrust = Math.max(0, newBossTrust - 2);
        } else if (prev.morale < 35) {
          newBossTrust = Math.max(0, newBossTrust - 1);
        }
        
        if (newKpiState === "tight") newBossTrust = Math.max(0, newBossTrust - 1);
        if (newKpiState === "loose") newBossTrust = Math.min(10, newBossTrust + 1);
        
        if (prev.qualityDebt > 50) {
         prev.quality = Math.max(0, prev.quality - 1);
       }
       
        let bossTrustHitZero = prev.bossTrustHitZero;
        if (newBossTrust <= 0 && !bossTrustHitZero) {
          bossTrustHitZero = true;
          prev.grit = Math.max(0, prev.grit - 3);
        }
        
        let newPeopleHintShown = prev.peopleHintShown;
        if (prev.people < 3 && !newPeopleHintShown) {
          newPeopleHintShown = true;
        }
        
        setEvent(pickEvent({ ...prev, bossTrust: newBossTrust, budget: newBudget, progress: newProgress, qualityDebt: newQualityDebt, scheduledEvents: newScheduled, kpiState: newKpiState }));
        return { ...prev, bossTrust: newBossTrust, budget: newBudget, progress: newProgress, morale: newMorale, qualityDebt: newQualityDebt, scheduledEvents: newScheduled, kpiState: newKpiState, consecutiveGoodMonths: newConsecutiveGood, kpiBoostMonths: newKpiBoostMonths, manageUpCount: newManageUpCount, progressLastMonth: prev.progress, bossTrustHitZero, quality: prev.quality, grit: prev.grit, peopleHintShown: newPeopleHintShown };
    });
    setAnimKey(k => k + 1);
  }, [pickEvent]);

  const restart = useCallback(() => {
    setAppPhase("intro");
    setCardStep(0);
    setPickedCards([]);
    const years = [2010, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const marketYear = years[Math.floor(Math.random() * years.length)];
     setState({ week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false, lucidConfidant: null, scheduledEvents: [], lucidPhase1: null, lucidTriggered: false, bossTrust: Math.floor(Math.random() * 6) + 3, hireBurdenWeeksLeft: 0, hireBurdenRate: 0, hireScale: null, problemEmployee: null, activeBonus: 0, manpowerTriggered: false, teamSlots: [], qualityDebt: 0, gameDirection: null, directionChosen: false, directionDelayPenalty: false, marketYear, companySize: "mid", kpiState: "normal", ipType: "none", ipActive: false, ipProtectUsed: 0, ipProtectCount: 0, ipRevealShown: false, overtimeThisWeek: false, narrationsUsed: [], consecutiveGoodMonths: 0, kpiBoostMonths: 0, manageUpCount: 0, progressLastMonth: 0, industryBackground: null, playerBackground: null, backgroundBonuses: [], honesty: 10, people: 10, quality: 10, judgment: 10, grit: 10, crisisComfortCount: 0, teamComfortCount: 0, bossTrustHitZero: false, fakeProgress: 0, honestyHintShown: false, honestyMidHintShown: false, peopleHintShown: false, qualityHintShown: false });
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
     setRecruitResultMessage("");
     setRecruitCandidate(null);
     setAnimKey(k => k + 1);
   }, []);

  // ---- screens ----
  if (appPhase === "intro") return (
    <IntroScreen onNext={() => setAppPhase("cards")} />
  );
  if (appPhase === "cards") return (
    <CardScreen step={cardStep} pickedCards={pickedCards} onPick={handleCardPick} onNext={handleCardNext} />
  );
  if (appPhase === "onboarding") return (
    <OnboardingScreen pickedCards={pickedCards} onDone={handleOnboardingDone} />
  );
  if (appPhase === "prologue") return (
    <PrologueScreen initState={prologueState} onStart={handlePrologueStart} />
  );

  const phase = [...PHASE_LABELS].reverse().find(p => state.progress >= p.min)?.label || "概念原型期";
  const weeksLeft = TOTAL_WEEKS - state.week;
  const { label: timeLabel } = weekDisplay(state.week);

  if (state.gamePhase === "legendary") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>👑</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#facc15", margin: "12px 0 6px" }}>传奇制作人</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了，而且你知道为什么。
        </div>
        <button onClick={restart} style={s.endBtn}>再来一局</button>
      </div>
    </div>
  );

  if (state.gamePhase === "excellent") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>🏆</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa", margin: "12px 0 6px" }}>优秀制作人</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了。有些人知道代价。
        </div>
        <button onClick={restart} style={s.endBtn}>再来一局</button>
      </div>
    </div>
  );

  if (state.gamePhase === "profitable") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>🎮</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#4ade80", margin: "12px 0 6px" }}>大赚特赚</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了。但你不确定值不值得。
        </div>
        <button onClick={restart} style={s.endBtn}>再来一局</button>
      </div>
    </div>
  );

  if (state.gamePhase === "average") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>📦</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8", margin: "12px 0 6px" }}>中规中矩</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了。但有些东西，活不了。
        </div>
        <button onClick={restart} style={s.endBtn}>再来一局</button>
      </div>
    </div>
  );

  if (state.gamePhase === "bad_release") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>💥</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#f87171", margin: "12px 0 6px" }}>叫好不叫座</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          所有人都说这个方向没有未来。<br /><br />你做了，上线了。<br />数据证明他们是对的。<br /><br />你关掉数据分析后台，去喝了一杯酒。
        </div>
        <button onClick={restart} style={s.endBtn}>再来一局</button>
      </div>
    </div>
  );

  if (state.gamePhase === "counter_win") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>🔥</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#f97316", margin: "12px 0 6px" }}>逆势突围</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          所有人都说这个方向没有未来。<br /><br />你没有辩解，只是做完了。<br /><br />上线那天，你翻出了当时那个沙龙的聊天记录，没有回复任何人。<br /><br />数据会说话。
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
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel}</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 6 }}>{state.loseReason}</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 24 }}>撑过了 {state.survived} 个延期人格，进度达到 {state.progress}%</div>
        <button onClick={restart} style={s.endBtn}>重新开始</button>
      </div>
    </div>
  );

  const apTotal = WORK_MODES[workMode].ap + (state.apBonusPerWeek || 0);
  const apLeft = Math.max(0, apTotal - apSpent);

  const header = (
    <div style={s.header}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#ddd", letterSpacing: "0.03em" }}>完蛋！我被延期包围了</div>
        <div style={{ fontSize: 12, color: "#c7c7c7", marginTop: 1 }}>{phase}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontFamily: "monospace", color: weeksLeft < 4 ? "#f87171" : "#c7c7c7" }}>{timeLabel}</div>
        <div style={{ fontSize: 12, color: weeksLeft < 4 ? "#7f1d1d" : "#c7c7c7", marginTop: 1 }}>剩余 {Math.max(0, weeksLeft)} 周</div>
        {state.progressMomentum !== 0 && (
          <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 2, color: state.progressMomentum > 0 ? "#4ade80" : "#f87171" }}>
            {state.progressMomentum > 0 ? "📈 进度超前 +1" : "📉 进度落后 -1"}
          </div>
         )}
         {state.hireBurdenWeeksLeft > 0 && (
           <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 2, color: "#f97316" }}>
             🧑‍💻 新人培训中，还剩 {state.hireBurdenWeeksLeft} 周  进度 -{state.hireBurdenRate}/周
           </div>
         )}
         {state.confidant && (
           <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 2, color: "#a78bfa" }}>
             🤝 心腹：{state.confidant.role}
           </div>
         )}
        {state.lucidConfidant?.subtype === "external" && (
          <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 2, color: "#94a3b8" }}>
            📱 线人：他
          </div>
        )}
        {state.lucidConfidant?.subtype === "unstable" && (
          <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 2, color: "#fbbf24" }}>
            ⚡ 线人：他（剩余{state.lucidConfidant.usesLeft}次）
          </div>
        )}
        {state.lucidConfidant?.subtype === "inner" && (
          <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 2, color: "#e2e8f0" }}>
            🔬 心腹：他（内部）
          </div>
        )}
      </div>
    </div>
  );

   const healthTier = getProductHealthTier(getProductHealthScore(state.qualityDebt, state.gameDirection, state.marketYear));
   const statsRow = (
     <>
<div style={s.statsRow}>
          <StatBar label="📈 进度" value={state.progress} color="#4ade80" onClick={() => setActiveTip(activeTip === "progress" ? null : "progress")} />
          <div style={{ width: 10 }} />
           <StatBar label="💪 士气" value={state.morale} displayValue={Math.round(state.morale)} color="#fb923c" onClick={() => setActiveTip(activeTip === "morale" ? null : "morale")} />
          <div style={{ width: 10 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <StatBar label="💰 预算" value={state.budget} color="#60a5fa" onClick={() => setActiveTip(activeTip === "budget" ? null : "budget")} />
            {hasBackgroundBonus(state, "budgetPrecisionDisplay") && (
              <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "monospace", marginTop: 2, textAlign: "right" }}>
                周消耗: -{Math.round(getWeeklyBudgetDrain(Math.ceil(state.week / 4)) * getKpiBudgetMultiplier(state.kpiState) * (DIRECTION_TEAM_SCALE[state.gameDirection]?.budgetDrainMultiplier || 1))}
                <br />
                预计剩余: {Math.max(0, Math.floor(state.budget / Math.max(1, getWeeklyBudgetDrain(Math.ceil(state.week / 4)) * getKpiBudgetMultiplier(state.kpiState) * (DIRECTION_TEAM_SCALE[state.gameDirection]?.budgetDrainMultiplier || 1))))}周
              </div>
            )}
          </div>
          <div style={{ width: 10 }} />
          <StatBar label="⭐ 信任" value={state.bossTrust * 10} displayValue={state.bossTrust} color="#facc15" onClick={() => setActiveTip(activeTip === "trust" ? null : "trust")} />
         </div>
        {state.kpiState !== "normal" && (
          <div style={{ padding: "6px 18px", fontSize: 12, fontFamily: "monospace", color: state.kpiState === "tight" ? "#f87171" : "#4ade80", background: state.kpiState === "tight" ? "#1a0505" : "#051a05" }}>
            {state.kpiState === "tight" && "⚠ 老板盯得紧：预算消耗+30%，士气伤害+15%"}
            {state.kpiState === "loose" && "✦ 老板放权：预算消耗-10%，士气伤害-10%"}
          </div>
        )}
        <div style={{ padding: "8px 18px", background: "#08080f", borderBottom: "1px solid #0e0e1e", cursor: "pointer" }} onClick={() => setActiveTip(activeTip === "health" ? null : "health")}>
         <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "monospace", color: "#c7c7c7" }}>
           <span>{healthTier.emoji}</span>
           <span>产品健康度</span>
           <span style={{ flex: 1 }} />
           <span style={{ color: healthTier.tier === "downdown" ? "#f87171" : healthTier.tier === "down" ? "#f97316" : healthTier.tier === "upup" ? "#4ade80" : "#c7c7c7" }}>{healthTier.label}</span>
           <span>{activeTip === "health" ? "▲" : "▼"}</span>
         </div>
       </div>
       {activeTip === "health" && (
         <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 8, margin: "-8px 18px 8px", padding: "10px 14px", fontSize: 13, color: "#c7c7c7", fontFamily: "monospace", lineHeight: 1.8 }}>
           {healthTier.tier === "upup" && <>团队信心足，关怀行动效果 ×1.15</>}
           {healthTier.tier === "down" && <>方向存疑，关怀效果 ×0.85，事件士气伤害 ×1.1</>}
           {healthTier.tier === "downdown" && <>信心崩塌，关怀效果 ×0.7，事件士气伤害 ×1.2，每周自然流失 -2</>}
           {healthTier.tier === "normal" && <>士气韧性正常</>}
         </div>
       )}
      {activeTip === "progress" && (
        <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 14px", margin: "-8px 18px 8px", fontSize: 13, color: "#c7c7c7", fontFamily: "monospace", lineHeight: 1.8 }}>
          📈 进度<br />
          达到 100% 游戏上线，这是唯一的胜利条件。<br />
          每周基础 +3 · 冲进度行动 +3 · 事件影响不定<br />
          时间到了还不到 100%：延期失败
        </div>
      )}
      {activeTip === "morale" && (
        <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 14px", margin: "-8px 18px 8px", fontSize: 13, color: "#c7c7c7", fontFamily: "monospace", lineHeight: 1.8 }}>
          💪 士气<br />
          归零：团队集体摆烂，项目解散。<br />
          &lt; 35：危机安抚行动解锁（2AP，+25士气）<br />
          &lt; 20：⚠️ 危险，每周自然衰减加快<br />
          团队关怀行动 +10 · 画饼/加班会持续消耗
        </div>
      )}
      {activeTip === "budget" && (
        <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 14px", margin: "-8px 18px 8px", fontSize: 13, color: "#c7c7c7", fontFamily: "monospace", lineHeight: 1.8 }}>
          💰 预算<br />
          归零：项目被砍，直接失败。<br />
          &lt; 25：紧急融资行动解锁（3AP，+18~32预算）<br />
          &lt; 20：⚠️ 危险<br />
          加班付费、招人、各类事件都会消耗预算
        </div>
      )}
      {activeTip === "trust" && (
        <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 8, padding: "10px 14px", margin: "-8px 18px 8px", fontSize: 13, color: "#c7c7c7", fontFamily: "monospace", lineHeight: 1.8 }}>
          ⭐ 老板信任度（0-10）<br />
          0：触发「谈话」事件，可能直接失败。<br />
          ≤ 2：每月底预算自动 -5，他在打听你的项目<br />
          ≤ 4：管理层干预事件频率 ×2<br />
          ≥ 8：管理层干预频率降低<br />
          向上管理行动 +1（2AP）· 顺利通过里程碑 +1<br />
          初始值随机（3-8）
         </div>
       )}
<div onClick={() => setTeamPanelExpanded(!teamPanelExpanded)} style={{ padding: "10px 18px", background: "#08080f", borderBottom: "1px solid #0e0e1e", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "monospace", color: "#c7c7c7" }}>
            <span>🤝</span>
            <span>核心团队 {state.teamSlots.length}/6</span>
            {state.gameDirection && DIRECTION_TEAM_SCALE[state.gameDirection] ? (
              <span style={{ color: "#666" }}>· 项目 {DIRECTION_TEAM_SCALE[state.gameDirection].projectTeamSize}人</span>
            ) : (
              <span style={{ color: "#666" }}>· 项目 --人</span>
            )}
            <span style={{ flex: 1 }} />
            <span>{teamPanelExpanded ? "▲" : "▼"}</span>
          </div>
        </div>
       {teamPanelExpanded && state.teamSlots.length > 0 && (
         <div style={{ background: "#0c0c18", padding: "8px 18px", borderBottom: "1px solid #0e0e1e" }}>
           {state.teamSlots.map(member => {
             const arrow = member.contribution.progressEfficiency >= 1.0 ? "↑↑" : member.contribution.progressEfficiency >= 0.7 ? "↑" : "↓";
             return (
               <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", fontSize: 13, fontFamily: "monospace", color: "#888" }}>
                 <span style={{ fontSize: 16 }}>{ROLE_EMOJI[member.role]}</span>
                 <span style={{ width: 50 }}>{ROLE_NAMES[member.role]}</span>
                 <span style={{ width: 45, color: "#666" }}>{SENIORITY_NAMES[member.seniority]}</span>
                 <span style={{ 
                   color: arrow === "↑↑" ? "#4ade80" : arrow === "↑" ? "#60a5fa" : "#f97316",
                   fontSize: 14,
                   fontWeight: "bold"
                 }}>{arrow}</span>
               </div>
             );
           })}
         </div>
       )}
       {teamPanelExpanded && state.teamSlots.length === 0 && (
         <div style={{ background: "#0c0c18", padding: "12px 18px", borderBottom: "1px solid #0e0e1e", fontSize: 13, color: "#666", fontFamily: "monospace" }}>
           团队还没有成员，使用校招或社招加入吧。
         </div>
       )}
     </>
   );

  if (showMonthSummary && monthSummaryData) {
    return (
      <div style={s.app}>
        {header}
        {statsRow}
          <MonthSummaryCard data={monthSummaryData} bossTrust={state.bossTrust} people={state.people} peopleHintShown={state.peopleHintShown} onNext={dismissMonthSummary} />
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
                <ActionMenu state={state} workMode={workMode} apSpent={apSpent} freezeDone={freezeDone} onAction={takeAction} />
               
               {recruitCandidate && (
                 <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px", marginTop: 12 }}>
                   <div style={{ fontSize: 14, fontWeight: 700, color: "#ddd", marginBottom: 10 }}>
                     {recruitCandidate.type === "campus" ? "🎓 校招候选人" : "💼 社招候选人"}
                   </div>
                   <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 15 }}>
                     <span>{ROLE_EMOJI[recruitCandidate.role]}</span>
                     <span style={{ color: "#ccc" }}>{ROLE_NAMES[recruitCandidate.role]}</span>
                     <span style={{ color: "#888" }}>·</span>
                     <span style={{ color: "#888" }}>{SENIORITY_NAMES[recruitCandidate.seniority]}</span>
                   </div>
                   {recruitCandidate.tags.map((tag, i) => (
                     <div key={i} style={{ fontSize: 13, color: "#666", marginLeft: 2 }}>「{tag}」</div>
                   ))}
                   <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                     <button onClick={handleHireCandidate} style={{ flex: 1, padding: "10px 14px", background: "#0d1f0d", border: "1px solid #166534", color: "#4ade80", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                       录用
                     </button>
                     <button onClick={handleSkipCandidate} style={{ flex: 1, padding: "10px 14px", background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                       跳过
                     </button>
                   </div>
                 </div>
               )}
               
               {recruitResultMessage && (
                 <div style={{ background: "#0d1f0d", border: "1px solid #166534", borderRadius: 8, padding: "10px 14px", marginTop: 12, fontSize: 14, color: "#4ade80" }}>
                   {recruitResultMessage}
                 </div>
               )}
               
               {layoffPanelOpen && !layoffPendingMember && (
                 <div style={{ background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px", marginTop: 12 }}>
                   <div style={{ fontSize: 14, fontWeight: 700, color: "#f97316", marginBottom: 10 }}>🚪 选择要清洗的成员</div>
                   {state.teamSlots.map(member => {
                     const arrow = member.contribution.progressEfficiency >= 1.0 ? "↑↑" : member.contribution.progressEfficiency >= 0.7 ? "↑" : "↓";
                     return (
                       <div key={member.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #1a1a2e" }}>
                         <span style={{ fontSize: 18 }}>{ROLE_EMOJI[member.role]}</span>
                         <span style={{ flex: 1, fontSize: 14, color: "#ccc" }}>{ROLE_NAMES[member.role]}</span>
                         <span style={{ fontSize: 13, color: "#666" }}>{SENIORITY_NAMES[member.seniority]}</span>
                         <span style={{ 
                           color: arrow === "↑↑" ? "#4ade80" : arrow === "↑" ? "#60a5fa" : "#f97316",
                           fontSize: 14,
                           fontWeight: "bold",
                           width: 25
                         }}>{arrow}</span>
                         <button onClick={() => handleRequestLayoffConfirm(member)} style={{ padding: "6px 12px", background: "#2d0a0a", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                           清洗
                         </button>
                       </div>
                     );
                   })}
                   <button onClick={() => setLayoffPanelOpen(false)} style={{ width: "100%", marginTop: 12, padding: "10px 14px", background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                     取消
                   </button>
                 </div>
               )}
               
               {layoffPendingMember && (
                 <div style={{ background: "#1a1212", border: "1px solid #2a1a1a", borderRadius: 10, padding: "14px", marginTop: 12 }}>
                   <div style={{ fontSize: 15, fontWeight: 700, color: "#f87171", marginBottom: 8 }}>⚠️ 确认清洗</div>
                   <div style={{ fontSize: 14, color: "#c7c7c7", lineHeight: 1.7, marginBottom: 14 }}>
                     确认清洗这名成员？此操作不可逆。
                     <div style={{ marginTop: 8, fontSize: 13, color: "#888" }}>
                       {ROLE_EMOJI[layoffPendingMember.role]} {ROLE_NAMES[layoffPendingMember.role]} · {SENIORITY_NAMES[layoffPendingMember.seniority]}
                     </div>
                   </div>
                   <div style={{ display: "flex", gap: 10 }}>
                     <button onClick={handleConfirmLayoff} style={{ flex: 1, padding: "10px 14px", background: "#2d0a0a", border: "1px solid #7f1d1d", color: "#f87171", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                       确认
                     </button>
                     <button onClick={handleCancelLayoffConfirm} style={{ flex: 1, padding: "10px 14px", background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                       取消
                     </button>
                   </div>
                 </div>
               )}
               
               {layoffConfirmMember && (
                 <div style={{ background: "#1a1212", border: "1px solid #2a1a1a", borderRadius: 10, padding: "14px", marginTop: 12 }}>
                   <div style={{ fontSize: 14, color: "#c7c7c7", lineHeight: 1.7 }}>
                     他离开了。没有人说什么。
                   </div>
                   <button onClick={handleCloseLayoffResult} style={{ width: "100%", marginTop: 12, padding: "10px 14px", background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>
                     继续
                   </button>
                 </div>
               )}
             </div>
            <div style={{ marginTop: 16 }}>
              {apLeft > 0 && (
                <div style={{ fontSize: 12, color: "#c7c7c7", fontFamily: "monospace", marginBottom: 8 }}>
                  你还有 {apLeft} AP 未使用，它们不会被累积到下一周。
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
                 {event.type !== "narration" && (
                  <div style={s.charBox}>
                    <div style={{ ...s.charGlow, background: `radial-gradient(ellipse at 50% 60%, ${event.color}18 0%, transparent 65%)` }} />
                    <div style={{ fontSize: 52, position: "relative", zIndex: 1, animation: "fadeUp 0.4s ease 0s forwards", opacity: 0 }}>{event.emoji}</div>
                    <div style={{ color: event.color, fontSize: 15, fontWeight: 700, position: "relative", zIndex: 1, animation: "fadeUp 0.4s ease 0.2s forwards", opacity: 0 }}>{event.name}</div>
                    <div style={{ color: "#c7c7c7", fontSize: 12, position: "relative", zIndex: 1, marginTop: 2, animation: "fadeUp 0.4s ease 0.35s forwards", opacity: 0 }}>{event.tagline}</div>
                  </div>
                )}

                {event.type === "narration" ? (
                  <div style={{ ...s.dialogueBox, animation: "fadeUp 0.4s ease 0.3s forwards", opacity: 0 }}>
                    <div style={{ fontSize: 15, color: "#888", lineHeight: 1.7, fontStyle: "italic", whiteSpace: "pre-wrap" }}>{event.text}</div>
                  </div>
                ) : (
                  <div style={{ ...s.dialogueBox, animation: "fadeUp 0.4s ease 0.5s forwards", opacity: 0 }}>
                    <div style={{ fontSize: 12, color: "#c7c7c7", marginBottom: 6, whiteSpace: "pre-wrap" }}>{event.situation}</div>
                    <div style={{ fontSize: 15, color: "#ccc", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{event.dialogue}</div>
                  </div>
                )}

                  {event.type === "narration" ? (
                    <button onClick={() => {
                      setState(prev => ({
                        ...prev,
                        narrationsUsed: [...(prev.narrationsUsed || []), event.narrateKey],
                      }));
                      setEvent(pickEvent({ ...state, narrationsUsed: [...(state.narrationsUsed || []), event.narrateKey] }));
                      setAnimKey(k => k + 1);
                    }} style={{ ...s.choiceBtn, borderColor: "#2a2a3e", justifyContent: "center", color: "#c7c7c7", animation: "fadeUp 0.4s ease 1.1s forwards", opacity: 0 }}>
                      继续 →
                    </button>
                 ) : !showResult ? (
                 <div style={s.choices}>
                     {(() => {
                       const isMilestone = MILESTONE_EVENTS.some(m => m.name === event?.name);
                       const isLucidP2 = event?.id === "lucid_p2";
                       const isManpower = event?.id === "manpower";
                       const isBrooksLaw = event?.id === "brooks_law";
                       const isParatrooper = event?.id === "paratrooper";
                       const isHireReveal = event?.id === "hire_reveal";
                       
                       let choices;
                       let getOptionLabel;
                       let displayDialogue = event.dialogue;
                       let hireResult = null;
                       
                       if (isLucidP2) {
                         const phase1 = state.lucidPhase1;
                         choices = [LUCID_P2_CHOICES.A, LUCID_P2_CHOICES.B];
                         if (phase1 === "B") choices.push(LUCID_P2_CHOICES.C);
                         getOptionLabel = (i) => ["A", "B", "C"][i];
                        } else if (isManpower || isBrooksLaw || isParatrooper) {
                          choices = [...event.choices];
                          if (isManpower) {
                            let optionC = null;
                            if (state.budget > 60) {
                              optionC = { text: "我们投工具提效，不加人", effects: { progress: 3, morale: 0, budget: -15 }, result: "他皱了皱眉，但接受了。你把预算投进了自动化工具。", action: "refuse" };
                            } else if (state.morale > 70) {
                              optionC = { text: "团队状态很好，我来推动冲刺", effects: { progress: 5, morale: -12, budget: 0 }, result: "他半信半疑。团队知道了，士气开始消耗。", action: "refuse" };
                            } else {
                              const expectedProgress = (state.week / 24) * 100;
                              if (state.progress > expectedProgress + 10) {
                                optionC = { text: "进度没有问题，数据在这里", effects: { progress: 0, morale: 0, budget: 0 }, result: "他看了数据，没说话，挥了挥手让你走。老板记住了这件事。", action: "refuse" };
                              }
                            }
                            if (optionC) {
                              choices.push(optionC);
                            }
                          }
                          if (state.ipType === "strong" && state.ipProtectCount > 0) {
                            choices.push({
                              text: "IP方介入",
                              effects: {},
                              result: "你的手机震了一下。是IP方的法务。他们发来一封邮件，措辞非常礼貌，意思非常明确：这个项目的资源不能动。你第一次感谢一份律师函。",
                              action: "ipProtect",
                            });
                          }
                          
                          if (state.industryBackground) {
                            const industryChoices = getIndustryBackgroundChoices(event.id, state.industryBackground);
                            if (industryChoices) {
                              choices.push({ ...industryChoices, isIndustryBackground: true });
                            }
                          }
                          
                           getOptionLabel = (i) => ["A", "B", "C", "D"][i];
                        } else if (isHireReveal) {
                         const roll = Math.random();
                         let type;
                         if (roll < 0.25) type = "god";
                         else if (roll < 0.6) type = "normal";
                         else type = Math.random() < 0.5 ? "code" : "morale";
                         hireResult = HIRE_REVEAL_DATA[type];
                         if (type === "code" || type === "morale") {
                           const infiltratorChance = state.hireScale === "large" ? 0.4 : 0.2;
                           const isInfiltrator = Math.random() < infiltratorChance;
                           hireResult = {
                             ...hireResult,
                             dialogue: isInfiltrator ? hireResult.dialogue + "\n\n你偶然从主程那里听到，这个人是老板通过关系塞进来的。" : hireResult.dialogue,
                             choice: { ...hireResult.choice, isInfiltrator },
                           };
                         }
                         choices = [hireResult.choice];
                         displayDialogue = hireResult.dialogue;
                         getOptionLabel = () => null;
                       } else if (event?.id === "boss_talk") {
                         const hasData = state.progress >= 50;
                         const hopeless = state.progress < 35;
                         choices = [];
                         if (hopeless) {
                           choices.push({ text: "我需要更多时间。", effects: { progress: 0, morale: -5, budget: -10 }, result: "他给了你两周。代价是预算又少了一块，团队知道了这件事，士气受到影响。", outcome: "B" });
                           choices.push({ text: "……我说不出口。", effects: { progress: 0, morale: 0, budget: 0 }, result: "", outcome: "C" });
                         } else {
                           if (hasData) {
                             choices.push({ text: "能。数据在这里。", effects: { progress: 0, morale: 0, budget: 0 }, result: "他看了很久，点了点头。「好。那我等你的结果。」你从他办公室出来，腿有点软。", outcome: "A" });
                           }
                           choices.push({ text: "我需要更多时间。", effects: { progress: 0, morale: -5, budget: -10 }, result: "他给了你两周。代价是预算又少了一块，团队知道了这件事，士气受到影响。", outcome: "B" });
                         }
                         getOptionLabel = (i) => hopeless ? ["B", "C"][i] : hasData ? ["A", "B"][i] : ["B"][i];
                       } else {
                         choices = [...(event.choices || [])];
                         
                         if (state.industryBackground) {
                           const industryChoices = getIndustryBackgroundChoices(event.id, state.industryBackground);
                           if (industryChoices) {
                             choices.push({ ...industryChoices, isIndustryBackground: true });
                           }
                         }
                         
                         if (isMilestone && state.lucidConfidant?.subtype === "inner") {
                           choices.push({ text: "问问他，上面到底想看到什么", effects: { progress: -2, morale: 0, budget: 0 }, result: "" });
                           getOptionLabel = (i) => ["A", "B", "C", "D"][i];
                         } else {
                           getOptionLabel = (i) => isMilestone ? ["A", "B", "C"][i] : null;
                         }
                       }
                      
                      if (isHireReveal && displayDialogue) {
                        return (
                          <div key="dialogue">
                             <div style={{ fontSize: 14, color: "#e0e0e8", lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-wrap" }}>{displayDialogue}</div>
                          </div>
                        );
                      }
                      
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
                           <button key={i} onClick={() => handleChoice(c, isMilestone || isLucidP2 || isManpower ? getOptionLabel(i) : i)} disabled={disabled} style={{ ...s.choiceBtn, opacity: disabled ? 0.4 : 0, cursor: disabled ? "not-allowed" : "pointer", borderColor: c.isIndustryBackground ? "#2d1f50" : s.choiceBtn.borderColor, ...(c.isIndustryBackground ? { padding: "8px 12px", fontSize: 13, marginTop: 6 } : {}), animation: disabled ? undefined : `fadeUp 0.4s ease ${0.7 + i * 0.15}s forwards` }}
                             onMouseEnter={e => !disabled && (e.currentTarget.style.borderColor = c.isIndustryBackground ? "#a78bfa" : event.color, e.currentTarget.style.background = c.isIndustryBackground ? "#1a1030" : `${event.color}0a`)}
                             onMouseLeave={e => { e.currentTarget.style.borderColor = c.isIndustryBackground ? "#2d1f50" : "#1e1e2e"; e.currentTarget.style.background = "#0c0c18"; }}>
                             <div>
                               <div style={{ display: "flex", alignItems: "flex-start" }}>
                                 {getOptionLabel(i) && <span style={{ color: event.color, marginRight: 8, fontFamily: "monospace", fontSize: 13, flexShrink: 0 }}>{getOptionLabel(i)}.</span>}
                                 <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                   {c.text}{disableReason}
                                   {c.isIndustryBackground && <span style={{ fontSize: 11, color: "#a78bfa", fontFamily: "monospace", padding: "1px 5px", background: "#1a1030", borderRadius: 4, border: "1px solid #2d1f50" }}>[背景]</span>}
                                 </span>
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
                    <div style={{ fontSize: 15, color: "#bbb", lineHeight: 1.7, marginBottom: 10, animation: "fadeUp 0.4s ease 0s forwards", opacity: 0, whiteSpace: "pre-wrap" }}>{lastResult}</div>
                    {!state.honestyHintShown && state.honesty < 3 && event && MILESTONE_EVENTS.some(m => event.name === m.name) && (
                      <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginTop: 10, marginBottom: 8, paddingTop: 8, borderTop: "1px solid #1a1a2e", animation: "fadeUp 0.4s ease 0.3s forwards", opacity: 0 }}>
                        「你在会议上越来越熟练了。熟练到有时候你自己也分不清，哪些是真的，哪些是说出来的。」
                      </div>
                    )}
                    {!state.qualityHintShown && state.quality < 3 && event && !MILESTONE_EVENTS.some(m => event.name === m.name) && event.id !== "boss_talk" && (
                      <div style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic", marginTop: 10, marginBottom: 8, paddingTop: 8, borderTop: "1px solid #1a1a2e", animation: "fadeUp 0.4s ease 0.3s forwards", opacity: 0 }}>
                        「有人在内网发了一篇匿名帖：『这个游戏的核心玩法，你自己玩过吗？』没有人回复。帖子第二天被删了。」
                      </div>
                    )}
                    {lastConfidantReveal && (
                      <div style={{ fontSize: 13, color: "#a78bfa", fontFamily: "monospace", paddingTop: 8, borderTop: "1px solid #1a1a2e", marginTop: 2, marginBottom: 8, animation: "fadeUp 0.4s ease 0.4s forwards", opacity: 0 }}>
                        🤝 {lastConfidantReveal}
                      </div>
                    )}
                    {lastBossReaction && (
                      <div style={{ fontSize: 12, color: "#c7c7c7", marginTop: 6, marginBottom: 8, animation: "fadeUp 0.4s ease 0.4s forwards", opacity: 0 }}>
                        {lastBossReaction}
                      </div>
                    )}
                     {lastEffects && (
                       <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, paddingTop: lastConfidantReveal || lastBossReaction ? 0 : 8, borderTop: lastConfidantReveal || lastBossReaction ? "none" : "1px solid #1a1a2e", animation: "fadeUp 0.4s ease 0.5s forwards", opacity: 0 }}>
                         <EffectBadge value={(lastEffects.progress || 0) + BASE_PROGRESS + (state.progressBonus || 0)} label="进度" />
                         <EffectBadge value={lastEffects.morale || 0} label="士气" />
                         <EffectBadge value={lastEffects.budget || 0} label="预算" />
                       </div>
                     )}
                     {lastWorkEffect && (
                       <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, animation: "fadeUp 0.4s ease 0.6s forwards", opacity: 0 }}>
                         <EffectBadge value={-lastWorkEffect.weeklyDrain} label="周消耗" />
                       </div>
                     )}
                     {lastWorkEffect && lastWorkEffect.workMode !== "normal" && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, paddingTop: 8, borderTop: "1px solid #1a1a2e", animation: "fadeUp 0.4s ease 0.7s forwards", opacity: 0 }}>
                       <span style={{ fontSize: 12, color: "#c7c7c7", width: "100%", fontFamily: "monospace" }}>{WORK_MODES[lastWorkEffect.workMode].emoji} {WORK_MODES[lastWorkEffect.workMode].label}</span>
                       <EffectBadge value={lastWorkEffect.progressBonus} label="进度" />
                       {lastWorkEffect.overtimeType === "pay"
                         ? <EffectBadge value={-lastWorkEffect.budgetCost} label="预算" />
                         : <EffectBadge value={-lastWorkEffect.moralePenalty} label={`士气(第${pieCount}次饼)`} />
                       }
                     </div>
                   )}
                   <button onClick={nextEvent} style={{ ...s.choiceBtn, borderColor: "#2a2a3a", textAlign: "center", justifyContent: "center", color: "#888", animation: "fadeUp 0.4s ease 1.0s forwards", opacity: 0 }}
                     onMouseEnter={e => { e.currentTarget.style.borderColor = "#c7c7c7"; e.currentTarget.style.color = "#ccc"; }}
                     onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
                     下一位来访者 →
                   </button>
                 </div>
              )}
            </>
          )
        )}
      </div>

      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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
  choiceBtn: { background: "#0c0c18", border: "1px solid #1e1e2e", color: "#ccc", borderRadius: 8, padding: "11px 14px", fontSize: 15, textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, background 0.15s", lineHeight: 1.5, display: "flex", alignItems: "flex-start", width: "100%" },
  result: { background: "#0c0c18", border: "1px solid #1a1a2e", borderRadius: 10, padding: "14px" },
  endWrap: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", minHeight: "100vh" },
  endBtn: { background: "#0c0c18", border: "1px solid #2a2a3a", color: "#ccc", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer" },
};

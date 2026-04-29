import { useState, useEffect, useCallback } from "react";

const DIRECTION_NAMES = {
  open_world: "开放世界",
  roguelike: "Roguelike",
  turn_based: "回合制",
  card_ccg: "卡牌 CCG",
  survival: "生存建造",
  extraction: "塔科夫类",
  social: "模拟人生",
  arpg: "动作 RPG",
  farming: "农场经营",
};

function ShareCard({ state }) {
  const getVerdict = (s) => {
    const { honesty, people, quality, judgment, grit, gamePhase } = s;
    if (honesty >= 7 && quality >= 7) return "你是个实干家，但有时，行业对实干家并不友好。";
    if (honesty >= 7 && quality < 5) return "你很诚实。关于品质这件事，你也从没骗过自己。";
    if (honesty < 4 && ["legendary", "excellent"].includes(gamePhase)) return "你赢了。用了你自己才知道的方式。";
    if (honesty < 4 && ["lose", "bad_release"].includes(gamePhase)) return "数字是编出来的，但结局是真实的。";
    if (judgment >= 8 && people < 4) return "你看得准，但你不在乎那些人。他们也不会记得你。";
    if (people >= 8 && judgment < 4) return "你在乎所有人，但你看不准。代价高一些而已。";
    if (grit >= 8 && gamePhase === "lose") return "你撑到了最后。只是最后还不够。";
    if (grit < 4 && ["legendary", "excellent"].includes(gamePhase)) return "你赢了，而且你自己都有点意外。";
    if (honesty >= 7 && people >= 7 && quality >= 7 && judgment >= 7 && grit >= 7) return "你做到了几乎所有事情。你知道这有多难。";
    if (honesty <= 4 && people <= 4 && quality <= 4 && judgment <= 4 && grit <= 4) return "有时候这个行业就是这样。不全是你的问题。";
    return "你留下了一座无字碑。好与坏，都是你的。";
  };

  const getBar = (value) => "█".repeat(value) + "░".repeat(10 - value);

  const endingColors = {
    legendary: "#facc15",
    excellent: "#a78bfa",
    profitable: "#4ade80",
    average: "#94a3b8",
    bad_release: "#f87171",
    counter_win: "#f97316",
    lose: "#f87171",
  };

  const endingEmojis = {
    legendary: "👑",
    excellent: "🏆",
    profitable: "🎮",
    average: "📦",
    bad_release: "💥",
    counter_win: "🔥",
    lose: "📦",
  };

  const endingLabels = {
    legendary: "传奇制作人",
    excellent: "优秀制作人",
    profitable: "大赚特赚",
    average: "中规中矩",
    bad_release: "叫好不叫座",
    counter_win: "逆势突围",
    lose: "项目延期了",
  };

  const directionName = state.gameDirection ? DIRECTION_NAMES[state.gameDirection] : null;

  return (
    <div style={{
      background: "#0c0c18",
      border: "1px solid #2a2a3a",
      borderRadius: 12,
      padding: 20,
      maxWidth: 340,
      margin: "0 auto 24px",
      fontFamily: "monospace",
      textAlign: "left",
    }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>完蛋！我被延期包围了</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: endingColors[state.gamePhase], textAlign: "center", margin: "12px 0 4px" }}>
        {endingEmojis[state.gamePhase]} {endingLabels[state.gamePhase]}
      </div>
      {directionName && (
        <div style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 2 }}>
          {directionName} · {state.marketYear}年
        </div>
      )}
      <div style={{ fontSize: 13, color: "#888", textAlign: "center", marginBottom: 16 }}>
        存活 {state.survived} 周
      </div>
      <div style={{ borderTop: "1px solid #222", margin: "12px 0" }}></div>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>隐性评价</div>
      {[
        ["诚实", state.honesty],
        ["人情", state.people],
        ["品质", state.quality],
        ["判断", state.judgment],
        ["抗压", state.grit],
      ].map(([label, value]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", marginBottom: 4, fontSize: 13, color: "#ccc" }}>
          <span style={{ width: 36 }}>{label}</span>
          <span style={{ color: "#64748b" }}>{getBar(value)}</span>
          <span style={{ width: 20, textAlign: "right", marginLeft: 8 }}>{value}</span>
        </div>
      ))}
      <div style={{ borderTop: "1px solid #222", margin: "16px 0" }}></div>
      <div style={{ fontSize: 14, color: "#aaa", fontStyle: "italic", lineHeight: 1.7, marginBottom: 16 }}>
        「{getVerdict(state)}」
      </div>
      <div style={{ fontSize: 11, color: "#555", textAlign: "center" }}>
        你一定有像你这样棒的朋友吧？截图邀请他们一起来做制作人呀
      </div>
    </div>
  );
}

const TOTAL_WEEKS = 24;
const BASE_PROGRESS = 1;

function weekDisplay(week) {
  const month = Math.ceil(week / 4);
  const weekOfMonth = ((week - 1) % 4) + 1;
  return { month, weekOfMonth, label: `第${month}月 第${weekOfMonth}周` };
}

// ---- Patch 28-29 helpers ---------------------------------------------------

function weightedRandomRole() {
  const r = Math.random();
  if (r < 0.40) return 'engineer';
  if (r < 0.75) return 'designer';
  return 'qa';
}

function randomSeniority() {
  const pool = ['fresh', 'mid', 'veteran'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function computeContribution(role, seniority, gameDirection) {
  const profile = gameDirection ? DIRECTION_TEAM_SCALE[gameDirection] : null;
  if (seniority === "veteran") {
    return { progressEfficiency: 1.2, moraleBase: 0, budgetCoeff: 1.3 };
  }
  if (seniority === "mid") {
    return { progressEfficiency: 0.9, moraleBase: 2, budgetCoeff: 0.9 };
  }
  return { progressEfficiency: 0.5, moraleBase: -2, budgetCoeff: 0.5 };
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

// ---- Patch 33: 厂商规模系统 + 体量档位 ------------------------------------------------
const STUDIO_SCALE_MULTIPLIER = { small: 1.0, mid: 1.5, large: 2.5 };
const STUDIO_BUDGET_MULTIPLIER = { small: 1.0, mid: 1.3, large: 1.8 };
const MAX_HEADCOUNT = { small: 4, mid: 6, big: 8 };
const RECRUIT_COST_MULTIPLIER = { small: 1.2, mid: 1.0, big: 0.9 };
const OVERTIME_COST_MULTIPLIER = { small: 1.3, mid: 1.0, big: 0.8 };

function getProjectTeamSize(direction, companySize) {
  const base = DIRECTION_TEAM_SCALE[direction]?.projectTeamSize || 10;
  const mult = STUDIO_SCALE_MULTIPLIER[companySize] || 1.0;
  return Math.round(base * mult);
}

function getScaleTier(headcount) {
  if (headcount < 12) return "small";
  if (headcount <= 25) return "mid";
  if (headcount <= 50) return "large";
  return "xlarge";
}

const SCALE_TIER_LABELS = {
  small: "小体量",
  mid: "中体量",
  large: "大体量",
  xlarge: "特大体量",
};

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
      { id: "zombie",   emoji: "💀", label: "秽土转生", reveal: "表面进度+35……等等，这进度是真实的吗？",       init: s => ({ ...s, progress: Math.min(50, s.progress + 35), pendingEvents: ["zombie_reveal"] }), disabledIf: pickedCards => pickedCards.some(c => c?.id === "small") },
    ]
  },
  {
    title: "你的团队……",
    cards: [
       { id: "veteran", emoji: "🤝", label: "老团队", reveal: "士气+15，4名老手，经验足",
         init: s => ({ ...s, morale: Math.min(100, s.morale + 15), teamSlots: [
           { id: 'v1', role: 'engineer', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.1, moraleBase: 5, budgetCoeff: 1.0 }, name: randomFrom(PERSONALITIES.engineer.names), trait: randomFrom(PERSONALITIES.engineer.traits), background: randomFrom(PERSONALITIES.engineer.backgrounds) },
           { id: 'v2', role: 'designer', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.0, moraleBase: 5, budgetCoeff: 1.0 }, name: randomFrom(PERSONALITIES.designer.names), trait: randomFrom(PERSONALITIES.designer.traits), background: randomFrom(PERSONALITIES.designer.backgrounds) },
           { id: 'v3', role: 'qa',       seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 0.9, moraleBase: 5, budgetCoeff: 0.9 }, name: randomFrom(PERSONALITIES.qa.names), trait: randomFrom(PERSONALITIES.qa.traits), background: randomFrom(PERSONALITIES.qa.backgrounds) },
           { id: 'v4', role: 'qa', seniority: 'veteran', source: 'initial', contribution: { progressEfficiency: 1.0, moraleBase: 5, budgetCoeff: 1.0 }, name: randomFrom(PERSONALITIES.qa.names), trait: randomFrom(PERSONALITIES.qa.traits), background: randomFrom(PERSONALITIES.qa.backgrounds) },
         ]}) },
       { id: "fresh", emoji: "🌱", label: "新团队", reveal: "士气-15，2名新人，前4周效率7折",
         init: s => ({ ...s, morale: Math.max(10, s.morale - 15), teamSlots: [
           { id: 'f1', role: 'engineer', seniority: 'mid', source: 'initial', contribution: { progressEfficiency: 0.7, moraleBase: 0, budgetCoeff: 0.8 }, weeksJoined: 0, name: randomFrom(PERSONALITIES.engineer.names), trait: randomFrom(PERSONALITIES.engineer.traits), background: randomFrom(PERSONALITIES.engineer.backgrounds) },
           { id: 'f2', role: 'designer', seniority: 'fresh', source: 'initial', contribution: { progressEfficiency: 0.7, moraleBase: 0, budgetCoeff: 0.7 }, weeksJoined: 0, name: randomFrom(PERSONALITIES.designer.names), trait: randomFrom(PERSONALITIES.designer.traits), background: randomFrom(PERSONALITIES.designer.backgrounds) },
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
        }, disabledIf: pickedCards => pickedCards.some(c => c?.id === "small") },
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

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildInitialState(pickedCards, legacyData, selectedNgYear) {
  const years = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const marketYear = selectedNgYear || years[Math.floor(Math.random() * years.length)];
  
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
  
  let bossTrust;
  if (legacyData) {
    if (["legendary", "excellent"].includes(legacyData.prevResult)) {
      bossTrust = Math.floor(Math.random() * 3) + 6;
    } else if (["bad_release", "lose"].includes(legacyData.prevResult)) {
      bossTrust = Math.floor(Math.random() * 3) + 3;
    } else {
      bossTrust = Math.floor(Math.random() * 3) + 5;
    }
  } else {
    bossTrust = Math.floor(Math.random() * 6) + 3;
  }

  const bossTrait = randomFrom(PERSONALITIES.boss.traits);
  const bossName = randomFrom(PERSONALITIES.boss.names);
  const bossColorIndex = PERSONALITIES.boss.traits.indexOf(bossTrait);
  const bossAvatarColor = PERSONALITIES.boss.avatarColors[bossColorIndex];

  let s = { week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false, lucidConfidant: null, scheduledEvents: [], lucidPhase1: null, lucidTriggered: false, bossTrust, bossPersonality: { name: bossName, trait: bossTrait, avatarColor: bossAvatarColor }, hireBurdenWeeksLeft: 0, hireBurdenRate: 0, hireScale: null, problemEmployee: null, activeBonus: 0, manpowerTriggered: false, teamSlots: [], qualityDebt: 0, gameDirection: null, projectHeadcount: 0, directionChosen: false, directionDelayPenalty: false, marketYear, companySize, kpiState: "normal", ipType, ipActive, ipProtectUsed: 0, ipProtectCount: ipType === "strong" ? 2 : 0, ipRevealShown: false, overtimeThisWeek: false, narrationsUsed: [], consecutiveGoodMonths: 0, kpiBoostMonths: 0, manageUpCount: 0, progressLastMonth: 0, industryBackground: null, playerBackground: null, backgroundBonuses: [], honesty: 10, people: 10, quality: 10, judgment: 10, grit: 10, crisisComfortCount: 0, teamComfortCount: 0, bossTrustHitZero: false, fakeProgress: 0, honestyHintShown: false, honestyMidHintShown: false, peopleHintShown: false, qualityHintShown: false, usedActions: [], lastManageUpResult: null, characters: [], directionClarity: 50, lowTrustStreak: 0, traitEventsTriggered: [], paratrooperPhase: null, paratrooperAccepted: null, paratrooperStance: null, paratrooperResolution: null, paratrooperTriggerWeek: null };
  for (const card of pickedCards) { if (card) s = card.init(s); }

  s.directionClarity = getInitialDirectionClarity(null, companySize);

  if (legacyData) {
      s.honesty = Math.min(10, s.honesty + Math.floor(legacyData.prevHonesty / 10));
      s.people = Math.min(10, s.people + Math.floor(legacyData.prevPeople / 10));
      s.quality = Math.min(10, s.quality + Math.floor(legacyData.prevQuality / 10));
      s.judgment = Math.min(10, s.judgment + Math.floor(legacyData.prevJudgment / 10));
      s.grit = Math.min(10, s.grit + Math.floor(legacyData.prevGrit / 10));

      if (legacyData.legacyMembers && legacyData.legacyMembers.length > 0) {
        const usedNames = [];
        const legacySlots = legacyData.legacyMembers.map(m => {
          const name = m.name || generateMemberName(m.role, usedNames);
          usedNames.push(name);
          return {
            id: `legacy_${m.role}_${name}`,
            role: m.role,
            seniority: m.seniority,
            name,
            trait: m.trait || generateMemberTrait(m.role),
            source: "legacy",
            contribution: m.role === "engineer"
              ? { progressEfficiency: 1.1, moraleBase: 3, budgetCoeff: 1.0 }
              : { progressEfficiency: 1.0, moraleBase: 2, budgetCoeff: 0.9 },
            weeksJoined: 0,
          };
        });
        s.teamSlots = [...s.teamSlots, ...legacySlots];
      }
    }
  
  return s;
}

// ---- weekly actions --------------------------------------------------------

const CAMPUS_TAGS = ["算法竞赛参赛经历", "实习半年", "设计学院优等生", "开源项目贡献者", "游戏爱好者"];
const SOCIAL_TAGS = ["前大厂经历", "独立游戏开发者", "带过5人团队", "上线过3款产品", "擅长跨部门协作"];

const PERSONALITIES = {
  boss: {
    names: ["张总", "李总", "王总"],
    traits: ["严厉", "温和", "多疑"],
    avatarColors: ["#e53935", "#43a047", "#1976d2"],
    idiosyncrasies: {
      "严厉": { trustDecayRate: 1.2, manageUpSuccessRate: 0.6 },
      "温和": { trustDecayRate: 0.8, manageUpSuccessRate: 0.8 },
      "多疑": { trustDecayRate: 1.1, manageUpSuccessRate: 0.4 },
    }
  },
  engineer: {
    names: ["小陈", "老李", "阿峰", "大勇", "小周"],
    traits: ["严谨", "激进", "摸鱼"],
    backgrounds: ["外包出身", "全栈大神", "应届生"],
  },
  designer: {
    names: ["阿雅", "小桃", "晓敏", "李晴", "阿杰"],
    traits: ["细节控", "脑洞大", "工具人"],
    backgrounds: ["独立游戏", "美术转策划", "文案出身"],
  },
  qa: {
    names: ["赵姐", "小钱", "孙哥", "小吴", "阿龙"],
    traits: ["严谨", "佛系", "背锅"],
    backgrounds: ["测试开发", "客服转测试", "应届生"],
  },
};

// ---- Patch 36: 团队角色系统辅助函数 ------------------------------------------
function generateMemberName(role, usedNames = []) {
  const pool = PERSONALITIES[role]?.names || PERSONALITIES.engineer.names;
  const available = pool.filter(n => !usedNames.includes(n));
  return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool[0];
}

function generateMemberTrait(role) {
  return PERSONALITIES[role]?.traits?.[Math.floor(Math.random() * PERSONALITIES[role].traits.length)] || "普通";
}

function getMemberByTrait(slots, preferredTraits, role = null) {
  if (slots.length === 0) return null;
  const candidates = role ? slots.filter(m => m.role === role) : slots;
  if (candidates.length === 0) return slots[0];
  
  for (const trait of preferredTraits) {
    const match = candidates.find(m => m.trait === trait);
    if (match) return match;
  }
  return candidates[0];
}

function getTeamTraitStats(slots) {
  const stats = { slacker: 0, rigorous: 0, total: slots.length };
  slots.forEach(m => {
    if (m.trait === "摸鱼") stats.slacker++;
    if (m.trait === "严谨") stats.rigorous++;
  });
  return stats;
}

// ---- Patch 35: 角色姓名池 --------------------------------------------------
const NAME_POOL = {
  2012: {
    engineer: ["陈凯", "林强", "黄波"],
    designer: ["李萌", "王芳", "赵敏"],
    qa: ["张静", "周丽", "吴琼"],
    source: "2012 Chinese Internet boom era"
  },
  2016: {
    engineer: ["小枫", "阿杰", "洛天"],
    designer: ["小桃", "阿雅", "晓敏"],
    qa: ["小琪", "小慧", "小娟"],
    source: "2016 ACG industry boom era"
  },
  2020: {
    engineer: ["宇轩", "晨阳", "星辰"],
    designer: ["伊诺", "诗涵", "雅柔"],
    qa: ["思琪", "语涵", "梓萱"],
    source: "2020 mobile game era"
  },
};

const DEFAULT_NAMES = {
  engineer: ["小陈", "阿峰", "大勇"],
  designer: ["李晴", "阿杰", "小周"],
  qa: ["赵姐", "小钱", "孙哥"],
};

const NAME_TAGS = {
  "陈凯": "前盛大技术总监",
  "林强": "端游核心开发",
  "黄波": "页游架构师",
  "李萌": "端游策划出身",
  "王芳": "数值策划专家",
  "赵敏": "系统策划经验丰富",
  "张静": "QC团队组长",
  "周丽": "资深测试工程师",
  "吴琼": "性能测试专家",
  "小枫": "独立游戏开发者",
  "阿杰": "二次元游戏主程",
  "洛天": "图形算法工程师",
  "小桃": "B站UP主",
  "阿雅": "知名画师",
  "晓敏": "ACG文案编剧",
  "小琪": "硬核玩家转测试",
  "小慧": "社区QA负责人",
  "小娟": "兼容性测试专家",
  "宇轩": "原神氪佬",
  "晨阳": "Unity大神",
  "星辰": "移动端性能优化专家",
  "伊诺": "乙女向文案",
  "诗涵": "国风美术设计师",
  "雅柔": "二次元角色设计",
  "思琪": "抽卡概率测试员",
  "语涵": "剧情QA负责人",
  "梓萱": "多语言测试专家",
};

function randomName(marketYear, role, usedNames = []) {
  const yearKey = marketYear >= 2020 ? 2020 : marketYear >= 2016 ? 2016 : marketYear >= 2012 ? 2012 : null;
  const pool = yearKey && NAME_POOL[yearKey] ? NAME_POOL[yearKey][role] : DEFAULT_NAMES[role];
  const available = pool.filter(n => !usedNames.includes(n));
  return available.length > 0 ? randomFrom(available) : randomFrom(DEFAULT_NAMES[role]);
}

function nameToTag(name) {
  return NAME_TAGS[name] || "普通从业者";
}

function generateCharacterName(usedNames = []) {
  const allNames = [
    ...DEFAULT_NAMES.engineer, ...DEFAULT_NAMES.designer, ...DEFAULT_NAMES.qa,
    ...NAME_POOL[2012].engineer, ...NAME_POOL[2012].designer, ...NAME_POOL[2012].qa,
    ...NAME_POOL[2016].engineer, ...NAME_POOL[2016].designer, ...NAME_POOL[2016].qa,
    ...NAME_POOL[2020].engineer, ...NAME_POOL[2020].designer, ...NAME_POOL[2020].qa,
  ];
  const uniqueNames = [...new Set(allNames)];
  const available = uniqueNames.filter(n => !usedNames.includes(n));
  return available.length > 0 ? randomFrom(available) : randomFrom(uniqueNames);
}

function getInitialDirectionClarity(gameDirection, studioScale) {
  const tierBase = { small: 70, mid: 50, large: 35, xlarge: 20 };
  const scalePenalty = { small: 0, mid: 5, large: 15 };
  const headcount = gameDirection ? getProjectTeamSize(gameDirection, studioScale) : 10;
  const tier = getScaleTier(headcount);
  return tierBase[tier] - (scalePenalty[studioScale] || 0);
}

const PERSONALITY_TYPES = ["幻想家", "空中楼阁", "伞兵", "完美主义", "布道者", "自由发挥", "远见", "铁头功"];

function getPersonalityActivationCondition(type, gameDirection, studioScale) {
  switch (type) {
    case "幻想家":
    case "完美主义":
    case "布道者":
    case "自由发挥":
      return true;
    case "远见":
      return ["OPENWORLD", "ARPG", "SLG", "PC_MMO"].includes(gameDirection);
    case "铁头功":
    case "空中楼阁":
    case "伞兵":
      return studioScale !== "small";
    default:
      return false;
  }
}

function getPersonalityRole(type) {
  const roleMap = {
    "幻想家": "designer", "空中楼阁": "designer", "伞兵": "engineer",
    "完美主义": "qa", "布道者": "designer", "自由发挥": "engineer",
    "远见": "designer", "铁头功": "engineer"
  };
  return roleMap[type] || "engineer";
}

function generateCharactersForGame(gameDirection, studioScale, marketYear) {
  const usedNames = [];
  const characters = [];
  let charId = 0;
  for (const type of PERSONALITY_TYPES) {
    if (getPersonalityActivationCondition(type, gameDirection, studioScale)) {
      const role = getPersonalityRole(type);
      const name = randomName(marketYear, role, usedNames);
      usedNames.push(name);
      characters.push({
        id: `char_${String(charId++).padStart(3, "0")}`,
        name,
        type,
        motivation: randomFrom(["项目成功", "个人成长", "团队和谐", "技术挑战"]),
        relationship: 0,
        active: true,
        history: [],
        tag: nameToTag(name),
        role,
      });
    }
  }
  return characters;
}

function getPersonalityWeight(type, state) {
  const tier = getScaleTier(state.projectHeadcount || 10);
  switch (type) {
    case "完美主义":
      return (state.qualityDebt || 0) >= 3 ? 2.0
           : (state.qualityDebt || 0) >= 1 ? 1.3 : 0.8;
    case "幻想家":
      return ((state.week || 1) <= 8 || (state.directionClarity || 50) < 40) ? 1.8 : 0.9;
    case "远见":
      return (["xlarge", "large"].includes(tier) && (state.week || 1) <= 10) ? 1.8 : 0.5;
    case "布道者":
      return ((state.morale || 75) < 50 || (state.projectHeadcount || 0) > 10) ? 1.6 : 0.8;
    case "铁头功":
      return ((state.teamSlots && state.teamSlots.length >= 4) || (state.projectHeadcount || 0) > 15) ? 1.5 : 0.7;
    case "自由发挥":
      return 1.0;
    case "空中楼阁":
      return ((state.budget || 100) < 40 || ((state.week || 1) % 4 === 0)) ? 1.8 : 0.9;
    case "伞兵":
      return 0;
    default:
      return 1.0;
  }
}

function getAppearanceWeight(char, state) {
  let weight = 1.0;
  weight += (char.relationship || 0) * 0.3;
  weight *= getPersonalityWeight(char.type, state);
  return Math.max(0.05, weight);
}

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

// ---- Patch 37: 7个常驻人格类型与阶段定义 --------------------------------
const PERSONALITY_TRAITS = {
  engineer_tool: { name: "工具人小李", role: "engineer", desc: "被动接受任务，稳定输出" },
  engineer_architect: { name: "架构师小陈", role: "engineer", desc: "追求完美，重构狂魔" },
  engineer_lazy: { name: "摸鱼大王阿峰", role: "engineer", desc: "效率低，但人际关系好" },
  designer_detail: { name: "细节控小桃", role: "designer", desc: "反复修改，质量高时间长" },
  designer_creative: { name: "脑洞师阿雅", role: "designer", desc: "创意多，执行力差" },
  designer_tool: { name: "工具人李晴", role: "designer", desc: "准时交付，内容平庸" },
  qa_strict: { name: "严谨赵姐", role: "qa", desc: "多提bug，影响效率但质量高" },
  qa_easy: { name: "佛系小钱", role: "qa", desc: "少提bug，效率高但有风险" },
};

const PERSONALITY_PHASES = {
  engineer_tool: [
    { minWeek: 1, maxWeek: 4, efficiency: 0.8, phaseName: "积极适应期" },
    { minWeek: 5, maxWeek: 8, efficiency: 0.9, phaseName: "熟练期" },
    { minWeek: 9, maxWeek: 99, efficiency: 1.0, phaseName: "发现问题期", bonus: { progressBonus: 1 } },
  ],
  engineer_lazy: [
    { minWeek: 1, maxWeek: 4, efficiency: 0.5, phaseName: "摸鱼期" },
    { minWeek: 5, maxWeek: 8, efficiency: 0.7, phaseName: "偶尔加班期" },
    { minWeek: 9, maxWeek: 12, efficiency: 1.2, phaseName: "紧急爆发期" },
  ],
  engineer_architect: [
    { minWeek: 1, maxWeek: 4, efficiency: 0.6, phaseName: "代码审查期", bonus: { qualityDebt: -3 } },
    { minWeek: 5, maxWeek: 10, efficiency: 0.8, phaseName: "架构设计期", bonus: { qualityDebt: -5 } },
    { minWeek: 11, maxWeek: 99, efficiency: 1.1, phaseName: "重构完成期", bonus: { qualityDebt: -2 } },
  ],
  designer_detail: [
    { minWeek: 1, maxWeek: 4, efficiency: 0.7, phaseName: "细节打磨期", bonus: { qualityDebt: -4 } },
    { minWeek: 5, maxWeek: 9, efficiency: 0.8, phaseName: "风格定型期", bonus: { qualityDebt: -3 } },
    { minWeek: 10, maxWeek: 99, efficiency: 0.9, phaseName: "品质输出期", bonus: { qualityDebt: -2 } },
  ],
  designer_creative: [
    { minWeek: 1, maxWeek: 5, efficiency: 0.5, phaseName: "灵感爆发期", bonus: { morale: 2 } },
    { minWeek: 6, maxWeek: 12, efficiency: 0.7, phaseName: "落地困难期" },
    { minWeek: 13, maxWeek: 99, efficiency: 0.9, phaseName: "创意输出期", bonus: { progressBonus: 1 } },
  ],
  designer_tool: [
    { minWeek: 1, maxWeek: 4, efficiency: 0.8, phaseName: "熟悉需求期" },
    { minWeek: 5, maxWeek: 8, efficiency: 0.9, phaseName: "稳定输出期" },
    { minWeek: 9, maxWeek: 99, efficiency: 1.0, phaseName: "可靠交付期" },
  ],
  qa_strict: [
    { minWeek: 1, maxWeek: 4, efficiency: 0.6, phaseName: "建立流程期", bonus: { qualityDebt: -5 } },
    { minWeek: 5, maxWeek: 10, efficiency: 0.7, phaseName: "严格测试期", bonus: { qualityDebt: -3 } },
    { minWeek: 11, maxWeek: 99, efficiency: 0.8, phaseName: "质量把关期", bonus: { qualityDebt: -2 } },
  ],
  qa_easy: [
    { minWeek: 1, maxWeek: 6, efficiency: 1.0, phaseName: "佛系放行期", bonus: { qualityDebt: 3 } },
    { minWeek: 7, maxWeek: 12, efficiency: 1.1, phaseName: "快速通过期", bonus: { qualityDebt: 5 } },
    { minWeek: 13, maxWeek: 99, efficiency: 1.2, phaseName: "风险积累期", bonus: { qualityDebt: 8 } },
  ],
};

const PERSONALITY_EVENTS = [
  {
    id: "trait_engineer_tool_phase3",
    trait: "engineer_tool",
    triggerWeek: 9,
    name: "成长",
    emoji: "🌱",
    color: "#4ade80",
    tagline: "「我发现了一些可以优化的地方」",
    situation: "小李找到你：",
    dialogue: "制作人，这段时间我熟悉了项目，发现了几个可以优化的地方。如果有时间，我想把这些改进做了，应该能提升整体开发效率。",
    choices: [
      { text: "好，安排时间去做", effects: { progress: 5, morale: 5, qualityDebt: -3 }, result: "小李很开心，花了一周时间完成了优化。团队整体效率提升了。" },
      { text: "先赶进度，以后再说", effects: { morale: -3 }, result: "小李点点头，但你能看出他有些失望。那个优化的事情，他后来再也没提过。" },
    ],
  },
  {
    id: "trait_engineer_lazy_phase3",
    trait: "engineer_lazy",
    triggerWeek: 9,
    name: "觉醒",
    emoji: "⚡",
    color: "#f97316",
    tagline: "「我知道怎么快速搞定这个」",
    situation: "阿峰突然站起来：",
    dialogue: "等等！这个问题我以前遇到过！我知道一个快速解决方案，三天就能搞定——比正常方法快一倍。对了，我游戏里的公会这周要攻城，你们加班我也来！",
    choices: [
      { text: "用他的方案，快速推进", effects: { progress: 8, qualityDebt: 5 }, result: "阿峰果然三天就搞定了！团队都惊呆了——原来他摸鱼的时候，居然也在想事情？" },
      { text: "按正规流程走，稳一点", effects: { progress: 3, morale: -5 }, result: "阿峰耸耸肩坐了回去。方案没用上，他回到了正常的摸鱼节奏。" },
    ],
  },
  {
    id: "trait_engineer_architect_phase2",
    trait: "engineer_architect",
    triggerWeek: 5,
    name: "重构提议",
    emoji: "🏗️",
    color: "#60a5fa",
    tagline: "「这个架构有问题，我们需要重构」",
    situation: "小陈发来一份长长的架构设计文档：",
    dialogue: "制作人，我分析了现有代码，发现底层架构有几个严重的设计缺陷。如果现在重构，未来可以避免很多技术债。大概需要两周时间。",
    choices: [
      { text: "批准重构，长期收益更重要", effects: { progress: -5, qualityDebt: -15, morale: 8 }, result: "小陈用两周时间完成了重构。代码质量提升明显，后面的开发确实顺畅了很多。" },
      { text: "先记下来，上线后再做", effects: { morale: -8, qualityDebt: 8 }, result: "小陈很失望。那段烂代码就像一根刺，每次改相关功能他都要吐槽一遍。" },
    ],
  },
  {
    id: "trait_designer_detail_phase3",
    trait: "designer_detail",
    triggerWeek: 10,
    name: "匠心",
    emoji: "🎨",
    color: "#ec4899",
    tagline: "「我觉得这个界面还可以再优化一下」",
    situation: "小桃发来第17版UI设计稿：",
    dialogue: "制作人，这个界面我又调整了一下。主要是按钮的圆角从8px改成了9px，阴影透明度从12%调到了11%，整体感觉更精致了。你看看？",
    choices: [
      { text: "通过，品质很重要", effects: { morale: 5, qualityDebt: -8, progress: -2 }, result: "小桃满意地去做下一个界面了。虽然花了点时间，但你不得不承认，那个按钮确实更好看了。" },
      { text: "不用改了，就这样吧", effects: { morale: -10 }, result: "小桃沉默了很久。她最终没有再坚持，但你能感觉到，她对那个8px圆角的遗憾。" },
    ],
  },
  {
    id: "trait_designer_creative_phase3",
    trait: "designer_creative",
    triggerWeek: 13,
    name: "创意落地",
    emoji: "💡",
    color: "#fbbf24",
    tagline: "「这个想法我想了三个月！」",
    situation: "阿雅兴奋地冲进办公室：",
    dialogue: "我想到了！那个困扰我们三个月的玩法创意，我终于想通怎么落地了！虽然比预期复杂一点，但做出来玩家一定会喜欢的！给我两周就行！",
    choices: [
      { text: "太棒了，去做吧！", effects: { morale: 10, progress: 5, qualityDebt: -5, budget: -5 }, result: "阿雅用两周实现了那个创意。测试反馈很好，团队士气也被她的热情带动了。" },
      { text: "太复杂了，简化一下", effects: { morale: -5, progress: 2 }, result: "阿雅按照要求做了简化版。功能是有了，但少了那股让人眼前一亮的灵气。" },
    ],
  },
  {
    id: "trait_qa_strict_phase2",
    trait: "qa_strict",
    triggerWeek: 5,
    name: "发现问题",
    emoji: "🔍",
    color: "#14b8a6",
    tagline: "「这个模块有23个bug」",
    situation: "赵姐拿着厚厚的测试报告找到你：",
    dialogue: "制作人，这是核心模块的测试结果。一共23个bug，其中5个严重，8个中等。我建议这两周集中修bug，不然越往后越难改。",
    choices: [
      { text: "按赵姐说的，集中修bug", effects: { progress: -3, qualityDebt: -20, morale: 3 }, result: "两周后，核心模块稳定了很多。程序组虽然抱怨测试太严，但也承认这些bug确实该修。" },
      { text: "先修严重的，其他以后再说", effects: { qualityDebt: -8, progress: 2 }, result: "5个严重bug修了。赵姐把剩下的18个bug列进了已知问题列表，等待那个永远不会来的以后。" },
    ],
  },
  {
    id: "trait_qa_easy_warning",
    trait: "qa_easy",
    triggerWeek: 12,
    name: "隐患",
    emoji: "⚠️",
    color: "#ef4444",
    tagline: "「这个bug可能会在上线后爆发」",
    situation: "小钱私下找到你：",
    dialogue: "制作人，有个事我得跟你说一下。有个底层bug我一直没提——改起来太麻烦，而且我们测试了几十次都没复现。但是...我总觉得这个雷，可能会在上线后炸。",
    choices: [
      { text: "现在就修，不能留隐患", effects: { progress: -5, budget: -5, qualityDebt: -15 }, result: "花了一周把那个bug彻底解决了。上线那天，小钱终于睡了个安稳觉。" },
      { text: "概率低，上线后再说", effects: { qualityDebt: 20, progress: 3 }, result: "你决定赌一把。小钱叹了口气，在心里祈祷这个bug永远不要被触发。" },
    ],
  },
];

function getMemberPhaseInfo(member, currentWeek) {
  if (!member.trait || !PERSONALITY_PHASES[member.trait]) return null;
  const weeksSinceJoin = member.weeksJoined || 0;
  const phases = PERSONALITY_PHASES[member.trait];
  const current = phases.find(p => weeksSinceJoin >= p.minWeek && weeksSinceJoin <= p.maxWeek);
  const next = phases.find(p => p.minWeek > weeksSinceJoin);
  return { current, next, weeksSinceJoin };
}

function assignRandomTrait(role) {
  const traitMap = {
    engineer: ["engineer_tool", "engineer_architect", "engineer_lazy"],
    designer: ["designer_detail", "designer_creative", "designer_tool"],
    qa: ["qa_strict", "qa_easy"],
  };
  const traits = traitMap[role] || traitMap.engineer;
  return traits[Math.floor(Math.random() * traits.length)];
}

function mapChineseTraitToKey(trait, role) {
  const traitMap = {
    engineer: {
      "严谨": "engineer_architect",
      "激进": "engineer_tool",
      "摸鱼": "engineer_lazy",
    },
    designer: {
      "细节控": "designer_detail",
      "脑洞大": "designer_creative",
      "工具人": "designer_tool",
    },
    qa: {
      "严谨": "qa_strict",
      "佛系": "qa_easy",
      "背锅": "qa_easy",
    },
  };
  return traitMap[role]?.[trait] || trait;
}

function checkTraitEvents(state) {
  for (let i = 0; i < state.teamSlots.length; i++) {
    const member = state.teamSlots[i];
    if (!member.trait) continue;
    
    const traitKey = mapChineseTraitToKey(member.trait, member.role);
    
    const matchingEvent = PERSONALITY_EVENTS.find(e => 
      e.trait === traitKey && 
      member.weeksJoined === e.triggerWeek &&
      !state.traitEventsTriggered?.includes(e.id)
    );
    
    if (matchingEvent) {
      return { ...matchingEvent, memberIndex: i, memberName: member.name };
    }
  }
  return null;
}
// ---- End Patch 37 ----------------------------------------------------------

const ROLE_EMOJI = {
  engineer: "🔨",
  designer: "🎨",
  producer: "📋",
  qa: "🔍",
  other: "🧩"
};

const BOSS_EMOJI = "👔";

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
       { id: "manage_up", emoji: "☕", label: "向上管理", ap: 2, desc: "老板信任度+1（低信任时失败无惩罚）", always: true,
         available: s => s.bossTrust < 10,
         apply: s => {
           const atFloor = s.bossTrust <= 1;
           const baseRate = s.bossTrust === 0 ? 1.0
             : s.bossTrust >= 7 ? 0.75
             : s.bossTrust <= 3 ? 0.50
             : 0.65;
           const personalityMultiplier = s.bossPersonality
             ? PERSONALITIES.boss.idiosyncrasies[s.bossPersonality.trait]?.manageUpSuccessRate || 1.0
             : 1.0;
           const successRate = baseRate * personalityMultiplier;
           const success = Math.random() < successRate;
           const trustGain = success ? 1 : (atFloor ? 0 : -1);
           return {
             ...s,
             bossTrust: Math.max(0, Math.min(10, s.bossTrust + trustGain)),
             manageUpCount: (s.manageUpCount || 0) + 1,
             lastManageUpResult: success ? "success" : "fail",
           };
         } },
];

// ---- events ----------------------------------------------------------------

function getCompletionMessage(state) {
  if (state.morale < 30)
    return "进度到了。但团队……还撑得住最后一步吗？";
  if (state.budget < 20)
    return "进度到了。就差最后一步的钱了。";
  if (state.bossTrust <= 2)
    return "进度到了。就看上面最后怎么看你了。";
  return "进度已满。下周，游戏就可以上线了——如果没有意外的话。";
}

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
      { text: "礼貌拒绝，坚守核心方向",            effects: { progress: 2, morale: -5, budget: 0, bossTrust: -2 }, hidden: { judgment: 1, grit: 1 }, result: "老板有点不开心。但项目没乱。不久后那个热点凉了。" },
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
        effects: { progress: 3, morale: -5, budget: 0, bossTrust: -1 },
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
        effects: { progress: -5, morale: 3, budget: 0, bossTrust: 2 },
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
        effects: { progress: 3, morale: -2, budget: -5, bossTrust: -1 },
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

function WorkModeSelector({ workMode, setWorkMode, overtimeType, setOvertimeType, pieCount, progress, apSpent, apBonus, companySize }) {
  const isOvertime = workMode !== "normal";
  const piePenalty = isOvertime ? calcPiePenalty(workMode, pieCount, progress) : 0;
  const adjustedBudgetCost = Math.round(WORK_MODES[workMode].budgetCost * OVERTIME_COST_MULTIPLIER[companySize]);
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
             💰 付加班费 -{adjustedBudgetCost}预算
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

function NgPlusScreen({ legacyData, onNext }) {
  const TomLines = {
    legendary: "「做到了。」",
    excellent: "「做到了。」",
    profitable: "「做完了。」",
    average: "「做完了。」",
    counter_win: "「做完了。情况特殊。」",
    bad_release: "「上线了。上面不太满意。」",
    lose: "「上次的事老板知道。他说，再给你一次。」",
  };
  const tomLine = TomLines[legacyData.prevResult] || "「我们需要重新谈谈。」";

  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#facc15", marginBottom: 24 }}>第二个项目</div>
      <div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 24 }}></div>
      <div style={{ fontSize: 14, color: "#888", fontFamily: "monospace", lineHeight: 2, marginBottom: 24 }}>
        <p style={{ color: "#c7c7c7" }}>Tom在同一个前台。</p>
        <p style={{ color: "#c7c7c7" }}>还是没有站起来。</p>
        <p style={{ color: "#a78bfa", marginTop: 12 }}>{tomLine}</p>
        <p style={{ color: "#c7c7c7", marginTop: 12 }}>「老板让你自己选</p>
        <p style={{ color: "#c7c7c7" }}>下一个项目的窗口。」</p>
        <p style={{ color: "#c7c7c7", marginTop: 8 }}>「哪年？」</p>
      </div>
      <button onClick={onNext} style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer", width: "100%", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
        继续 →
      </button>
    </div>
  );
}

function NgYearScreen({ legacyData, selectedYear, onSelectYear, onNext }) {
  const years = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const yearCatchphrases = {
    2012: "页转手是捷径，月入千万不是梦",
    2013: "2013是卡牌年，无卡牌不手游",
    2014: "买量时代，流量为王",
    2015: "重度化元年，MOBA开始统治",
    2016: "二次元爆发，美术即正义",
    2017: "吃鸡横扫，SLG买量永动机",
    2018: "版号寒冬，大逃杀席卷",
    2019: "自走棋窗口期，万物皆可自走棋",
    2020: "原鬼上线，开放世界入场券",
    2021: "元宇宙概念爆发，武侠吃鸡破圈",
    2022: "出海唯一增量，动物SLG蓝海",
    2023: "版号恢复，存量竞争白热化",
    2024: "AI概念爆发，降本增效是主题",
    2025: "大厂内卷，中小团队夹缝求生",
    2026: "AI重塑行业，没有人知道规则",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", padding: "24px 20px", overflowY: "auto" }}>
      <div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 16 }}></div>
      <div style={{ fontSize: 14, color: "#888", fontFamily: "monospace", lineHeight: 1.8, marginBottom: 20 }}>
        <p>你面前有一份行业年鉴。</p>
        <p>Tom没有说话，在等你。</p>
      </div>
      <div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 16 }}></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {years.map(year => (
          <button
            key={year}
            onClick={() => onSelectYear(year)}
            style={{
              background: selectedYear === year ? "#1a1a2e" : "#0c0c18",
              border: selectedYear === year ? "1px solid #4ade80" : "1px solid #2a2a3a",
              color: selectedYear === year ? "#4ade80" : "#888",
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 13,
              fontFamily: "monospace",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (selectedYear !== year) { e.currentTarget.style.borderColor = "#3a3a5a"; e.currentTarget.style.color = "#ccc"; } }}
            onMouseLeave={e => { if (selectedYear !== year) { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; } }}>
            <span style={{ display: 'inline-block', width: 50 }}>[{year}]</span>
            <span>{yearCatchphrases[year]}</span>
            {year === legacyData.prevYear && (
              <span style={{ color: "#666", fontSize: 11, display: "block", marginTop: 2, paddingLeft: 50 }}>
                ↑ 上一局
                {legacyData.prevDirection && ` · ${DIRECTION_NAMES[legacyData.prevDirection] || legacyData.prevDirection}`}
              </span>
            )}
          </button>
        ))}
      </div>
      {selectedYear && (
        <div style={{ marginTop: 24 }}>
          <div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 16 }}></div>
          {(() => {
            const yearData = YEAR_DATA[selectedYear];
            if (yearData && yearData.hot && yearData.hot.length > 0) {
              const hotNames = yearData.hot.map(d => DIRECTIONS[d]?.label || d).join(" · ");
              return (
                <div style={{ fontSize: 13, color: "#4ade80", fontFamily: "monospace", marginBottom: 8 }}>
                  热门：{hotNames}
                </div>
              );
            }
            if (yearData?.special === "confused_year") {
              return (
                <div style={{ fontSize: 13, color: "#f87171", fontFamily: "monospace", marginBottom: 8 }}>
                  这一年没有明确的风口。
                </div>
              );
            }
            return null;
          })()}
          <div style={{ fontSize: 13, color: "#888", fontFamily: "monospace", marginBottom: 16 }}>
            你知道这一年能做什么。
          </div>
          <button onClick={onNext} style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer", width: "100%", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
            确认，就{selectedYear}年 →
          </button>
        </div>
      )}
    </div>
  );
}

function NgLegacyScreen({ legacyData, onNext }) {
  const members = legacyData.legacyMembers || [];

  return (
    <div style={{ minHeight: "100vh", background: "#060610", color: "#e0e0e8", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ borderTop: "1px solid #1a1a2e", marginBottom: 24 }}></div>
      <div style={{ fontSize: 14, color: "#888", fontFamily: "monospace", lineHeight: 2, marginBottom: 24 }}>
        <p>你打开手机，有{members.length > 1 ? "两条" : ""}消息在等你。</p>
        {members.map((m, i) => (
          <div key={i} style={{ marginTop: 16, paddingLeft: 8, borderLeft: "2px solid #4ade80" }}>
            <p style={{ color: "#4ade80" }}>「{m.name}」（{ROLE_NAMES[m.role] || m.role}）：</p>
            <p style={{ color: "#c7c7c7" }}>「听说你要开新项目，算我一个。」</p>
          </div>
        ))}
        <p style={{ marginTop: 24 }}>你有人了。</p>
        <p>{members.length > 1 ? "他们" : "他"}记得你怎么做事。</p>
      </div>
      <button onClick={onNext} style={{ background: "#0c0c18", border: "1px solid #2a2a3a", color: "#888", borderRadius: 8, padding: "13px 14px", fontSize: 15, cursor: "pointer", width: "100%", transition: "all 0.15s" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4a7a"; e.currentTarget.style.color = "#ccc"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#888"; }}>
        继续 →
      </button>
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
          const isDisabled = card.disabledIf && card.disabledIf(pickedCards);
          return (
            <button key={card.id} onClick={() => !picked && !isDisabled && onPick(step, card)} style={{ flex: 1, padding: "16px 10px", background: isDisabled ? "#050508" : isSelected ? "#0d1a0d" : "#0c0c18", border: `1px solid ${isDisabled ? "#101018" : isSelected ? "#166534" : "#1e1e2e"}`, borderRadius: 10, cursor: picked || isDisabled ? "default" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s", animation: `fadeUp 0.35s ease ${0.25 + cardIdx * 0.1}s forwards`, opacity: isDisabled ? 0.3 : 0 }}
              onMouseEnter={e => !picked && !isDisabled && (e.currentTarget.style.borderColor = "#4a4a7a")}
              onMouseLeave={e => !picked && !isDisabled && !isSelected && (e.currentTarget.style.borderColor = "#1e1e2e")}>
              <span style={{ fontSize: 32 }}>{card.emoji}</span>
              <span style={{ fontSize: 14, color: isDisabled ? "#444" : isSelected ? "#4ade80" : "#888" }}>{card.label}</span>
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
  AI_NATIVE:     { projectTeamSize: 20, budgetDrainMultiplier: 1.4,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  METAVERSE:     { projectTeamSize: 100, budgetDrainMultiplier: 1.6, sweetSpot: 4, minViable: 3, overcrowd: 6 },
  IP_PORT:       { projectTeamSize: 40, budgetDrainMultiplier: 1.5,  sweetSpot: 4, minViable: 3, overcrowd: 6 },
  BATTLE_ROYALE: { projectTeamSize: 50, budgetDrainMultiplier: 1.7,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  MOBA:          { projectTeamSize: 50, budgetDrainMultiplier: 1.7,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
  OPENWORLD:     { projectTeamSize: 300, budgetDrainMultiplier: 1.8, sweetSpot: 5, minViable: 4, overcrowd: 6 },
  PC_MMO:        { projectTeamSize: 50, budgetDrainMultiplier: 1.8,  sweetSpot: 5, minViable: 4, overcrowd: 6 },
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
        effects: { progress: -6, morale: 3, budget: -5, bossTrust: 2, qualityDebt: 8 },
        hidden: { judgment: -1 },
        result: "兴奋持续了三天。团队发现转型意味着三个月白干。",
      },
      {
        text: `表面融入，加个「${flavor.genre}探索模式」`,
        effects: { progress: -2, morale: -2, budget: -3, bossTrust: 1, qualityDebt: 5 },
        hidden: { honesty: -1 },
        result: "做出了一个四不像。玩家不买账，老板也不满意。",
      },
      {
        text: "礼貌拒绝，坚守核心方向",
        effects: { progress: 2, morale: -5, budget: 0, bossTrust: -2 },
        hidden: { judgment: 1, grit: 1 },
        result: "老板有点不开心。但项目没乱。不久后那个热点凉了。",
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
      content: <>「试用期六个月，24周。」<br /><br />「你要在这24周里，把游戏的完成度推到100。」<br /><br />「每4周，上面会来看一次进度。那是你证明自己的节点。」</>,
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
     const bossTrait = randomFrom(PERSONALITIES.boss.traits);
     const bossName = randomFrom(PERSONALITIES.boss.names);
     const bossColorIndex = PERSONALITIES.boss.traits.indexOf(bossTrait);
     const bossAvatarColor = PERSONALITIES.boss.avatarColors[bossColorIndex];
     return { week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false, lucidConfidant: null, scheduledEvents: [], lucidPhase1: null, lucidTriggered: false, bossTrust: Math.floor(Math.random() * 6) + 3, bossPersonality: { name: bossName, trait: bossTrait, avatarColor: bossAvatarColor }, hireBurdenWeeksLeft: 0, hireBurdenRate: 0, hireScale: null, problemEmployee: null, activeBonus: 0, manpowerTriggered: false, teamSlots: [], qualityDebt: 0, gameDirection: null, projectHeadcount: 0, directionChosen: false, directionDelayPenalty: false, marketYear, companySize: "mid", kpiState: "normal", ipType: "none", ipActive: false, ipProtectUsed: 0, ipProtectCount: 0, ipRevealShown: false, overtimeThisWeek: false, narrationsUsed: [], consecutiveGoodMonths: 0, kpiBoostMonths: 0, manageUpCount: 0, progressLastMonth: 0, industryBackground: null, playerBackground: null, backgroundBonuses: [], honesty: 10, people: 10, quality: 10, judgment: 10, grit: 10, crisisComfortCount: 0, teamComfortCount: 0, bossTrustHitZero: false, fakeProgress: 0, honestyHintShown: false, honestyMidHintShown: false, peopleHintShown: false, qualityHintShown: false, usedActions: [], lastManageUpResult: null };
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
       const role = weightedRandomRole();
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
       name: randomFrom(PERSONALITIES[role].names),
       trait: randomFrom(PERSONALITIES[role].traits),
       background: randomFrom(PERSONALITIES[role].backgrounds),
     };
      setState(prev => {
        const baseCost = type === "social" ? 15 : 0;
        const adjustedCost = Math.round(baseCost * RECRUIT_COST_MULTIPLIER[prev.companySize]);
        return {
          ...prev,
          teamSlots: [...prev.teamSlots, newMember],
          budget: Math.max(0, prev.budget - adjustedCost),
        };
      });
     setApSpent(p => p + apCost);
     setRecruitResultMessage(`${newMember.name}（${ROLE_NAMES[role]}）加入了团队。`);
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
    const [legacyData, setLegacyData] = useState(null);
    const [selectedNgYear, setSelectedNgYear] = useState(null);

    const DEBUG = window.location.hostname === "localhost";

    const [weekProcessed, setWeekProcessed] = useState(false);
    
    useEffect(() => {
      if (weekPhase === "event" && event === null && state.gamePhase === "playing" && !weekProcessed) {
        setWeekProcessed(true);
        setState(prev => {
          let newState = { ...prev };
          
          const baseBudgetCost = WORK_MODES[workMode].budgetCost;
          const adjustedBudgetCost = Math.round(baseBudgetCost * OVERTIME_COST_MULTIPLIER[prev.companySize]);
          
          const workEffect = {
            workMode,
            overtimeType,
            progressBonus: WORK_MODES[workMode].progressBonus,
            budgetCost: adjustedBudgetCost,
            moralePenalty: workMode !== "normal" && overtimeType !== "pay" ? calcPiePenalty(workMode, pieCount, prev.progress) : 0,
            weeklyDrain: Math.round(getWeeklyBudgetDrain(Math.ceil(prev.week / 4)) * getKpiBudgetMultiplier(prev.kpiState) * (DIRECTION_TEAM_SCALE[prev.gameDirection]?.budgetDrainMultiplier || 1) * (STUDIO_BUDGET_MULTIPLIER[prev.companySize] || 1)),
          };
          
          newState.progress = Math.min(100, prev.progress + workEffect.progressBonus + (prev.progressMomentum || 0));
          newState.budget = Math.max(0, prev.budget - workEffect.budgetCost - workEffect.weeklyDrain);
          newState.morale = Math.max(0, Math.min(100, prev.morale - workEffect.moralePenalty));
          newState.week = prev.week + 1;
          newState.overtimeThisWeek = workMode !== "normal";
          
          if (prev.hireBurdenWeeksLeft > 0) {
            newState.hireBurdenWeeksLeft = prev.hireBurdenWeeksLeft - 1;
            newState.progress = Math.max(0, newState.progress - prev.hireBurdenRate);
          }
          
          newState.teamSlots = prev.teamSlots.map(member => ({
            ...member,
            weeksJoined: (member.weeksJoined || 0) + 1,
          }));
          
          if (!newState.traitEventsTriggered) {
            newState.traitEventsTriggered = [];
          }
          
          setLastWorkEffect(workEffect);
          return newState;
        });
      }
    }, [weekPhase, event, state.gamePhase, workMode, overtimeType, pieCount, weekProcessed]);

    useEffect(() => {
      if (weekPhase === "planning") {
        setWeekProcessed(false);
      }
    }, [weekPhase]);

   const LEGACY_NAME_POOL = {
     engineer: ["小陈", "老李", "阿峰", "大勇", "小周"],
     designer: ["阿雅", "小桃", "晓敏", "李晴", "阿杰"],
   };

   function randomFrom(arr) {
     return arr[Math.floor(Math.random() * arr.length)];
   }

    function assignLegacyTeam(people) {
      if (people < 4) return [];
      const engName = randomFrom(LEGACY_NAME_POOL.engineer);
      if (people >= 7) {
        const desName = randomFrom(LEGACY_NAME_POOL.designer);
        return [
          { name: engName, role: "engineer", seniority: "mid", legacy: true },
          { name: desName, role: "designer", seniority: "mid", legacy: true },
        ];
      }
      return [{ name: engName, role: "engineer", seniority: "mid", legacy: true }];
    }

   const restart = useCallback(() => {
     setAppPhase("intro");
     setCardStep(0);
     setPickedCards([]);
     setLegacyData(null);
     setSelectedNgYear(null);
     const years = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
     const marketYear = years[Math.floor(Math.random() * years.length)];
     const bossTrait = randomFrom(PERSONALITIES.boss.traits);
     const bossName = randomFrom(PERSONALITIES.boss.names);
     const bossColorIndex = PERSONALITIES.boss.traits.indexOf(bossTrait);
      const bossAvatarColor = PERSONALITIES.boss.avatarColors[bossColorIndex];
       setState({ week: 1, progress: 0, morale: 75, budget: 100, survived: 0, gamePhase: "playing", loseReason: "", progressBonus: 0, apBonusPerWeek: 0, progressMomentum: 0, pendingEvents: [], confidant: null, verifyUsedThisMonth: false, lucidConfidant: null, scheduledEvents: [], lucidPhase1: null, lucidTriggered: false, bossTrust: Math.floor(Math.random() * 6) + 3, bossPersonality: { name: bossName, trait: bossTrait, avatarColor: bossAvatarColor }, hireBurdenWeeksLeft: 0, hireBurdenRate: 0, hireScale: null, problemEmployee: null, activeBonus: 0, manpowerTriggered: false, teamSlots: [], qualityDebt: 0, gameDirection: null, projectHeadcount: 0, directionChosen: false, directionDelayPenalty: false, marketYear, companySize: "mid", kpiState: "normal", ipType: "none", ipActive: false, ipProtectUsed: 0, ipProtectCount: 0, ipRevealShown: false, overtimeThisWeek: false, narrationsUsed: [], consecutiveGoodMonths: 0, kpiBoostMonths: 0, manageUpCount: 0, progressLastMonth: 0, industryBackground: null, playerBackground: null, backgroundBonuses: [], honesty: 10, people: 10, quality: 10, judgment: 10, grit: 10, crisisComfortCount: 0, teamComfortCount: 0, bossTrustHitZero: false, fakeProgress: 0, honestyHintShown: false, honestyMidHintShown: false, peopleHintShown: false, qualityHintShown: false, usedActions: [], lastManageUpResult: null, characters: [], directionClarity: 50, lowTrustStreak: 0, traitEventsTriggered: [], paratrooperPhase: null, paratrooperAccepted: null, paratrooperStance: null, paratrooperResolution: null, paratrooperTriggerWeek: null });
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

    const handleStartNgPlus = useCallback(() => {
      const legacy = {
        prevResult: state.gamePhase,
        prevYear: state.marketYear,
        prevDirection: state.gameDirection,
        prevPeople: state.people,
        prevHonesty: state.honesty,
        prevQuality: state.quality,
        prevJudgment: state.judgment,
        prevGrit: state.grit,
        legacyMembers: assignLegacyTeam(state.people),
      };
      setLegacyData(legacy);
      setCardStep(0);
      setPickedCards([]);
      setSelectedNgYear(null);
      setAppPhase("ng_plus");
     }, [state]);

// ================================================================
// EVENT HANDLERS - 事件处理逻辑主入口
// ================================================================
// Patch 30: manpower 逻辑在这里
// Patch 33: companySize 逻辑在这里
// Patch 34: personality 逻辑在这里
// 【下3个patch的事件修改都加在这下面】
   const handleChoice = useCallback((choice, optionIndex) => {
     if (state.gamePhase !== "playing") return;

     const effects = choice.effects || {};
     let resultText = choice.result || "";
     const outcome = choice.outcome;

     setState(prev => {
       let progressDelta = effects.progress || 0;
       let moraleDelta = effects.morale || 0;
       let budgetDelta = effects.budget || 0;
       let bossTrustDelta = effects.bossTrust || 0;
       let qualityDebtDelta = effects.qualityDebt || 0;

        // Patch 34: Apply trait-based effects when choice affects personnel
        // Patch 36: Enhanced team trait-based effect calculations
        const affectsPersonnel = event?.id === "firefighter" || event?.id === "quitter" || event?.id === "blamer" || 
                                event?.id === "cowboy" || event?.id === "legacy" || event?.id === "visionary" ||
                                event?.id === "meeting" || event?.id === "perfectionist";
        
        const isCoreEvent = event?.id === "manpower" || event?.id === "dreamer" || event?.id === "quitter";
        
        if (affectsPersonnel || isCoreEvent) {
          const traitStats = getTeamTraitStats(prev.teamSlots);
          
          if (traitStats.slacker >= 2) {
            progressDelta = Math.round(progressDelta * 0.7);
            resultText = resultText + "\n\n（团队里摸鱼的人太多，事情推进速度不如预期。）";
          }
          
          if (traitStats.rigorous === traitStats.total && traitStats.total > 0) {
            progressDelta = Math.round(progressDelta * 1.3);
            qualityDebtDelta = Math.round(qualityDebtDelta * 0.6);
            resultText = resultText + "\n\n（全严谨团队，技术方案成功率大幅提升。）";
          }
          
          prev.teamSlots.forEach(member => {
            if (member.trait === "激进" && member.role === "engineer") {
              progressDelta = Math.round(progressDelta * 1.1);
              moraleDelta = Math.round(moraleDelta * 0.5);
            }
            if (member.trait === "摸鱼" && member.role === "designer") {
              progressDelta = Math.round(progressDelta * 0.8);
              moraleDelta = Math.round(moraleDelta * 1.2);
            }
          });
        }

       // Patch 34: Boss personality affects trust changes
       if (bossTrustDelta !== 0 && prev.bossPersonality) {
         const decayRate = PERSONALITIES.boss.idiosyncrasies[prev.bossPersonality.trait]?.trustDecayRate || 1.0;
         if (bossTrustDelta < 0) {
           bossTrustDelta = Math.round(bossTrustDelta * decayRate);
           moraleDelta = Math.round(moraleDelta * (prev.bossPersonality.trait === "严厉" ? 1.3 : 1.0));
         }
       }

       let newState = {
         ...prev,
         progress: Math.max(0, Math.min(100, prev.progress + progressDelta)),
         morale: Math.max(0, Math.min(100, prev.morale + moraleDelta)),
         budget: Math.max(0, prev.budget + budgetDelta),
         bossTrust: Math.min(10, prev.bossTrust + bossTrustDelta),
         qualityDebt: Math.max(0, prev.qualityDebt + qualityDebtDelta),
       };

       if (choice.hidden) {
         Object.keys(choice.hidden).forEach(key => {
           if (newState[key] !== undefined) {
             newState[key] = Math.max(0, newState[key] + choice.hidden[key]);
           }
         });
       }

       // Patch B: boss_talk trust recovery for outcomes A and B
       if (event?.id === "boss_talk" && (outcome === "A" || outcome === "B")) {
         const trustRecovery = Math.min(3, Math.floor(prev.progress / 25));
         newState.bossTrust = Math.min(10, newState.bossTrust + trustRecovery);
         if (trustRecovery > 0) {
           resultText = resultText + "\n\n「你活下来了。老板重新打量了你一眼。进度说话，其他什么都没有。」";
         }
       }

        // Patch 30 + Patch 33: projectHeadcount dynamic changes with companySize multiplier
        // Set headcount when direction is chosen, with companySize multiplier
        // Patch 34 + Patch 35: generate characters when direction is chosen
        if (choice.direction && DIRECTION_TEAM_SCALE[choice.direction]) {
          newState.gameDirection = choice.direction;
          newState.projectHeadcount = getProjectTeamSize(choice.direction, prev.companySize);
          newState.projectHeadcount = Math.min(newState.projectHeadcount, MAX_HEADCOUNT[prev.companySize]);
          newState.directionClarity = getInitialDirectionClarity(choice.direction, prev.companySize);
          newState.characters = generateCharactersForGame(choice.direction, prev.companySize, prev.marketYear);
        }

        // Headcount decrease - lucid_p2 choice A (outcome = "external")
        if (event?.id === "lucid_p2" && outcome === "external") {
          newState.projectHeadcount = Math.max(1, newState.projectHeadcount - 1);
        }

        // Headcount decrease - stock_trap option 1 (放他走)
        if (event?.id === "stock_trap" && optionIndex === 1) {
          newState.projectHeadcount = Math.max(1, newState.projectHeadcount - 1);
        }

        // Headcount increase - manpower/brooks_law events
        // Patch 33: company size effect on manpower events
        if (event?.id === "manpower" || event?.id === "brooks_law") {
          const sizeBonus = prev.companySize === "big" ? 2 : 0;
          if (choice.action === "large") {
            newState.projectHeadcount = newState.projectHeadcount + 3 + sizeBonus;
          } else if (choice.action === "small") {
            newState.projectHeadcount = newState.projectHeadcount + 2 + sizeBonus;
          }
          newState.projectHeadcount = Math.min(newState.projectHeadcount, MAX_HEADCOUNT[prev.companySize] + sizeBonus);
        }

      // Patch 28: manpower/brooks_law → schedule hire_reveal + hireBurden
      if (event?.id === "manpower" && (choice.action === "large" || choice.action === "small")) {
        const isLarge = choice.action === "large";
        const count = isLarge ? 3 : 2;
        const newScheduled = [];
        for (let i = 1; i <= count; i++) {
          newScheduled.push({ id: "hire_reveal", triggerWeek: prev.week + i });
        }
        newState.scheduledEvents = [...(prev.scheduledEvents || []), ...newScheduled];
        newState.hireScale = choice.action;
        newState.hireBurdenWeeksLeft = isLarge ? 4 : 2;
        newState.hireBurdenRate = isLarge ? 3 : 2;
      }
      if (event?.id === "brooks_law") {
        const isLarge = optionIndex === 0;
        const isSmall = optionIndex === 1;
        if (isLarge || isSmall) {
          const count = isLarge ? 3 : 2;
          const newScheduled = [];
          for (let i = 1; i <= count; i++) {
            newScheduled.push({ id: "hire_reveal", triggerWeek: prev.week + i });
          }
          newState.scheduledEvents = [...(prev.scheduledEvents || []), ...newScheduled];
          newState.hireScale = isLarge ? "large" : "small";
          newState.hireBurdenWeeksLeft = isLarge ? 4 : 2;
          newState.hireBurdenRate = isLarge ? 3 : 2;
        }
      }

      // Patch 28: hire_reveal → add member to teamSlots
      // Patch 36: add name and trait to team members
      if (event?.id === "hire_reveal") {
        if (prev.teamSlots.length >= MAX_HEADCOUNT[prev.companySize]) {
          resultText = resultText + "\n\n团队已满员，新人直接分配到了项目组。";
        } else {
          const role = weightedRandomRole();
          const seniority = randomSeniority();
          const usedNames = prev.teamSlots.map(m => m.name);
          const newMember = {
            id: `hire_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            role,
            seniority,
            name: generateMemberName(role, usedNames),
            trait: generateMemberTrait(role),
            source: "hire_reveal",
            contribution: computeContribution(role, seniority, prev.gameDirection),
            weeksJoined: 0,
          };
          newState.teamSlots = [...prev.teamSlots, newMember];
          const hireType = choice.outcome;
          if (hireType === "god") {
            newState.progressBonus = (newState.progressBonus || 0) + 1;
          }
          if (hireType === "code" || hireType === "morale") {
            newState.problemEmployee = newMember.id;
          }
        }
      }

      if (PERSONALITY_EVENTS.some(e => e.id === event?.id)) {
        if (!newState.traitEventsTriggered) {
          newState.traitEventsTriggered = [];
        }
        if (!newState.traitEventsTriggered.includes(event.id)) {
          newState.traitEventsTriggered = [...newState.traitEventsTriggered, event.id];
        }
      }

      // Patch 38: Paratrooper event arc handling
      if (event?.id === "paratrooper_phase1") {
        newState.paratrooperPhase = 1;
        newState.paratrooperAccepted = choice.accept;
        newState.paratrooperTriggerWeek = prev.week;
        if (choice.accept === "full" || choice.accept === "partial") {
          newState.projectHeadcount = prev.projectHeadcount + 2;
          newState.kpiState = "tight";
        }
      } else if (event?.id === "paratrooper_phase2") {
        newState.paratrooperPhase = 2;
        newState.paratrooperStance = choice.stance;
      } else if (event?.id === "paratrooper_phase3") {
        newState.paratrooperPhase = 3;
        newState.paratrooperResolution = choice.resolution;
      } else if (event?.id === "paratrooper_phase4") {
        newState.paratrooperPhase = 4;
        if (prev.paratrooperResolution === "expel") {
          newState.progress = Math.max(0, prev.progress - 20);
          newState.morale = Math.min(100, prev.morale + 5);
          newState.bossTrust = Math.max(0, prev.bossTrust - 2);
          newState.kpiState = "normal";
          resultText = "你成功驱逐了空降经理。团队士气有所回升，但进度严重受挫，老板对你的信任也下降了。项目终于回到了你的完全掌控之下。";
        } else if (prev.paratrooperResolution === "cooperate") {
          newState.progress = Math.min(100, prev.progress + 10);
          newState.morale = Math.min(100, prev.morale + 10);
          newState.bossTrust = Math.min(10, prev.bossTrust + 2);
          newState.kpiState = "loose";
          resultText = "你们最终达成了合作共识。空降经理带来的资源和经验推动了项目进展，团队士气也恢复了。老板对这个结果很满意，给了你更大的自主权。";
        } else {
          newState.progress = Math.max(0, prev.progress - 5);
          newState.morale = Math.max(0, prev.morale - 3);
          resultText = "事情不了了之。空降经理还在，但不再直接干涉项目。状态回到了一种微妙的平衡。";
        }
      }

      return newState;
    });

    setLastResult(resultText);
    setLastEffects(effects);
    setShowResult(true);
  }, [state, event]);

  const dismissMonthSummary = useCallback(() => {
    setShowMonthSummary(false);
    setMonthSummaryData(null);
  }, []);

  const checkParatrooperEvents = useCallback((state) => {
    if (state.paratrooperPhase === null) {
      if (state.week >= 1 && state.week <= 4) {
        return PARATROOPER_PHASE1;
      }
      return null;
    }
    if (state.paratrooperPhase === 1 && state.paratrooperAccepted !== "reject") {
      if (state.week >= 6 && state.week <= 8) {
        return PARATROOPER_PHASE2;
      }
    }
    if (state.paratrooperPhase === 2) {
      if (state.week >= 12 && state.week <= 14) {
        return PARATROOPER_PHASE3;
      }
    }
    if (state.paratrooperPhase === 3) {
      if (state.week >= 16) {
        return PARATROOPER_PHASE4;
      }
    }
    return null;
  }, []);

  const nextEvent = useCallback(() => {
    const paratrooperEvent = checkParatrooperEvents(state);
    if (paratrooperEvent) {
      setEvent(paratrooperEvent);
      setAnimKey(k => k + 1);
      return;
    }
    const traitEvent = checkTraitEvents(state);
    if (traitEvent) {
      setEvent(traitEvent);
      setAnimKey(k => k + 1);
      return;
    }
    setEvent(null);
    setShowResult(false);
    setAnimKey(k => k + 1);
}, [state, checkParatrooperEvents]);

    const handleEndingPreview = (num) => {
      if (!DEBUG) return;
      const endings = ["legendary", "excellent", "profitable", "average", "bad_release", "counter_win", "lose"];
      const idx = num - 1;
      if (idx >= 0 && idx < endings.length && state.gamePhase === "playing") {
        setState(s => ({
          ...s,
          gamePhase: endings[idx],
          loseReason: idx === 6 ? "【调试模式】快速预览结局" : s.loseReason,
          gameDirection: idx % 2 === 0 ? "open_world" : null,
          projectHeadcount: idx % 2 === 0 ? DIRECTION_TEAM_SCALE.OPENWORLD.projectTeamSize : 0,
          survived: 18 + idx,
        }));
      }
    };

   const phase = [...PHASE_LABELS].reverse().find(p => state.progress >= p.min)?.label || "概念原型期";
   const weeksLeft = TOTAL_WEEKS - state.week;
   const { label: timeLabel } = weekDisplay(state.week);

   if (appPhase === "ng_plus") {
     return (
       <NgPlusScreen
         legacyData={legacyData}
         onNext={() => setAppPhase("ng_year")}
       />
     );
   }
   if (appPhase === "ng_year") {
     return (
       <NgYearScreen
         legacyData={legacyData}
         selectedYear={selectedNgYear}
         onSelectYear={setSelectedNgYear}
         onNext={() => {
           if (legacyData && legacyData.legacyMembers && legacyData.legacyMembers.length > 0) {
             setAppPhase("ng_legacy");
           } else {
             setAppPhase("cards");
           }
         }}
       />
     );
   }
    if (appPhase === "ng_legacy") {
      return (
        <NgLegacyScreen
          legacyData={legacyData}
          onNext={() => setAppPhase("cards")}
        />
      );
    }

    if (appPhase === "intro") {
      return <IntroScreen onNext={() => setAppPhase("cards")} />;
    }

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
       if (legacyData) {
         const initState = buildInitialState(pickedCards, legacyData, selectedNgYear);
         setState(initState);
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
         setLastResult("");
         setLastConfidantReveal("");
         setLastBossReaction("");
         setLastEffects(null);
         setLastWorkEffect(null);
         setRecruitResultMessage("");
         setRecruitCandidate(null);
         setAnimKey(k => k + 1);
         setAppPhase("game");
       } else {
         setAppPhase("onboarding");
       }
     }
   };

    if (appPhase === "cards") {
      return <CardScreen step={cardStep} pickedCards={pickedCards} onPick={handleCardPick} onNext={handleCardNext} />;
    }

   const handleOnboardingDone = () => {
     const initState = buildInitialState(pickedCards);
     setPrologueState(initState);
     setAppPhase("prologue");
   };

    if (appPhase === "onboarding") {
      return <OnboardingScreen pickedCards={pickedCards} onDone={handleOnboardingDone} />;
    }

    const handlePrologueStart = () => {
      if (!prologueState) return;
      setState(prologueState);
      setAppPhase("game");
      setEvent(null);
    };

    if (appPhase === "prologue") {
      return <PrologueScreen initState={prologueState} onStart={handlePrologueStart} />;
    }

    if (state.gamePhase === "legendary") return (
    <div style={s.app}>
      <div style={s.endWrap}>
        <div style={{ fontSize: 72 }}>👑</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#facc15", margin: "12px 0 6px" }}>传奇制作人</div>
        <div style={{ color: "#c7c7c7", fontSize: 14, marginBottom: 6 }}>{timeLabel} 交付</div>
        <div style={{ color: "#888", fontSize: 15, lineHeight: 1.7, maxWidth: 260, textAlign: "center", marginBottom: 24 }}>
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了。<br /><br />而且你知道，基于你的实力，<br />这是一种必然。<br />企业通讯软件的提示音响起，<br />老板约你开会聊下一个项目。
        </div>
        <ShareCard state={state} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={handleStartNgPlus} style={s.endBtn}>开启第二局 →</button><button onClick={restart} style={{ ...s.endBtn, opacity: 0.7, borderColor: '#3a3a5a' }}>再来一局</button></div>
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
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了。<br /><br />老板很满意，<br />说他当初果然没有看走眼。<br />一旁的Tom仍旧沉默不语，<br />你注意到他拿出手机，看了一眼时间。
        </div>
        <ShareCard state={state} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={handleStartNgPlus} style={s.endBtn}>开启第二局 →</button><button onClick={restart} style={{ ...s.endBtn, opacity: 0.7, borderColor: '#3a3a5a' }}>再来一局</button></div>
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
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了。<br />所有人都在为你庆功，<br />一时间关于你的通稿铺天盖地。<br />你随后成了这家公司的副总裁，<br />也成了这个行业最炙手可热的明星，<br />你的联系方式现在非常值钱。<br /><br />但你注意到，<br />角落里有一道锐利的目光，注视着你。
        </div>
        <ShareCard state={state} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={handleStartNgPlus} style={s.endBtn}>开启第二局 →</button><button onClick={restart} style={{ ...s.endBtn, opacity: 0.7, borderColor: '#3a3a5a' }}>再来一局</button></div>
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
          你扛住了 <span style={{ color: "#c084fc" }}>{state.survived} 个延期人格</span> 的轮番骚扰，成功把游戏送上线。<br /><br />你做到了。<br />但也只是保住了这份工。
        </div>
        <ShareCard state={state} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={handleStartNgPlus} style={s.endBtn}>开启第二局 →</button><button onClick={restart} style={{ ...s.endBtn, opacity: 0.7, borderColor: '#3a3a5a' }}>再来一局</button></div>
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
           所有人说这个方向没有未来。<br /><br />你做了，上线了。<br />活跃数据证明你没有错，<br />但付费数据证明他们是对的。<br /><br />你关掉数据分析后台，去喝了一杯酒。
         </div>
         <ShareCard state={state} />
         <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={handleStartNgPlus} style={s.endBtn}>带着遗憾继续 →</button><button onClick={restart} style={{ ...s.endBtn, opacity: 0.7, borderColor: '#3a3a5a' }}>重新开始</button></div>
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
          所有人都说这个方向没有未来。<br /><br />你没有辩解，只是做完了。<br />上线那天，<br />你翻出了当时那个沙龙的聊天记录，没有回复任何人。<br />数据会说话。
        </div>
        <ShareCard state={state} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={handleStartNgPlus} style={s.endBtn}>开启第二局 →</button><button onClick={restart} style={{ ...s.endBtn, opacity: 0.7, borderColor: '#3a3a5a' }}>再来一局</button></div>
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
        <ShareCard state={state} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><button onClick={handleStartNgPlus} style={s.endBtn}>带着遗憾继续 →</button><button onClick={restart} style={{ ...s.endBtn, opacity: 0.7, borderColor: '#3a3a5a' }}>重新开始</button></div>
      </div>
    </div>
  );

   const apTotal = WORK_MODES[workMode].ap + (state.apBonusPerWeek || 0);
  const apLeft = Math.max(0, apTotal - apSpent);

   const header = (
     <div style={s.header}>
       {DEBUG && state.gamePhase === "playing" && (
         <div style={{ background: "#1a0520", padding: "6px 12px", borderBottom: "1px solid #2a1a30", fontSize: 11, fontFamily: "monospace", display: "flex", gap: 6, flexWrap: "wrap" }}>
           <span style={{ color: "#c084fc" }}>调试：</span>
           {[1,2,3,4,5,6,7].map(n => (
             <button key={n} onClick={() => handleEndingPreview(n)} style={{
               background: "#2a1a30", border: "1px solid #3a2a40", color: "#c084fc",
               borderRadius: 4, padding: "2px 8px", fontSize: 11, cursor: "pointer"
             }}>{n}</button>
           ))}
           <span style={{ color: "#666", marginLeft: 4 }}>点击预览 7 种结局</span>
         </div>
       )}
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
         {state.paratrooperPhase !== null && state.paratrooperPhase < 4 && (
           <div style={{ fontSize: 12, fontFamily: "monospace", marginTop: 2, color: "#f97316" }}>
             🪂 空降经理：阶段{state.paratrooperPhase}/4
             {state.paratrooperPhase === 1 && `（${state.paratrooperAccepted === "full" ? "完全接受" : state.paratrooperAccepted === "partial" ? "部分接受" : "已拒绝"}）`}
             {state.paratrooperPhase === 2 && `（${state.paratrooperStance === "obey" ? "完全服从" : state.paratrooperStance === "compromise" ? "妥协" : "坚持对抗"}）`}
             {state.paratrooperPhase === 3 && `（${state.paratrooperResolution === "cooperate" ? "选择合作" : state.paratrooperResolution === "escalate" ? "上报老板" : "决心驱逐"}）`}
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
                周消耗: -{Math.round(getWeeklyBudgetDrain(Math.ceil(state.week / 4)) * getKpiBudgetMultiplier(state.kpiState) * (DIRECTION_TEAM_SCALE[state.gameDirection]?.budgetDrainMultiplier || 1) * (STUDIO_BUDGET_MULTIPLIER[state.companySize] || 1))}
                <br />
                预计剩余: {Math.max(0, Math.floor(state.budget / Math.max(1, getWeeklyBudgetDrain(Math.ceil(state.week / 4)) * getKpiBudgetMultiplier(state.kpiState) * (DIRECTION_TEAM_SCALE[state.gameDirection]?.budgetDrainMultiplier || 1) * (STUDIO_BUDGET_MULTIPLIER[state.companySize] || 1))))}周
              </div>
            )}
          </div>
          <div style={{ width: 10 }} />
          <StatBar label="⭐ 信任" value={state.bossTrust * 10} displayValue={state.bossTrust} color="#facc15" onClick={() => setActiveTip(activeTip === "trust" ? null : "trust")} />
          </div>
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
          <span style={{ color: state.bossPersonality?.avatarColor }}>{BOSS_EMOJI} {state.bossPersonality?.name || "老板"}</span><br />
          性格：<span style={{ color: state.bossPersonality?.avatarColor }}>{state.bossPersonality?.trait || "未知"}</span><br />
          {state.bossPersonality?.trait === "严厉" && <>👉 信任下降时士气伤害 ×1.3 · 向上管理成功率 60%</>}
          {state.bossPersonality?.trait === "温和" && <>👉 信任下降较慢 · 向上管理成功率 80%</>}
          {state.bossPersonality?.trait === "多疑" && <>👉 信任下降较快 · 向上管理成功率 40%</>}
          <hr style={{ border: "none", borderTop: "1px solid #1a1a2e", margin: "6px 0" }} />
          ⭐ 信任度（0-10）<br />
          0：触发「谈话」事件，可能直接失败。<br />
          ≤ 2：每月底预算自动 -5，他在打听你的项目<br />
          ≤ 4：管理层干预事件频率 ×2<br />
          ≥ 8：管理层干预频率降低
         </div>
       )}
        <div onClick={() => setTeamPanelExpanded(!teamPanelExpanded)} style={{ padding: "10px 18px", background: "#08080f", borderBottom: "1px solid #0e0e1e", cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "monospace", color: "#c7c7c7" }}>
            <span>🤝</span>
            <span>核心团队 {state.teamSlots.length}/{MAX_HEADCOUNT[state.companySize]}</span>
            {state.gameDirection && DIRECTION_TEAM_SCALE[state.gameDirection] ? (
              <span style={{ color: "#666" }}>· 项目 {state.projectHeadcount}人 · {SCALE_TIER_LABELS[getScaleTier(state.projectHeadcount)] || ""}</span>
            ) : null}
            <span style={{ flex: 1 }} />
            <span>{teamPanelExpanded ? "▲" : "▼"}</span>
          </div>
        </div>
       {teamPanelExpanded && state.teamSlots.length > 0 && (
         <div style={{ background: "#0c0c18", padding: "8px 18px", borderBottom: "1px solid #0e0e1e" }}>
{state.teamSlots.map(member => {
              const arrow = member.contribution.progressEfficiency >= 1.0 ? "↑↑" : member.contribution.progressEfficiency >= 0.7 ? "↑" : "↓";
              const phaseInfo = getMemberPhaseInfo(member, state.week);
              return (
                <div key={member.id} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "6px 0", borderBottom: "1px solid #1a1a2e" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontFamily: "monospace", color: "#888" }}>
                    <span style={{ fontSize: 16 }}>{ROLE_EMOJI[member.role]}</span>
                    <span style={{ width: 42, fontWeight: 500, color: "#ccc" }}>{member.name || ROLE_NAMES[member.role]}</span>
                    <span style={{ width: 42, color: "#666", fontSize: 12 }}>{SENIORITY_NAMES[member.seniority]}</span>
                    <span style={{ 
                      color: arrow === "↑↑" ? "#4ade80" : arrow === "↑" ? "#60a5fa" : "#f97316",
                      fontSize: 12,
                      fontWeight: "bold"
                    }}>{arrow}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingLeft: 26, fontSize: 11, color: "#666" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ color: "#8b5cf6" }}>{member.trait || ""}</span>
                      <span style={{ color: "#555" }}>·</span>
                      <span style={{ color: "#0ea5e9" }}>{member.background || ""}</span>
                    </div>
                    {phaseInfo && (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ color: "#22c55e" }}>第 {member.weeksJoined || 0} 周</span>
                        <span style={{ color: "#444" }}>|</span>
                        <span style={{ color: "#fbbf24" }}>{phaseInfo.current?.phaseName || "初始阶段"}</span>
                        {phaseInfo.next && (
                          <span style={{ color: "#666" }}>→ {phaseInfo.next.phaseName}</span>
                        )}
                      </div>
                    )}
                  </div>
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
               <WorkModeSelector workMode={workMode} setWorkMode={setWorkMode} overtimeType={overtimeType} setOvertimeType={setOvertimeType} pieCount={pieCount} progress={state.progress} apSpent={apSpent} apBonus={state.apBonusPerWeek||0} companySize={state.companySize} />
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
                         <span style={{ flex: 1, fontSize: 14, color: "#ccc" }}>{member.name || ROLE_NAMES[member.role]}</span>
                         <span style={{ fontSize: 12, color: "#666" }}>{SENIORITY_NAMES[member.seniority]}</span>
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
                      setEvent(null);
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
                        
                        const isManpowerEvent = event?.id === "manpower";
                        const isDreamer = event?.id === "dreamer";
                        const isQuitter = event?.id === "quitter";
                        
                        if (state.teamSlots.length > 0) {
                          const memberForEvent = state.teamSlots[0];
                          if (isManpowerEvent) {
                            const engineerMember = getMemberByTrait(state.teamSlots, ["严谨"], "engineer") || memberForEvent;
                            displayDialogue = `${engineerMember.name}（${engineerMember.trait}的${ROLE_NAMES[engineerMember.role]}）找到你，眉头紧锁：\n\n` +
                              `「老板刚才把我叫进办公室，说开发速度一定要快。不行就加人。HR那边准备了一批简历。\n他还塞过来几个推荐候选人的名单，让我优先考虑。」\n\n你接过名单，感觉事情没那么简单。`;
                          } else if (isDreamer) {
                            const designerMember = getMemberByTrait(state.teamSlots, ["脑洞大"], "designer") || memberForEvent;
                            displayDialogue = `${designerMember.name}（${designerMember.trait}的${ROLE_NAMES[designerMember.role]}）找到你，眼睛发亮：\n\n` +
                              `「制作人！我昨晚想到了一个超酷的功能——城市建造系统+NPC情绪引擎+实时动态天气！直接对标最近很火的那个猛男捡树枝！我问了朋友，实现起来应该不难的！」`;
                          } else if (isQuitter) {
                            const engineerMember = getMemberByTrait(state.teamSlots, ["激进"], "engineer") || memberForEvent;
                            displayDialogue = `${engineerMember.name}（${engineerMember.trait}的${ROLE_NAMES[engineerMember.role]}）发来私信：\n\n` +
                              `「制作人……我想辞职。我跟女朋友分手了，在这个城市实在待不下去了。战斗系统我会交接好的。」`;
                          }
                        }
                       
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
                              {choices.map((c, i) => (
                                <button key={i} onClick={() => handleChoice(c, i)} style={{ ...s.choiceBtn, opacity: 0, cursor: "pointer", animation: `fadeUp 0.4s ease ${0.7 + i * 0.15}s forwards` }}
                                  onMouseEnter={e => { e.currentTarget.style.borderColor = event.color; e.currentTarget.style.background = `${event.color}0a`; }}
                                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e1e2e"; e.currentTarget.style.background = "#0c0c18"; }}>
                                  <div style={{ fontSize: 15, color: "#ccc" }}>{c.text}</div>
                                </button>
                              ))}
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

// ================================================================
// PATCH CONSTANTS - 按编号排序
// ================================================================
// 所有新增的 patch 常量都加在这下面，方便查找定位

// ================================================================
// PATCH 28-29: 团队规模系统
// ================================================================
// 代码位置: ~ line 230
// - weightedRandomRole, randomSeniority, computeContribution

// ================================================================
// PATCH 33: 厂商规模系统
// ================================================================
// 代码位置: ~ line 228
// - STUDIO_SCALE_MULTIPLIER, STUDIO_BUDGET_MULTIPLIER
// - getProjectTeamSize, getScaleTier, SCALE_TIER_LABELS
// - DIRECTION_TEAM_SCALE

// ================================================================
// PATCH 34: NPC 人格系统
// ================================================================
// 代码位置: ~ line 228
// - PERSONALITIES

// ================================================================
// PATCH 36: 现有事件迁移到角色系统
// ================================================================
// 代码位置: 
// - generateMemberName, generateMemberTrait, getMemberByTrait, getTeamTraitStats (line ~484)
// - 事件对话个性化: manpower/dreamer/quitter (line ~4160)
// - 团队特质影响事件效果计算 (line ~3590)
// - 团队UI显示成员姓名和性格 (line ~3945)

// ================================================================
// PATCH 37: 常驻人格事件弧线框架
// ================================================================
// 代码位置: ~ line 705 (PERSONALITY_TRAITS), ~ line 759 (PERSONALITY_EVENTS)
// - PERSONALITY_TRAITS: 8种人格类型的详细定义（工具人/架构师/摸鱼王/细节控/脑洞大师/工具人设计/严谨QA/佛系QA）
// - PERSONALITY_PHASES: 每种人格3个成长阶段的效率、品质、士气加成
// - PERSONALITY_EVENTS: 7个专属人格事件，在特定入职周数触发
// - mapChineseTraitToKey(): 中文性格标签到英文键的映射
// - checkTraitEvents(): 检查是否有人格事件需要触发
// - traitEventsTriggered: 状态字段，记录已触发的人格事件（避免重复）
// - 周推进时自动更新成员 weeksJoined，用于阶段判定

// ================================================================
// PATCH 38: 伞兵完整弧线
// ================================================================
// 代码位置: ~ line 4520 (PARATROOPER_EVENTS), ~ line 3780 (handleChoice 处理逻辑), ~ line 3830 (nextEvent 阶段检测), ~ line 3883 (UI 显示)
// - PARATROOPER_EVENTS: 4个阶段的伞兵事件定义（空降/理念冲突/矛盾激化/结局）
// - paratrooperPhase: 状态字段，记录当前伞兵事件阶段（null=未触发, 1-4=阶段1-4）
// - paratrooperAccepted: 状态字段，记录阶段1选择（接受/部分接受/拒绝）
// - checkParatrooperEvents(): 检查伞兵阶段事件是否需要触发
// - handleChoice 中的伞兵事件效果处理
// - UI 右上角显示经理状态

// Patch 38: 伞兵事件 - 4个阶段
const PARATROOPER_PHASE1 = {
  id: "paratrooper_phase1",
  name: "经理空降",
  emoji: "🪂",
  color: "#4ade80",
  tagline: "「我不会乱动的」（但一定会的）",
  situation: "空降的这位执行制作人听说是老板花了大价钱挖来的，他在全员会议上笑着说：",
  dialogue: "大家好！我是新来的执行制作人，会辅助制作人把这个内容做好。我觉得你们做得挺好的，会尽量不动大家的东西。对了，我只是有一些小小的方向性调整……",
  choices: [
    { text: "完全接受，全力配合", effects: { progress: -8, morale: -6, budget: 15, bossTrust: 3 }, hidden: { grit: -1 }, result: "他很高兴，老板也很满意。团队士气受到冲击，但预算追加了。项目正式进入「双制作人」状态。", accept: "full" },
    { text: "部分接受，划定边界", effects: { progress: -4, morale: -3, budget: 8, bossTrust: 1 }, hidden: { grit: 1 }, result: "你和他达成了妥协，划定了各自的权责范围。他没有完全插手，但也没有完全离开。", accept: "partial" },
    { text: "委婉拒绝，建议观望", effects: { progress: 2, morale: 5, budget: 0, bossTrust: -3 }, hidden: { grit: 2, judgment: 1 }, result: "你顶住了压力，建议先观察一段时间再做决定。老板很不高兴，但团队很感激你保护了他们的工作环境。", accept: "reject" },
  ]
};

const PARATROOPER_PHASE2 = {
  id: "paratrooper_phase2",
  name: "理念冲突",
  emoji: "⚡",
  color: "#facc15",
  tagline: "「这个方向，我觉得需要调整」",
  situation: "新经理在周会上提出了他的想法：",
  dialogue: "我看了一下最近的进度，有个想法——我们是不是可以把核心玩法改成更「轻量化」的版本？这样上线时间可以提前两个月，数据也会更好看。当然，最终还是你来定。",
  choices: [
    { text: "完全服从，按他说的改", effects: { progress: -3, morale: -4, budget: 0, bossTrust: 2 }, result: "方向改了。团队很失落，但老板很满意。你保住了位置，却失去了一些团队的信任。", stance: "obey" },
    { text: "折中方案，各退一步", effects: { progress: -1, morale: -2, budget: 0, bossTrust: 0 }, result: "你们达成了一个不伦不类的折中方案。没有人满意，但也没有人受伤。", stance: "compromise" },
    { text: "据理力争，坚持原方向", effects: { progress: 2, morale: 5, budget: 0, bossTrust: -2 }, result: "你顶住了压力，坚持了原来的方向。团队士气大振，但你和他的关系彻底破裂了。", stance: "resist" },
  ]
};

const PARATROOPER_PHASE3 = {
  id: "paratrooper_phase3",
  name: "矛盾激化",
  emoji: "🔥",
  color: "#f97316",
  tagline: "「要么他走，要么我走」",
  situation: "项目例会上，冲突爆发了：",
  dialogue: "他当着整个团队的面，否定了你上周拍板的所有设计决策。「这些东西都太理想化了，不切实际。听我的，按我说的改。」\n\n团队一片死寂，所有人都在看你。",
  choices: [
    { text: "退让，继续合作", effects: { progress: -5, morale: -8, budget: 0, bossTrust: 2 }, result: "你选择了忍耐。团队士气跌到谷底，但老板觉得你「识大体」。", resolution: "cooperate" },
    { text: "请示老板，让他定夺", effects: { progress: -2, morale: -3, budget: 0, bossTrust: 0 }, result: "你把球踢给了老板。老板各打五十大板，要求你们「好好合作」。矛盾没有解决，只是被掩盖了。", resolution: "escalate" },
    { text: "强硬驱逐，逼他离开", effects: { progress: 3, morale: 8, budget: 0, bossTrust: -3 }, result: "你联合了核心团队，向老板表明了态度：要么他走，要么我们走。老板妥协了，但你付出了巨大的政治代价。", resolution: "expel" },
  ]
};

const PARATROOPER_PHASE4 = {
  id: "paratrooper_phase4",
  name: "伞兵结局",
  emoji: "🎭",
  color: "#a78bfa",
  tagline: "「尘埃落定」",
  situation: "经过三个月的拉扯，事情终于要有个了断：",
  dialogue: "老板把你和他叫进了办公室。门关上的那一刻，你知道——今天，一切都会有个结果。",
  choices: [
    { text: "面对最终裁决", effects: {}, result: "结果如何，全看你之前的选择。" },
  ]
};

const PARATROOPER_EVENTS = [PARATROOPER_PHASE1, PARATROOPER_PHASE2, PARATROOPER_PHASE3, PARATROOPER_PHASE4];

// ================================================================
// PATCH 35 + 38-40: 【待实现】
// ================================================================
// 下几个patch的常量就放这下面

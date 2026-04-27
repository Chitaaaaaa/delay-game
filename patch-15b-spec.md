# Patch 15b：跨行业行动系数与 debuff 接入

> 前置：patch-15-spec.md（跨行业第五张卡完整设计，industryBackground 字段已在 state 中）
> 本 spec 只实现行动系数和 debuff，事件专属第四选项另行讨论

---

## 读取方式

所有效果通过读取 `state.industryBackground` 判断，值为以下之一：
```
"realestate" / "education" / "finance" / "film" / "blockchain" / "mcn" / null
```

---

## 一、行动系数调整

### 紧急融资（finance）

```javascript
// finance：成功率 +20%（在现有随机判定前叠加）
// realestate：产出金额 ×1.5
// blockchain：产出金额 ×2.0
```

在紧急融资 apply 函数中：
```javascript
let gain = 18 + Math.floor(Math.random() * 15);
if (s.industryBackground === "realestate") gain = Math.round(gain * 1.5);
if (s.industryBackground === "blockchain") gain = Math.round(gain * 2.0);

// finance 的额外成功率：原有 missChance 基础上 -0.2（下限0）
let missChance = ...; // 现有逻辑
if (s.industryBackground === "finance") missChance = Math.max(0, missChance - 0.2);
```

### 团队关怀（care）

```javascript
// education：效果 ×1.3（已在 patch-15 原有代码中，确认生效即可）
// finance：效果 ×0.7
// blockchain：效果 ×0.6
```

在团队关怀 apply 函数中：
```javascript
let moraleGain = getTeamComfortEffect(s.teamComfortCount); // patch-19 递减公式
if (s.industryBackground === "education") moraleGain = Math.round(moraleGain * 1.3);
if (s.industryBackground === "finance")   moraleGain = Math.round(moraleGain * 0.7);
if (s.industryBackground === "blockchain") moraleGain = Math.round(moraleGain * 0.6);
```

### 向上管理（manage_up）

```javascript
// mcn：bossTrust 回复额外 +1（叠加现有效果）
if (s.industryBackground === "mcn") bossGain += 1;
```

---

## 二、debuff 接入

### 教培（education）：qualityDebt 积累加速

在所有 qualityDebt 增加的结算点，检查并叠加：
```javascript
// 每次 qualityDebt += X 时：
if (s.industryBackground === "education") X = Math.round(X * 1.1);
```

涉及位置：事件选项结算、砍功能行动、全员冲刺行动、milestone qualityDebt 变化。

### 影视（film）：空中楼阁选A额外 qualityDebt

在空中楼阁事件（id: "castle"）选A结算时追加：
```javascript
if (s.industryBackground === "film") {
  s = { ...s, qualityDebt: Math.min(100, s.qualityDebt + 5) };
}
```

### 影视（film）：市场热潮跟风debuff减半

市场热潮事件（id: "market_trend"）选B「表面融入」的负面效果（progress/morale负值）×0.5：
```javascript
if (s.industryBackground === "film") {
  // 只对负值减半，正值不变
  effects.progress = effects.progress < 0 ? Math.round(effects.progress * 0.5) : effects.progress;
  effects.morale   = effects.morale   < 0 ? Math.round(effects.morale   * 0.5) : effects.morale;
}
```

### MCN（mcn）：技术类事件前2个月效果偏差

前2个月（`state.week <= 8`），屎山/完美主义/远见（`legacy / perfectionist / visionary`）事件结算时，所有选项的效果值绝对值 ×1.2（正向的更正，负向的更负）：
```javascript
if (s.industryBackground === "mcn" && s.week <= 8) {
  // 对 effects 中每个非零值：effect > 0 ? effect * 1.2 : effect * 1.2（方向不变，幅度放大）
  Object.keys(effects).forEach(k => {
    if (effects[k] !== 0) effects[k] = Math.round(effects[k] * 1.2);
  });
}
```

---

## 三、不在本 spec 实现

- 地产/影视/区块链事件专属第四选项（另行讨论）
- 地产前3个月「团队沉默」结果（技术相关事件额外选项，另行讨论）
- 金融背景的预算数字精确显示（UI层，可单独处理）

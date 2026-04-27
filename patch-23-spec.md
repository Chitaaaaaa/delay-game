# Patch 23：事件零和重平衡

> 前置：Patch 01-22 已完成
> 规则：基础四维零和 = progress + morale + budget + bossTrust ≈ 0（容差 ±3）
> qualityDebt 和 hidden 不参与零和

---

## 一、零和规则

```
1. 每个选项的 progress + morale + budget + bossTrust 之和 ∈ [-5, +3]
2. 不存在纯收益选项（sum ≥ +5）
3. 不存在纯亏损选项（sum ≤ -8）
4. qualityDebt 是"未来的代价"，不参与当期零和
5. hidden 五维是隐性代价/收益，不参与当期零和
6. 同一事件的三个选项之间，不应有明显的"最优解"
7. bossTrust 原来几乎不用（83 选项中只有 3 个），本 patch 大幅增加
```

---

## 二、EVENTS 重平衡

### 2.1 dreamer — 幻想家

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 好主意！加进去！ | p-2,m-12,b+12 | -2 | p-3,m-5,b+8,bT+1 | +1 |
| C2 | 先写进愿望清单 | p+6,m-2,b+6,bT-1 | +9 | p+3,m-4,b-1,bT-2 | -4 |
| C3 | 做完核心玩法再说 | p+5,m+5,b+0 | +10 | p+2,m+5,b-5,bT-1 | +1 |

附加：C1 qualityDebt:8 hidden:{judgment:-1} | C2 hidden:{honesty:1} | C3 hidden:{judgment:1,quality:1}
C3 result 改：「幻想家郁闷地走了。团队很欣赏你的坚定。但上面觉得你不愿突破。」

### 2.2 impulse — 灵机一动

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 好！美术程序都动起来！ | p0,m-10,b+10 | 0 | p-2,m-8,b+10,bT+1 | +1 |
| C2 | 做个可行性评估 | p0,m0,b-5 | -5 | p-1,m-2,b-4,bT+3 | -4 |
| C3 | 我们有自己的方向，专注 | p+3,m-10,b+0 | -7 | p+3,m-6,b-2,bT+1 | -4 |

附加：C1 qualityDebt:5 hidden:{judgment:-1} | C2 hidden:{judgment:1,honesty:1} | C3 hidden:{judgment:1}

### 2.3 castle — 空中楼阁

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 全员停下来做Demo | p-8,m-5,b+25 | +12 | p-8,m-3,b+12,bT+2 | +3 |
| C2 | 据理力争拒绝 | p+2,m+5,b-15 | -8 | p+2,m+5,b-12,bT+2 | -3 |
| C3 | 把现有进度包装成Demo | p-2,m+5,b+10 | +13 | p-3,m+3,b+3,bT-2 | +1 |

附加：C1 qualityDebt:20 hidden:{honesty:-1} | C2 hidden:{honesty:1,grit:1} | C3 qualityDebt:8 hidden:{honesty:-1}
C1 result 改：「预算到手了——虽然没要的那么多。核心问题被埋进去，以后会爆的。」

### 2.4 paratrooper — 伞兵

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 当然！洗耳恭听！ | p-8,m-8,b+10 | -6 | p-6,m-6,b+8,bT+3 | -1 |
| C2 | 先完成当前里程碑再谈 | p+10,m0,b+0 | +10 | p+5,m-3,b-3,bT-3 | -4 |
| C3 | 邀请他深入了解实际现状 | p+5,m+5,b+0 | +10 | p+2,m+3,b-3,bT-1 | +1 |

附加：C1 qualityDebt:5 hidden:{grit:-1} | C2 hidden:{grit:1} | C3 hidden:{people:1}
C2 result 改：「争取到了缓冲期。但他记住这事了。从此看你的眼神都多了三分敌意。预算也被卡了。」

### 2.5 perfectionist — 完美主义

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 重构！代码质量第一！ | p-10,m+15,b-10 | -5 | p-8,m+10,b-8,bT+1 | -5 |
| C2 | 局部重构最关键的部分 | p-3,m+8,b-5 | 0 | p-3,m+5,b-5,bT+1 | -2 |
| C3 | 先上线，后续版本再还债 | p+4,m-15,b+0 | -11 | p+5,m-8,b+3,bT+2 | +2 |

附加：C1 qualityDebt:-10 hidden:{quality:1} | C2 qualityDebt:-3 hidden:{quality:1} | C3 qualityDebt:10 hidden:{honesty:-1}
C3 result 改：「程序组心碎，但项目在往前走。上面挺满意的。」

### 2.6 preacher — 布道者

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 全员参加！规范很重要！ | p-4,m+8,b-10 | -6 | p-4,m+5,b-8,bT+2 | -5 |
| C2 | 出个简版规范就好 | p-1,m-2,b-3 | -6 | p-1,m-2,b-3,bT+1 | -5 |
| C3 | 这个阶段结束了再搞 | p+3,m-8,b+0 | -5 | p+3,m-5,b+0,bT-1 | -3 |

附加：C1 hidden:{quality:1} | C2 hidden:{judgment:1} | C3 hidden:{quality:-1}

### 2.7 firefighter — 救火队（原全亏，最严重）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 以大局为重，送人 | p-10,m-12,b+0 | -22 | p-8,m-5,b+8,bT+3 | -2 |
| C2 | 据理力争，只给20% | p-4,m-5,b-5 | -14 | p-3,m+2,b-5,bT+1 | -5 |
| C3 | 换延期批复+资源补偿 | p-2,m-3,b+12 | +7 | p-2,m-2,b+8,bT-2 | +2 |

附加：C1 hidden:{grit:-1} | C2 hidden:{grit:1} | C3 hidden:{judgment:1}
C1 result 改：「美术走了，但上面记了你的配合。给了点预算补偿。三个月的空档期，还是很难熬。」
C2 result 改：「谈判部分成功，损失减半。上面不太高兴，但团队知道你替他们争取了。」

### 2.8 quitter — 减员

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 升职加薪挽留！ | p+2,m+8,b-18 | -8 | p+2,m+6,b-15,bT-1 | -8 |
| C2 | 祝福他，认真做好交接 | p-4,m-3,b-5 | -12 | p-2,m-3,b-5,bT+3 | -7 |
| C3 | 给他批一个月调整假 | p-2,m+15,b-10 | +3 | p-2,m+10,b-8,bT-1 | -1 |

附加：C1 hidden:{people:1} | C2 hidden:{honesty:1,people:1} | C3 hidden:{people:1,grit:1}
C1 sum=-8 在容差边界。理由：花大钱留人，预算亏损确实是最突出的代价。
C2 result 改：「交接花了三周，新人熟悉又花了一个月。人走了，活儿耽误了。但上面说处理得体。」

### 2.9 blamer — 甩锅侠（原两选纯亏）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 站程序：策划需求要更清晰 | p0,m-12,b+0 | -12 | p+2,m-8,b+2,bT-1 | -5 |
| C2 | 站策划：程序要主动沟通 | p-2,m-8,b+0 | -10 | p0,m-6,b+3,bT-2 | -5 |
| C3 | 拉双方当面对齐，建沟通机制 | p-4,m+10,b-5 | +1 | p-3,m+8,b-5,bT+1 | +1 |

附加：C1 hidden:{people:-1} | C2 hidden:{people:-1} | C3 hidden:{people:1,judgment:1}
C1 result 改：「策划崩溃。进度正常推进，但他们开始消极怠工。上面觉得你偏心。」

### 2.10 cowboy — 自由发挥

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 哇好酷！就用这个！ | p-6,m+15,b-8 | +1 | p-5,m+10,b-8,bT+1 | -2 |
| C2 | 先完成需求，创意留下个版本 | p+4,m-12,b+0 | -8 | p+4,m-8,b+0,bT+1 | -3 |
| C3 | 保留方向但加基础UI引导 | p-2,m+5,b-5 | -2 | p-2,m+3,b-3,bT+1 | -1 |

附加：C1 qualityDebt:5 hidden:{quality:-1} | C2 hidden:{judgment:1} | C3 qualityDebt:2 hidden:{judgment:1,quality:1}

### 2.11 legacy — 屎山

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 重写！不在屎山上建高楼！ | p-9,m+10,b-10 | -9 | p-7,m+8,b-8,bT+2 | -5 |
| C2 | 小步带防护地改，写测试覆盖 | p-3,m+3,b-5 | -5 | p-2,m+2,b-3,bT+1 | -2 |
| C3 | 这个功能砍掉，规避问题 | p+3,m-10,b+5 | -2 | p+3,m-6,b+3,bT-1 | -1 |

附加：C1 qualityDebt:-10 hidden:{quality:1,grit:1} | C2 qualityDebt:-3 hidden:{quality:1} | C3 qualityDebt:15 hidden:{honesty:-1}

### 2.12 visionary — 远见

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 太有远见了！做！ | p-10,m+15,b-15 | -10 | p-8,m+10,b-12,bT+3 | -7 |
| C2 | 先做够用的版本，扩展性以后再说 | p+4,m-10,b+0 | -6 | p+4,m-6,b-2,bT+1 | -3 |
| C3 | 保留架构思路，但砍到MVP | p-2,m+5,b-5 | -2 | p-1,m+3,b-3,bT+2 | +1 |

附加：C1 qualityDebt:5 hidden:{quality:-1} | C2 hidden:{judgment:1} | C3 qualityDebt:3 hidden:{judgment:1,quality:1}
C1 sum=-7 超容差。理由：最激进选择，叙事上"三个月没产出"，纯亏应重。但 bT+3 补偿——boss对远景兴奋。净效果="把政治资本和预算都压在一个承诺上"。

### 2.13 meeting — 铁头功

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 全参加！保持信息同步！ | p-5,m+8,b+0 | +3 | p-4,m+5,b+0,bT+1 | +2 |
| C2 | 只参关键会，其余授权组长 | p+1,m-3,b+0 | -2 | p+2,m-3,b+0,bT-1 | -2 |
| C3 | 推行异步更新机制，减少会议 | p+3,m-8,b-8 | -13 | p+2,m-4,b-3,bT+1 | -4 |

附加：C1 hidden:{people:1} | C2 hidden:{judgment:1} | C3 hidden:{grit:1}

### 2.14 thunder — 雷公

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 停工等待恢复 | p-8,m+8,b+0 | 0 | p-6,m+5,b+0,bT-2 | -3 |
| C2 | 能做什么做什么 | p-3,m-5,b-5 | -13 | p-1,m-3,b-3,bT+2 | -5 |
| C3 | 租云端开发环境保效率 | p-1,m+10,b-18 | -9 | p0,m+8,b-12,bT+2 | -2 |

附加：C1 hidden:{grit:-1} | C2 hidden:{grit:1} | C3 hidden:{people:1,judgment:1}

### 2.15 water_reveal — 进度修正（原全亏）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 召集团队重新对齐真实进度 | p-8,m-5,b+0,bT+1 | -12 | p-5,m-5,b+3,bT+3 | -4 |
| C2 | 私下找主程重新评估 | p-5,m+0,b-5 | -10 | p-3,m+0,b-3,bT+2 | -4 |
| C3 | 默默调整内心预期 | p-3,m+3,b+0 | 0 | p-2,m+2,b+0,bT-2 | -2 |

附加：C1 hidden:{honesty:1,grit:1} | C2 qualityDebt:10 hidden:{honesty:1} | C3 qualityDebt:5 hidden:{honesty:-1}

### 2.16 corp_kpi — KPI季（原C1纯亏，C3纯赚）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 全员认真填，合规为上 | p-3,m-8,b+0 | -11 | p-2,m-5,b+2,bT+3 | -2 |
| C2 | 复制去年的改改 | p-1,m-3,b+0 | -4 | p0,m-2,b+0,bT-1 | -3 |
| C3 | 你来填，让团队继续开发 | p-2,m+8,b+0 | +6 | p+1,m+5,b-3,bT-2 | +1 |

附加：C1 hidden:{honesty:1} | C2 hidden:{honesty:-1} | C3 hidden:{people:1,grit:1}

### 2.17 corp_approval — 18层审批（原C1/C2纯亏）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 走完全流程，合规操作 | p-5,m-5,b+0 | -10 | p-4,m-3,b+0,bT+3 | -4 |
| C2 | 找关键人直接拍板 | p-2,m+0,b-8 | -10 | p-1,m+0,b-5,bT-1 | -7 |
| C3 | 先做，边走流程边推进 | p+2,m-5,b+0 | -3 | p+2,m-3,b+0,bT-2 | -3 |

附加：C1 hidden:{honesty:1} | C2 hidden:{honesty:-1,grit:1} | C3 qualityDebt:3 hidden:{honesty:-1}
C2 sum=-7 超容差。理由：走捷径需要花钱+得罪人，但省时间。这是"政治代价换进度"的典型权衡。

### 2.18 market_trend — 跟风热

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 全力融入，方向转型 | p-9,m+5,b-10 | -14 | p-6,m+3,b-5,bT+2 | -6 |
| C2 | 表面融入，加个「探索模式」 | p-4,m-3,b-5 | -12 | p-2,m-2,b-3,bT+1 | -6 |
| C3 | 礼貌拒绝，坚守核心方向 | p+1,m-8,b+0 | -7 | p+2,m-5,b+0,bT-2 | -5 |

附加：C1 qualityDebt:8 hidden:{judgment:-1} | C2 qualityDebt:5 hidden:{honesty:-1} | C3 hidden:{judgment:1,grit:1}

### 2.19 bet_deal — 对赌协议（原C1/C2纯亏）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 召开全员会议，稳定军心 | p-2,m-8,b+0 | -10 | p-1,m-5,b+0,bT+2 | -4 |
| C2 | 加大画饼，许诺上线奖励 | p0,m-5,b+0 | -5 | p+1,m-3,b+0,bT-2 | -4 |
| C3 | 自掏腰包补贴几个核心成员 | p+1,m+8,b-15 | -6 | p+1,m+8,b-15,bT+2 | -4 |

附加：C1 hidden:{people:1} | C2 qualityDebt:3 hidden:{honesty:-1} | C3 hidden:{people:1,grit:1}

### 2.20 stock_trap — 股票绑架

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 留住他，给他更好的条件 | p+2,m-5,b-15 | -18 | p+1,m-3,b-10,bT-1 | -13→改 |
| C2 | 放他走，快速启动交接 | p-4,m+5,b-5 | -4 | p-2,m+3,b-3,bT+2 | 0 |
| C3 | 帮他争取调岗，换个环境再撑撑 | p-3,m+8,b+0 | +5 | p-2,m+5,b+0,bT-2 | +1 |

C1 重做：p+1,m-2,b-8,bT+3 → -6。理由：留人=花预算+低状态换老板好感
附加：C1 qualityDebt:3 hidden:{people:1} | C2 hidden:{honesty:1,people:1} | C3 hidden:{people:1}
C1 result 改：「他留下来了，状态还是不太好。但上面觉得你留住了关键人才。」

### 2.21 brooks_law — 救场招人（原全亏）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 大量招人，相信人海战术 | p-6,m-8,b-15 | -29 | p-4,m-5,b-10,bT+3 | -6 |
| C2 | 只招一个最关键岗位 | p-3,m-3,b-8 | -14 | p-1,m-2,b-5,bT+2 | -2 |
| C3 | 不招人，靠现有团队硬扛 | p+2,m-10,b+0 | -8 | p+3,m-6,b+0,bT-1 | -4 |

附加：C1 qualityDebt:5 hidden:{judgment:-1} | C2 hidden:{judgment:1} | C3 qualityDebt:3 hidden:{grit:1}
C1 result 改：「新人带教拖慢了节奏。但老板满意你响应迅速。四周后才看到效果。」

### 2.22 kpi_review — KPI施压

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 拍胸脯保证，完不成自罚 | p0,m-5,b+0 | -5 | p+1,m-5,b+0,bT+3 | -1 |
| C2 | 如实分析风险，提出可达目标 | p+2,m+5,b+0,bT+1 | +8 | p+1,m+3,b-2,bT+1 | +3 |
| C3 | 用漂亮的PPT转移注意力 | p-2,m+3,b-5 | -4 | p-1,m+2,b-3,bT-1 | -3 |

附加：C1 qualityDebt:5 hidden:{honesty:-1} | C2 hidden:{honesty:1,grit:1} | C3 qualityDebt:3 hidden:{honesty:-1}
C1 result 改：「领导满意地点头。团队听说了，集体沉默。你用承诺换了信任。」

### 2.23 manpower — 人海战术（原C2纯赚）

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 好，全部招进来 | p-5,m-5,b+15 | +5 | p-3,m-3,b+10,bT+2 | +6→改 |
| C2 | 人不是越多越好，我只招2个关键岗位 | p+5,m+5,b+0 | +10 | p+3,m+2,b-2,bT-1 | +2 |

C1 重做：p-3,m-2,b+8,bT+1 → +4。理由：招多人拿预算但进度和士气都有代价。不过这个选项的"纯收益"叙事是合理的——老板高兴给你预算——所以 sum 可以略正。
附加：C1 qualityDebt:5 hidden:{judgment:-1} | C2 hidden:{judgment:1}
C2 result 改：「老板接受了你的精打细算。花了点政治资本，至少把规模压下来了。预算也被卡了一点。」

---

## 三、MILESTONE_EVENTS 重平衡（5 个事件，15 个选项）

### 3.1 Month 1 — 立项启动评审

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 展示这个能跑的版本 | p0,m+5,b+5 | +10 | p0,m+3,b+3,bT+2 | +8→改 |
| C2 | 如实说明当前进度和风险 | p-3,m+3,b+0 | 0 | p-2,m+2,b+0,bT+1 | +1 |
| C3 | 先找人确认这个版本有多少是真实的 | p-2,m+0,b+0 | -2 | p-1,m-1,b+0,bT+1 | -1 |

C1 重做：p+1,m+3,b+3,bT-2 → +5→仍偏正。再改：p0,m+2,b+2,bT-1 → +3。理由：展示跑得通的版本=赚预算+士气但上面其实半信半疑。
附加：C1 qualityDebt:3 hidden:{honesty:-1} | C2 hidden:{honesty:1} | C3 hidden:{judgment:1}

### 3.2 Month 2 — MVP 评审

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 逐条解释，打消疑虑 | p0,m+3,b+3 | +6 | p0,m+2,b+2,bT-1 | +3 |
| C2 | 承认部分问题，给出修复计划 | p-4,m+5,b+0 | +1 | p-3,m+3,b+0,bT+2 | +2 |
| C3 | 先确认这十分钟他没玩到的地方是什么情况 | p-2,m+0,b+0 | -2 | p-1,m-1,b+0,bT+1 | -1 |

附加：C1 qualityDebt:3 hidden:{honesty:-1} | C2 hidden:{honesty:1,grit:1} | C3 hidden:{judgment:1}

### 3.3 Month 3 — 基础闭环评审

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 先开会，QA的问题会后再处理 | p0,m+0,b+5 | +5 | p0,m-2,b+5,bT+1 | +4→改 |
| C2 | 推迟汇报，先处理QA问题 | p-5,m+3,b+0 | -2 | p-4,m+3,b+0,bT+2 | +1 |
| C3 | 让心腹先看一下QA报告里哪些是真正的问题 | p-2,m+0,b+0 | -2 | p-1,m-1,b+0,bT+1 | -1 |

C1 重做：p0,m-2,b+3,bT-1 → 0。理由：开会顺利但压问题=代价在后头。
附加：C1 qualityDebt:5 hidden:{honesty:-1} | C2 hidden:{honesty:1,quality:1} | C3 qualityDebt:3 hidden:{judgment:1}

### 3.4 Month 4 — 内容量产评审

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 确认数字，继续推进 | p0,m+3,b+3 | +6 | p0,m+2,b+2,bT-1 | +3 |
| C2 | 要求重新核查内容完成标准 | p-8,m+5,b+0 | -3 | p-6,m+3,b+0,bT+2 | -1 |
| C3 | 先回那条私信，问清楚 | p-3,m+0,b+0 | -3 | p-2,m-1,b+0,bT+1 | -2 |

附加：C1 qualityDebt:8 hidden:{honesty:-1} | C2 hidden:{honesty:1,quality:1} | C3 hidden:{judgment:1}
C1 result 改：「58%通过了。你没有去追那条私信。上面也没追。」

### 3.5 Month 5 — 整体验收评审

| # | text | 原effects | 原sum | 新effects | 新sum |
|---|------|-----------|-------|-----------|-------|
| C1 | 接受反馈，承诺全部修改 | p-5,m-5,b+5 | -5 | p-4,m-3,b+3,bT+2 | -2 |
| C2 | 区分必改和不改，谈判范围 | p-3,m+3,b+0 | 0 | p-2,m+3,b+0,bT-1 | 0 |
| C3 | 先私下确认团队能做到哪些 | p-2,m+0,b+0 | -2 | p-1,m-1,b+0,bT+1 | -1 |

附加：C1 qualityDebt:5 hidden:{honesty:-1} | C2 hidden:{judgment:1,grit:1} | C3 qualityDebt:3 hidden:{judgment:1}

---

## 四、DIRECTION_SPECIFIC_EVENTS 补充（patch-20 新增事件）

### 4.1 dir_openworld_scope — 范围蔓延

| # | 原effects | 原sum | 新effects | 新sum |
|---|-----------|-------|-----------|-------|
| C1 | p-5,b-15,qD15 | -20 | p-5,m-3,b-10,bT+3 | -15→改 |

C1 重做：p-5,m-3,b-8,bT+2 → -14→仍太亏。再改：p-4,m-2,b-5,bT+3 → -8→仍亏。最终：p-3,m-2,b-5,bT+3 → -7。
理由：全做=老板最开心但代价巨大。sum 偏负合理但需 bossTrust 大幅补偿。

| # | 新effects | 新sum |
|---|-----------|-------|
| C1 | p-3,m-2,b-5,bT+3 | -7 |
| C2 | p+3,m-8,qD3 | p+3,m-5,b+0,bT-2 | -4 |
| C3 | p+5,m+3,qD8 | p+3,m+2,b-3,bT-1 | +1 |

C2 新增 bT-2：砍区域=老板不开心。
C3 新增 b-3,bT-1：表面好看但预算也多花了，老板有微词。

### 4.2 dir_br_rival — 对手抢先

| # | 原effects | 原sum | 新effects | 新sum |
|---|-----------|-------|-----------|-------|
| C1 | p+8,m-10,qD12 | p+6,m-8,b+0,bT+2 | 0 |
| C2 | m+5,bT-1 | p-2,m+3,b+0,bT-1 | 0 |
| C3 | p-5,m+3,b-8 | p-4,m+2,b-5,bT+1 | -6 |

C1：赶工有进度+老板满意但团队崩溃。原 p+8 改 p+6（赶工不可能完美），加 bT+2（老板满意你快）。
C2：品质优先。原 morale+5 改 m+3（也有代价=晚了被市场抢），加 p-2（进度落后）。bT-1 保留。
C3：差异化。p-4（砍内容），b-5（开发新方向花钱），bT+1（老板觉得你有想法）。

---

## 五、patch-22 新增事件复核

### 5.1 team_shortage — 人手不足

| # | 原effects | 原sum | 新effects | 新sum |
|---|-----------|-------|-----------|-------|
| C1 | p+3,m-8,qD10 | p+3,m-5,b+0,bT-1 | -3 |
| C2 | b-15,m+3 | p+1,m+3,b-12,bT+1 | -7→改 |

C2 重做：p0,m+3,b-8,bT+1 → -4。理由：招人花钱但还没到位，进度不该动。

| # | 新effects | 新sum |
|---|-----------|-------|
| C1 | p+3,m-5,b+0,bT-1 | -3 |
| C2 | p0,m+3,b-8,bT+1 | -4 |
| C3 | p-5,m+3,qD-5 | p-5,m+3,b+0,bT+2 | 0 |

C3 新增 bT+2：砍需求=老板可能不高兴但至少你有计划。

### 5.2 team_overcrowd — 人浮于事

| # | 原effects | 原sum | 新effects | 新sum |
|---|-----------|-------|-----------|-------|
| C1 | m-10,b+8 | m-8,b+8,bT+1 | +1 |
| C2 | p+5,b-8,qD5 | p+3,m-2,b-5,bT-1 | -5 |
| C3 | m-3,b-5 | m-3,b-5,bT+1 | -7→改 |

C3 重做：m-2,b-3,bT+1 → -4。理由：不管=轻度消耗但也在消耗政治资本（老板看见闲人）。
C1 新增 bT+1：裁员=老板觉得你有管理魄力。
C2 降 p+5→p+3 加 m-2：副项目分散注意力。

---

## 六、TRUST_DECAY_EVENTS（2 个单选项事件）

这两个是纯被动事件（bossTrust-1），不是策略选择，不适用零和规则。保留不动。

---

## 七、bossTrust 使用频率统计

原代码：83 个选项中仅 3 个用 bossTrust（dreamer C2:-1, water_reveal C1:+1, kpi_review C2:+1）
本 patch 后：83 个选项中约 45 个使用 bossTrust

新增 bossTrust 的叙事逻辑：
- 顺从上级/配合上级意图 → bT 正
- 抗拒/推回/砍需求 → bT 负
- 诚实暴露问题 → bT 正（短期代价换长期信任）
- 糊弄/敷衍 → bT 负（短期安全长期风险）
- 花预算解决问题 → bT 视情况（老板看结果）

---

## 八、实现提示词

1. 逐事件替换 effects 对象。按本 spec 二至五节的表格，将 delay-game.jsx 中对应事件的 choices 数组里每个 effects 替换为新值。

2. 添加 missing 字段：原代码中没有 bossTrust/qualityDebt/hidden 的选项，按 spec 补充。

3. 更新 result 文案：本 spec 标注了「result 改」的选项，替换对应 result 字符串。

4. 不改事件结构（id/name/emoji/color/tagline/situation/dialogue 不动），只改 choices 内的 effects/result 和新增 hidden 字段。

5. 不改 pickEvent、handleChoice 逻辑——patch-21 已处理 hidden 字段的通用解析。

6. 按事件逐个替换，不要批量正则替换，避免误伤。

**验证点：**
- [ ] 每个 EVENTS 选项的 p+m+b+bT 之和 ∈ [-8, +3]
- [ ] 无纯收益选项（sum ≥ +5）
- [ ] 无纯亏损选项（sum ≤ -10）
- [ ] firefighter 三个选项都有正有负
- [ ] brooks_law 三个选项都有正有负
- [ ] paratrooper C2 不再是白送选项
- [ ] dreamer C3 不再是白送选项
- [ ] manpower C2 不再是白送选项
- [ ] milestone 1 C1 不再是白送选项
- [ ] bossTrust 在超过 50% 的选项中出现
- [ ] 所有新增 hidden 字段在 handleChoice 中被正确处理

---

## 九、本 patch 不实现

- 事件文案全面重写（只改标注的 result，不改 situation/dialogue）
- 新增事件（只平衡现有事件）
- 结局条件调整（零和改了数值但结局阈值待手感测试后调整）
- 事件触发权重调整

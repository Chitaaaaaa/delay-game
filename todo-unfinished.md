# 未完成事项 TODO

## 🔴 核心缺失（影响游戏可玩性）

- [x] ~~**预算每周/每月固定消耗**~~：Patch 19 已实现
- [x] ~~**士气自然衰减**~~：Patch 19 已实现
- [x] ~~**完美结局/隐藏结局条件**~~：Patch 19 隐性积分已实现
- [ ] **事件极化改造**：→ patch-23 spec 已写（全量零和重平衡，83选项）
- [ ] 诚实分迟滞惩罚回路 → patch-24 spec 已写（bossTrust衰减+信息失真+pickEvent权重+honesty_bonus）
- [ ] 每方向第2个专属事件 → patch-25 spec 已写（10个方向各第2事件）
- [ ] T3级背景bonus → patch-26 spec 已写（地产+SLG firefighter额外选项、金融+MINI_GAME预算精确显示）
## 🟡 框架已定义但未接入

- [ ] **TeamSlot完整系统**（patch-08）：校招/社招/清洗行动的UI和逻辑未实现
- [x] ~~**背景职能×方向解锁**（patch-18）~~：patch-20 spec 已写，待实现
- [x] ~~**年份文案填充**（patch-10/18）~~：content-writing.md 已填完
- [ ] **KPI松紧×事件权重联动**（patch-11）：loose/tight对事件池权重的±30%修正没接入
- [ ] **milestone对赌检查**（patch-11）：每月进度增量vs目标增量的自动检查与kpiState联动
- [ ] **IP方保护型第三选项**（patch-11）：资源掠夺事件的"IP方介入"选项没做

## 🟢 内容待填充（框架在，肉没填）

- [x] ~~**各品类专属事件池**（patch-18）~~：patch-20 已写10个方向的第1个事件，patch-25 已写第2事件
- [ ] **跨行业专属事件选项**（patch-15）：地产/影视/区块链的预算谈判、幻想家事件第四选项等（部分已实现：realestate/film/blockchain 的 getIndustryBackgroundChoices，MCN/教培的部分逻辑）
- [ ] **质量债覆盖更多触发点**（patch-09/14）：很多事件/行动的qualityDebt没挂上（patch-20的10个新事件已带qualityDebt）
- [x] ~~**TeamSlot产出系数接入**（patch-08）~~：patch-22 spec 已设计（sweetSpot/minViable/overcrowd + 方向倍率）
- [ ] **方向×预算消耗倍率接入**（patch-22）：budgetDrainMultiplier 未接入代码
- [ ] **核心团队/项目团队UI双显**（patch-22）：spec 已写，待实现

## 📝 设计待讨论

- [x] ~~预算消耗节奏选型~~：Patch 19 采用了加速消耗方案（月1-2: -2/周, 月3-4: -4/周, 月5-6: -6/周）
- [x] ~~士气衰减是否与qualityDebt/团队规模挂钩~~：Patch 19 统一衰减公式已实现
- [x] ~~完美结局的隐性条件清单~~：Patch 19 五维度隐性积分系统已实现
- [ ] 事件极化改造的优先级和范围 → patch-23 spec 已写全量零和重平衡
- [x] ~~诚实分迟滞惩罚回路~~ → patch-24 spec 已写
- [x] ~~每方向第2个专属事件~~ → patch-25 spec 已写
- [x] ~~T3级背景bonus~~ → patch-26 spec 已写
- [ ] 初始预算按方向自动调整（OPENWORLD起始应更高——待手感测试）
- [ ] 方向锁定后角色推荐提示

# Patch 23 执行版：事件零和重平衡

> 规则：progress + morale + budget + bossTrust 之和 ∈ [-8, +3]
> qualityDebt 和 hidden 不参与零和
> 只改 choices 内的 effects/result/hidden，不改 id/name/emoji/color/tagline/situation/dialogue

---

## 一、EVENTS 数组（line 512-760）

### 1. dreamer（line 513）

C1: effects: { progress: -3, morale: -5, budget: 8, bossTrust: 1, qualityDebt: 8 }, hidden: { judgment: -1 }
C2: effects: { progress: 3, morale: -4, budget: -1, bossTrust: -2 }, hidden: { honesty: 1 }
C3: effects: { progress: 2, morale: 5, budget: -5, bossTrust: -1 }, hidden: { judgment: 1, quality: 1 }
C3 result: "幻想家郁闷地走了。团队很欣赏你的坚定。但上面觉得你不愿突破。"

### 2. impulse（line 524）

C1: effects: { progress: -2, morale: -8, budget: 10, bossTrust: 1, qualityDebt: 5 }, hidden: { judgment: -1 }
C2: effects: { progress: -1, morale: -2, budget: -4, bossTrust: 3 }, hidden: { judgment: 1, honesty: 1 }
C3: effects: { progress: 3, morale: -6, budget: -2, bossTrust: 1 }, hidden: { judgment: 1 }

### 3. castle（line 535）

C1: effects: { progress: -8, morale: -3, budget: 12, bossTrust: 2, qualityDebt: 20 }, hidden: { honesty: -1 }
C1 result: "预算到手了——虽然没要的那么多。核心问题被埋进去，以后会爆的。"
C2: effects: { progress: 2, morale: 5, budget: -12, bossTrust: 2 }, hidden: { honesty: 1, grit: 1 }
C3: effects: { progress: -3, morale: 3, budget: 3, bossTrust: -2, qualityDebt: 8 }, hidden: { honesty: -1 }

### 4. paratrooper（line 546）

C1: effects: { progress: -6, morale: -6, budget: 8, bossTrust: 3, qualityDebt: 5 }, hidden: { grit: -1 }
C2: effects: { progress: 5, morale: -3, budget: -3, bossTrust: -3 }, hidden: { grit: 1 }
C2 result: "争取到了缓冲期。但他记住这事了。从此看你的眼神都多了三分敌意。预算也被卡了。"
C3: effects: { progress: 2, morale: 3, budget: -3, bossTrust: -1 }, hidden: { people: 1 }

### 5. perfectionist（line 557）

C1: effects: { progress: -8, morale: 10, budget: -8, bossTrust: 1, qualityDebt: -10 }, hidden: { quality: 1 }
C2: effects: { progress: -3, morale: 5, budget: -5, bossTrust: 1, qualityDebt: -3 }, hidden: { quality: 1 }
C3: effects: { progress: 5, morale: -8, budget: 3, bossTrust: 2, qualityDebt: 10 }, hidden: { honesty: -1 }
C3 result: "程序组心碎，但项目在往前走。上面挺满意的。"

### 6. preacher（line 568）

C1: effects: { progress: -4, morale: 5, budget: -8, bossTrust: 2 }, hidden: { quality: 1 }
C2: effects: { progress: -1, morale: -2, budget: -3, bossTrust: 1 }, hidden: { judgment: 1 }
C3: effects: { progress: 3, morale: -5, budget: 0, bossTrust: -1 }, hidden: { quality: -1 }

### 7. firefighter（line 579）

C1: effects: { progress: -8, morale: -5, budget: 8, bossTrust: 3 }, hidden: { grit: -1 }
C1 result: "美术走了，但上面记了你的配合。给了点预算补偿。三个月的空档期，还是很难熬。"
C2: effects: { progress: -3, morale: 2, budget: -5, bossTrust: 1 }, hidden: { grit: 1 }
C2 result: "谈判部分成功，损失减半。上面不太高兴，但团队知道你替他们争取了。"
C3: effects: { progress: -2, morale: -2, budget: 8, bossTrust: -2 }, hidden: { judgment: 1 }

### 8. quitter（line 590）

C1: effects: { progress: 2, morale: 6, budget: -15, bossTrust: -1 }, hidden: { people: 1 }
C2: effects: { progress: -2, morale: -3, budget: -5, bossTrust: 3 }, hidden: { honesty: 1, people: 1 }
C2 result: "交接花了三周，新人熟悉又花了一个月。人走了，活儿耽误了。但上面说处理得体。"
C3: effects: { progress: -2, morale: 10, budget: -8, bossTrust: -1 }, hidden: { people: 1, grit: 1 }

### 9. blamer（line 601）

C1: effects: { progress: 2, morale: -8, budget: 2, bossTrust: -1 }, hidden: { people: -1 }
C1 result: "策划崩溃。进度正常推进，但他们开始消极怠工。上面觉得你偏心。"
C2: effects: { progress: 0, morale: -6, budget: 3, bossTrust: -2 }, hidden: { people: -1 }
C3: effects: { progress: -3, morale: 8, budget: -5, bossTrust: 1 }, hidden: { people: 1, judgment: 1 }

### 10. cowboy（line 612）

C1: effects: { progress: -5, morale: 10, budget: -8, bossTrust: 1, qualityDebt: 5 }, hidden: { quality: -1 }
C2: effects: { progress: 4, morale: -8, budget: 0, bossTrust: 1 }, hidden: { judgment: 1 }
C3: effects: { progress: -2, morale: 3, budget: -3, bossTrust: 1, qualityDebt: 2 }, hidden: { judgment: 1, quality: 1 }

### 11. legacy（line 623）

C1: effects: { progress: -7, morale: 8, budget: -8, bossTrust: 2, qualityDebt: -10 }, hidden: { quality: 1, grit: 1 }
C2: effects: { progress: -2, morale: 2, budget: -3, bossTrust: 1, qualityDebt: -3 }, hidden: { quality: 1 }
C3: effects: { progress: 3, morale: -6, budget: 3, bossTrust: -1, qualityDebt: 15 }, hidden: { honesty: -1 }

### 12. visionary（line 634）

C1: effects: { progress: -8, morale: 10, budget: -12, bossTrust: 3, qualityDebt: 5 }, hidden: { quality: -1 }
C2: effects: { progress: 4, morale: -6, budget: -2, bossTrust: 1 }, hidden: { judgment: 1 }
C3: effects: { progress: -1, morale: 3, budget: -3, bossTrust: 2, qualityDebt: 3 }, hidden: { judgment: 1, quality: 1 }

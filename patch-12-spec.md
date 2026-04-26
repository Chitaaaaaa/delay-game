# Patch 12：字号与可读性优化

## 问题

当前大量文字使用 fontSize 10-11，在小屏（375px宽以下）几乎不可读。
H5移动端最低可读字号建议14px，正文16px。

## 字号映射表（全局替换）

| 当前值 | 替换为 | 用途 |
|--------|--------|------|
| fontSize: 10 | fontSize: 12 | 最小标签、hint、时间剩余 |
| fontSize: 11 | fontSize: 13 | 次要文字、按钮描述、monospace标签 |
| fontSize: 12 | fontSize: 14 | 普通正文、卡牌说明、结果文案 |
| fontSize: 13 | fontSize: 15 | 主要正文、选项按钮文字 |
| fontSize: 16 | fontSize: 17 | 小标题 |

以下字号**不动**（已经足够大）：
- fontSize: 20（月结标题）
- fontSize: 22（结局标题）
- fontSize: 32（开局卡牌emoji）
- fontSize: 40（介绍页emoji）
- fontSize: 72（结局大emoji）

## 行高补充

以下位置补充 lineHeight（当前未设置，行距过紧）：

| 位置 | 新增 lineHeight |
|------|---------------|
| 事件对话文字 | 1.7 |
| 选项按钮文字 | 1.5 |
| 结果文案段落 | 1.7 |
| stat bar 标签 | 1.4 |
| 月结文字 | 1.6 |

## 按钮内边距调整

当前按钮padding偏小，配合字号增大需要同步放大：

| 位置 | 当前 padding | 调整为 |
|------|-------------|--------|
| 选项按钮（事件响应） | padding: "8px 12px" | padding: "11px 14px" |
| 行动按钮（planning） | padding: "4px 10px" | padding: "7px 10px" |
| 工作模式切换按钮 | padding: "5px 4px" | padding: "7px 6px" |
| 加班类型按钮 | padding: "4px 6px" | padding: "7px 8px" |
| 通用确认按钮 | padding: "11px 14px" | padding: "13px 14px" |
| 开局卡牌 | padding: "16px 8px" | padding: "16px 10px" |

## 其他调整

- `fontFamily: monospace` 的位置维持不变，只改字号
- stat bar 标签（当前 fontSize 10）改为 12，标签和数值都要改
- 顶部标题栏「完蛋！我被延期包围了」从 fontSize 12 → 14，fontWeight 保持 700
- 游戏主容器 padding 从 `padding: 32` 改为 `padding: "24px 20px"`（大屏留白缩小，给文字更多横向空间）

## 不改动的内容

- 颜色系统
- 布局结构
- maxWidth: 420
- 所有游戏逻辑

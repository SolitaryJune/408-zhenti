# 408 真题动画 + 讲解 生成规范（子任务必读）

你的任务：为一批题目各写一份**文字讲解**（md）和一个**HTML 交互动画**。

## 文件输出契约（严格遵守）

- 讲解 → `/Users/a24/jiaoben/408-zhenti/data/explain/{题号}.md`，如 `data/explain/2019-12.md`
- 动画 → `/Users/a24/jiaoben/408-zhenti/anim/{题号}.html`，如 `anim/2019-12.html`
- 题号格式：`{年份}-{两位题号}`（如 2019-09）
- 除这两类文件外**不要改动其他任何文件**

## 题目数据在哪

`/Users/a24/jiaoben/408-zhenti/data/questions/{年份}.json` —— 每题字段：

- `id` 题号、`subject` 科目、`type`（choice=选择题 / essay=综合应用题）、`points` 分值
- `stemHtml` 题干（HTML）、`options` 选择题选项、`answerLetter` 选择题答案
- `refAnswerHtml` 参考答案（大题为完整解答，**讲解必须与它一致**）
- `tags` 知识点标签

## 文字讲解 data/explain/{id}.md

结构（选择题材）：

```
## 本题讲解：{一句话考点}

### 第一步：{标题}
{分析……}

### 第二步：{标题}
{分析……}

### 易错点
- **{错误做法}**：{为什么错，对应哪个干扰项}

> 一句话结论（可选）
```

要求：

1. **第一段给答案**：选择题开头写「答案：X」结论句（比如放在「结论」小节开头或末尾）。
2. 语言为中文、面向考研复习者，**教思路而非抄答案**：为什么选它、其他项错在哪。
3. 数学/算法类给出**可复现的逐步推导**（表格、状态序列）。
4. 大题（essay）按问逐问讲解，先给答题框架再填细节，与参考答案口径一致。
5. **md 语法限制**（站点渲染器只支持这些）：`##`/`###`/`####` 标题、段落、`**粗体**`、`` `行内码` ``、无序列表 `- `、有序列表 `1. `、表格 `| a | b |`、引用 `> `、`[链接](url)`。
   **禁止**：图片、嵌套列表、任务列表、脚注、html 标签、数学公式 $..$。
6. 长度 200–600 字为宜，表格式推导不限。

## HTML 动画 anim/{id}.html

### 模板选择

- **算法/过程类**（建树、排序、页替换、调度、图、树遍历、地址映射、协议时序、流水线、KMP、哈希、传输推演……）→ 复制 `tools/anim_algo_template.html`
- **概念/记忆/推理链类**（概念辨析、特性对比、协议特性、纯计算推理）→ 复制 `tools/anim_concept_template.html`

复制模板后**只修改 `AW.init({...})` 区域**（模板里有标注）。

### 硬性要求

1. 外壳必须用 `assets/anim-engine.js` + `assets/anim.css`（模板已引用），页面位于 `anim/<id>.html`，引用路径为 `../assets/...`（勿用 `../../assets/...`，会逃出站点根导致 404）。
2. **全中文**、自包含逻辑、禁止任何外部 CDN/网络请求。
3. 每步一个 snap：`cls`（ok/miss/shift/step/done）、`tag`、`log`（一句大白话说明这步发生了什么）、`count`（累计计数）、需要点亮序号带的给 `ribbon:{k, ok}`。
4. 步数 5–18 步；**最后一步必须 `done:true`**，并配 `result:{big, html}` 结论卡（含正确答案与记忆点）。
5. 涉及序列/格子/表格的演示，用引擎小工具：`AW.cellRow(chars, classes, ptrMap)`、`AW.shiftTo(el, idx, pitch)`、`AW.el(tag, cls, html)`；CSS 类 `aw-box ok|hit|miss|dim`、`aw-stepcard good|bad|key` 可直接用。
6. 颜色语义与 kmp demo 一致：绿=正确/命中、红=错误/缺页、琥珀=移位/关键、蓝=指针/普通信息。
7. 动画必须**只依据本题数据**（题干、选项、参考答案），不得引入题目外的假设；若题目有多种解法，演示最标准的一种，其余在讲解里说。

### 自检（提交前逐条过）

- [ ] `node --check` 无法检查 html，但请确认 `<script>` 无语法错误（可在文末加 `<script>/* aw-ok */</script>` 前先人工过一遍括号/引号）
- [ ] `AW.init` 里 snaps 最后一步 `done:true`
- [ ] 讲解 md 里的答案与 `answerLetter`/`refAnswerHtml` 完全一致
- [ ] 文件名与题号一致，放在正确目录

## 参考成品

- 动画金标准：`/Users/a24/jiaoben/408-zhenti/anim/2019-09.html`（自包含老版）与两个模板
- 讲解金标准：`/Users/a24/jiaoben/408-zhenti/data/explain/2019-09.md`

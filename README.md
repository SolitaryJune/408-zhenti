# 408 真题档案

自建的**计算机考研 408（数据结构 / 计算机组成原理 / 操作系统 / 计算机计算机网络）历年真题**复习站，纯静态、无登录、无后端，托管于 GitHub Pages。

> 站点地址：https://solitaryjune.github.io/408-zhenti/

## 内容规模

- 2009–2026 共 **18 套真题 × 47 题 = 846 题**（单选 720 + 综合应用 126）
- 每题配**原创文字讲解**（`data/explain/{题号}.md`）
- 每题配一个**HTML 交互动画**（`anim/{题号}.html`，统一引擎 `assets/anim-engine.js`）

## 功能

- **单题模式**：点选作答即时判分，答案 / 文字讲解 / 动画演示 / B 站解析视频四个面板
- **整卷模式**：47 题连续作答 + 计时器 + **答题卡**（已答/对/错状态格子）+ 交卷判分（含大题自评）
- **本地错题本**：答错自动记录，localStorage 保存，无需登录
- **按知识点浏览**：846 题的知识点标签与考频
- **全文搜索**：纯前端，支持题干与知识点标签匹配

## 数据来源与版权声明

- 题目内容来自全国硕士研究生统一考试计算机学科专业基础（408）**历年公开真题**；
- 文字讲解与 HTML 交互动画均为**本站原创**；
- 解析视频链接指向原作者 [Beokayy_](https://space.bilibili.com/) 的 Bilibili 公开视频，版权归原作者所有；
- 若有版权问题请联系仓库主处理。

## 本地运行 / 构建

```bash
# 全站为纯静态文件，任意静态服务器即可
python3 -m http.server 8000
# 打开 http://127.0.0.1:8000/

# 重新生成页面（改了 data/ 或模板后）
python3 tools/build_site.py

# 重新抓取/更新题库（原始数据）
python3 tools/extract.py
```

## 目录结构

```
├── index.html              首页（年份导航）
├── year/{year}/            整卷答题页 × 18
├── question/{id}/          单题页 × 846
├── knowledge/              知识点导航
├── wrongbook/              错题本（localStorage）
├── search/                 全文搜索
├── anim/{id}.html          每题交互动画 × 846
├── assets/                 样式 / 站点 JS / 动画引擎
├── data/
│   ├── questions/{year}.json   题库原始数据
│   ├── explain/{id}.md         每题原创讲解
│   └── meta.json
├── images/                 真题配图
└── tools/                  抓取脚本 / 站点生成器 / 动画模板与规范
```

#!/usr/bin/env python3
"""把 408 站所有动画（anim/*.html 与 assets/anim.css）的蓝灰调色板
统一重着色为档案室主题（米黄/墨青），与站点 UI 一致。
确定性替换，不涉及布局。运行: python3 tools/recolor_408_anims.py
"""
import re
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent

# 蓝灰(KMP demo) → 档案室(cream/teal)
MAP = {
    "#0f172a": "#1b3a4b",   # 主墨色（标题/深底）
    "#1e293b": "#173341",
    "#334155": "#213e48",
    "#475569": "#47616c",
    "#64748b": "#586e72",
    "#94a3b8": "#b9cbd0",
    "#cbd5e1": "#5a7d8c66",  # 结点/格边框
    "#e2e8f0": "#1b3a4b26",  # 一般边框
    "#eef2f7": "#1b3a4b1a",  # 日志行边框
    "#f1f5f9": "#f8edcb",    # 浅底 chips
    "#f8fafc": "#f8edcb",    # 页面/面板底
    "#eef2f7 ": "#1b3a4b1a ",
    "#2563eb": "#1b3a4b",   # 主按钮/指针
    "#dbeafe": "#d9e3df",
    "#eff6ff": "#1b3a4b14",
    "#1d4ed8": "#1b3a4b",
    "#3b82f6": "#47616c",
    "#16a34a": "#2f9e44",   # 绿（正确/命中）
    "#15803d": "#276942",
    "#14532d": "#1e4d33",
    "#dcfce7": "#2f9e4424",
    "#f0fdf4": "#f0f7e6",
    "#bbf7d0": "#2f9e4466",
    "#22c55e": "#2f9e44",
    "#dc2626": "#e63946",   # 红（错误/缺页）
    "#fee2e2": "#e6394620",
    "#fecaca": "#e6394666",
    "#b91c1c": "#a02830",
    "#fca5a5": "#e6394699",
    "#d97706": "#e07a2f",   # 琥珀（移位/关键）
    "#fef3c7": "#f8edcb",
    "#e07a2f": "#e07a2f",   # 保持
    "#a16207": "#a16207",
    "#92400e": "#92400e",
    # v2：蓝色系残留清尾（队列 chip/甘特段/高亮）
    "#bfdbfe": "#d9e3df",
    "#dbeafe": "#d9e3df",
    "#e0f2fe": "#f8edcb",
    "#f0f9ff": "#f8edcb",
    "#e0e7ff": "#f8edcb",
    "#93c5fd": "#b9cbd0",
    "#60a5fa": "#5a7d8c",
    "#3b82f6": "#47616c",
    "#1e40af": "#1b3a4b",
    "#0ea5e9": "#47616c",
    "#0284c7": "#47616c",
    "#0369a1": "#1b3a4b",
    "#fffbeb": "#f8edcb",
}

def main():
    targets = []
    anim_dir = PROJECT / "anim"
    targets += [anim_dir / f for f in anim_dir.glob("*.html")]
    targets.append(PROJECT / "assets" / "anim.css")
    changed = 0
    for f in targets:
        try:
            text = f.read_text(encoding="utf-8")
        except Exception:
            continue
        orig = text
        low = text.lower()
        for old, new in MAP.items():
            # 大小写不敏感替换（模板生成的都是小写，稳妥起见）
            text = re.sub(re.escape(old), new, text, flags=re.IGNORECASE)
            low = text.lower()
        if text != orig:
            f.write_text(text, encoding="utf-8")
            changed += 1
    print(f"重着色完成：{changed} / {len(targets)} 个文件")

if __name__ == "__main__":
    main()

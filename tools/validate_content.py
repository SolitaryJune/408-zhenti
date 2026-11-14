#!/usr/bin/env python3
"""校验 846 题的讲解与动画覆盖率和完整性。

stdout 只输出一个 JSON（供工作流门禁解析）：
  {total, ok, bad:[...]}
诊断信息走 stderr。
"""
import json
import sys
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
MIN_ANIM = 1500   # 占位页约 0.6KB，真实动画至少 1.5KB
MIN_EXPLAIN = 150


def main() -> int:
    ids = []
    for y in range(2009, 2027):
        for q in json.loads((PROJECT / "data" / "questions" / f"{y}.json").read_text(encoding="utf-8")):
            ids.append(q["id"])
    bad = []
    ok = 0
    for qid in ids:
        exp = PROJECT / "data" / "explain" / f"{qid}.md"
        anim = PROJECT / "anim" / f"{qid}.html"
        try:
            e_len = exp.stat().st_size if exp.exists() else 0
            a_len = anim.stat().st_size if anim.exists() else 0
        except OSError:
            bad.append(qid)
            continue
        problems = []
        if e_len < MIN_EXPLAIN:
            problems.append("explain缺失或过短")
        if a_len < MIN_ANIM:
            problems.append("anim缺失或为占位")
        elif a_len > MIN_ANIM and "AW.init" not in anim.read_text(encoding="utf-8", errors="ignore") \
                and "KMP" not in anim.read_text(encoding="utf-8", errors="ignore"):
            problems.append("anim未使用动画引擎")
        if problems:
            bad.append(qid)
            print(f"{qid}: {', '.join(problems)}", file=sys.stderr)
        else:
            ok += 1
    result = {"total": len(ids), "ok": ok, "bad": bad}
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""抓取 BOK408 档案室 846 道真题的 SSR 页面，解析为本地 JSON 题库。

数据来源均为公开可访问内容：题面/答案/视频链接来自每题 SSR HTML，
知识点标签来自公开的 search-index.json，配图为 /content-images/ 静态资源。

用法: python3 extract.py [--workers 16] [--cache /tmp/zhenti_pages]
输出: <project>/data/questions/{year}.json + <project>/data/meta.json + <project>/images/
"""
import argparse
import concurrent.futures as cf
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

BASE = "https://zhenti.beokayy.club"
PROJECT = Path(__file__).resolve().parent.parent
UA = {"User-Agent": "Mozilla/5.0 (compatible; 408-study-mirror/1.0)"}
YEARS = list(range(2009, 2027))


def fetch(url: str, dest: Path | None = None, tries: int = 3) -> bytes:
    last_err = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            if dest:
                dest.write_bytes(data)
            return data
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(1.5 * (i + 1))
    raise RuntimeError(f"fetch failed {url}: {last_err}")


def balanced_div(html: str, start: int) -> tuple[str, int]:
    """从 html[start] 处的 '<div' 开始做 div 配平，返回 (内层HTML, 结束位置)。"""
    assert html[start:start + 4] == "<div"
    depth, i = 0, start
    tag = re.compile(r'<div\b|</div>', re.A)
    while True:
        m = tag.search(html, i)
        if not m:
            raise ValueError("unbalanced div")
        if m.group(0) == "</div>":
            depth -= 1
            if depth == 0:
                return html[start + 5:m.start() - 1 + 1].rstrip(), m.end()
            i = m.end()
        else:
            depth += 1
            i = m.end()
            if depth == 1:
                open_end = i  # 首个 <div ...> 的结束位置之外


def inner_after(html: str, anchor: str) -> str:
    """取 anchor 所在 <div ...> 标签之后的配平内层 HTML。"""
    pos = html.find(anchor)
    if pos < 0:
        return ""
    tag_start = html.rfind("<div", 0, pos)
    inner, _ = balanced_div(html, tag_start)
    # 去掉外层 <div class="..."> 自身
    gt = inner.find(">")
    return inner[gt + 1:]


def parse_page(qid: str, html: str, tags: list[str]) -> dict | None:
    m_art = re.search(rf'<article class="question-card[^"]*" id="{qid}"[^>]*>', html)
    if not m_art:
        return None
    start = m_art.start()
    end = html.find("</article>", start)
    art = html[start:end]

    subject = (re.search(r'subject-([^ "\']+)"', art) or [None, ""])[1]
    mtype = re.search(r'<span>(选择题|综合应用题|[多单]项?选择题)</span>', art)
    qtype = mtype.group(1) if mtype else ("choice" if "choice-options" in art else "essay")
    mpts = re.search(r'>(\d+)<!-- --> 分<', art)
    points = int(mpts.group(1)) if mpts else 2

    # 题干
    stem = ""
    pos = art.find('<div class="question-body">')
    if pos >= 0:
        inner, _ = balanced_div(art, pos)
        stem = inner[inner.find(">") + 1:]

    # 选项
    options = []
    pos = art.find('<div class="choice-options"')
    if pos >= 0:
        opts_outer, _ = balanced_div(art, pos)
        for m_btn in re.finditer(r'<button class="choice-option[^"]*"[^>]*>.*?</button>', opts_outer, re.S):
            btn = m_btn.group(0)
            letter = (re.search(r'choice-letter[^>]*>([A-D])<', btn) or [None, "?"])[1]
            m_txt = re.search(r'<span class="choice-text">(.*)</span><span class="choice-mark"', btn, re.S)
            txt = m_txt.group(1) if m_txt else ""
            options.append({"letter": letter, "html": txt.strip()})

    # 答案区
    ref_html = ""
    p2 = art.find('<div class="answer-content">')
    if p2 >= 0:
        inner, _ = balanced_div(art, p2)
        ref_html = inner[inner.find(">") + 1:]
    ans_letter = None
    m_l = re.search(r'答案：([A-D])', re.sub(r'<[^>]+>', '', ref_html))
    if m_l:
        ans_letter = m_l.group(1)

    # 视频与图片
    m_v = re.search(r'class="video-link"[^>]*href="([^"]+)"', art)
    video = m_v.group(1) if m_v else None
    images = sorted(set(re.findall(r'(content-images/[a-zA-Z0-9._-]+)', art)))

    if not stem:
        return None
    return {
        "id": qid,
        "year": int(qid[:4]),
        "number": int(qid[5:]),
        "subject": subject,
        "type": "choice" if options else "essay",
        "points": points,
        "tags": tags,
        "stemHtml": stem.strip(),
        "options": options,
        "answerLetter": ans_letter,
        "refAnswerHtml": ref_html.strip(),
        "videoUrl": video,
        "images": images,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=16)
    ap.add_argument("--cache", default="/tmp/zhenti_pages")
    ap.add_argument("--years", default=",".join(map(str, YEARS)))
    args = ap.parse_args()
    years = [int(y) for y in args.years.split(",")]
    cache = Path(args.cache)
    cache.mkdir(parents=True, exist_ok=True)

    # 1) 公开清单与搜索索引 → 标签与科目
    manifest = json.loads(fetch(f"{BASE}/content-manifest.json"))
    search = json.loads(fetch(f"{BASE}{manifest['searchIndex']['path']}"))
    tags_by_id = {x["id"]: x.get("tags", []) for x in search}
    subject_by_id = {x["id"]: x.get("subject", "") for x in search}

    # 2) 并发抓取 846 页（带缓存）
    ids = [f"{y}-{n:02d}" for y in years for n in range(1, 48)]
    pages = {}

    def load(qid: str) -> tuple[str, str | None]:
        f = cache / f"{qid}.html"
        if f.exists() and f.stat().st_size > 5000:
            return qid, f.read_text(encoding="utf-8")
        try:
            data = fetch(f"{BASE}/question/{qid}")
            f.write_bytes(data)
            return qid, data.decode("utf-8")
        except Exception as e:  # noqa: BLE001
            print(f"[warn] {qid}: {e}", file=sys.stderr)
            return qid, None

    t0 = time.time()
    with cf.ThreadPoolExecutor(args.workers) as ex:
        for qid, html in ex.map(load, ids):
            pages[qid] = html
    got = sum(1 for v in pages.values() if v)
    print(f"抓取完成 {got}/{len(ids)} 页，用时 {time.time()-t0:.1f}s")

    # 3) 解析
    questions, failed = [], []
    for qid in ids:
        html = pages.get(qid)
        if not html:
            failed.append(qid)
            continue
        q = parse_page(qid, html, tags_by_id.get(qid, []))
        if q and not q["subject"]:
            q["subject"] = subject_by_id.get(qid, "")
        if q:
            questions.append(q)
        else:
            failed.append(qid)
    if failed:
        print(f"[warn] 解析失败 {len(failed)}: {failed[:10]}", file=sys.stderr)

    # 4) 图片下载
    img_urls = sorted({u for q in questions for u in q["images"]})
    img_dir = PROJECT / "images"
    img_dir.mkdir(exist_ok=True)

    def dl(u: str) -> str | None:
        name = u.split("/")[-1]
        dest = img_dir / name
        if dest.exists() and dest.stat().st_size > 0:
            return name
        try:
            fetch(f"{BASE}/{u}", dest)
            return name
        except Exception as e:  # noqa: BLE001
            print(f"[warn] image {u}: {e}", file=sys.stderr)
            return None

    t0 = time.time()
    with cf.ThreadPoolExecutor(args.workers) as ex:
        results = list(ex.map(dl, img_urls))
    ok_imgs = [n for n in results if n]
    print(f"图片下载 {len(ok_imgs)}/{len(img_urls)} 张，用时 {time.time()-t0:.1f}s")

    # 5) 输出
    data_dir = PROJECT / "data" / "questions"
    data_dir.mkdir(parents=True, exist_ok=True)
    meta_years = []
    for y in years:
        qs = [q for q in questions if q["year"] == y]
        qs.sort(key=lambda q: q["number"])
        (data_dir / f"{y}.json").write_text(
            json.dumps(qs, ensure_ascii=False, indent=1), encoding="utf-8")
        meta_years.append({"year": y, "count": len(qs)})

    subjects = sorted({q["subject"] for q in questions})
    meta = {
        "schemaVersion": 1,
        "totalQuestions": len(questions),
        "years": meta_years,
        "subjects": subjects,
        "images": ok_imgs,
    }
    (PROJECT / "data" / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")

    # 6) 质量报告
    no_ans = [q["id"] for q in questions if q["type"] == "choice" and not q["answerLetter"]]
    no_video = [q["id"] for q in questions if not q["videoUrl"]]
    print(json.dumps({
        "questions": len(questions),
        "choice": sum(1 for q in questions if q["type"] == "choice"),
        "essay": sum(1 for q in questions if q["type"] == "essay"),
        "choice_missing_answer": len(no_ans),
        "missing_video": len(no_video),
        "images": len(ok_imgs),
        "failed": failed[:20],
    }, ensure_ascii=False, indent=1))
    return 0 if not failed and not no_ans and not no_video else 1


if __name__ == "__main__":
    sys.exit(main())

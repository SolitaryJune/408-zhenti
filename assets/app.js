/* 408 真题站 · 原站同款交互：模式切换/计时/考试模式/答题卡/答案常显/判分/错题本 */
(function(){
  var LS = {
    progress: 'b408.progress',   // {qid:{pick,correct,score,at}}
    drafts: 'b408.drafts',       // {qid:letter} 未提交的选择
    wrong: 'b408.wrong',         // {qid:{n,at}}
    fav: 'b408.fav',             // [qid]
    timer: 'b408.timer',         // {year:{mode,running,base,elapsed}}
    exam: 'b408.exam',           // {year:true}
    reveal: 'b408.reveal'        // true=答案常显
  };
  function load(k, d){ try{ var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; }catch(e){ return d; } }
  function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  var progress = load(LS.progress, {});
  var drafts = load(LS.drafts, {});
  var wrong = load(LS.wrong, {});
  var fav = load(LS.fav, []);
  var year = document.body.dataset.year || null;
  var examMode = year ? !!load(LS.exam, {})[year] : false;
  var revealAlways = !!load(LS.reveal, false);

  function addWrong(qid){
    if(!wrong[qid]) wrong[qid] = {n:0, at:0};
    wrong[qid].n++; wrong[qid].at = Date.now();
    save(LS.wrong, wrong);
  }
  function syncMetaBtns(card){
    var qid = card.dataset.qid;
    var w = card.querySelector('.mistake-book-button');
    if(w){ var on = !!wrong[qid]; w.classList.toggle('on-wrong', on); w.textContent = on ? '已加错题' : '加错题'; }
    var f = card.querySelector('.favorite-button');
    if(f){ var fi = fav.indexOf(qid) >= 0; f.classList.toggle('on', fi); f.textContent = fi ? '★ 已收藏' : '☆ 收藏'; }
  }

  /* ---------- 学习区 / 答案显隐 ---------- */
  function showAnswer(card){
    var ap = card.querySelector('.answer-placeholder');
    if(ap) ap.classList.add('show');
  }
  function revealStudy(card){
    var st = card.querySelector('.study');
    if(st && !st.classList.contains('show')){
      st.classList.add('show');
      var first = st.querySelector('.study-tabs button');
      if(first) first.click();
    }
  }

  /* ---------- 选择题 ---------- */
  function setChoiceState(card, pick, graded){
    var qid = card.dataset.qid, ans = card.dataset.answer;
    var opts = card.querySelectorAll('.choice-option');
    opts.forEach(function(o){
      o.classList.remove('is-selected','is-correct','is-wrong','locked');
      o.querySelector('.choice-mark').textContent = '';
      var L = o.dataset.letter;
      if(graded){
        o.classList.add('locked');
        if(L === ans){ o.classList.add('is-correct'); o.querySelector('.choice-mark').textContent = '✓'; }
        if(L === pick && pick !== ans){ o.classList.add('is-wrong'); o.querySelector('.choice-mark').textContent = '✗'; }
      } else if(L === pick){
        o.classList.add('is-selected');
      }
    });
    var btn = card.querySelector('.reveal-button');
    if(btn && !graded){
      btn.disabled = !pick;
      btn.textContent = '提交答案';
      btn.classList.remove('is-red');
    }
  }
  function gradeChoice(card, pick){
    var qid = card.dataset.qid, ans = card.dataset.answer, pts = +card.dataset.points;
    var ok = pick === ans;
    setChoiceState(card, pick, true);
    var v = card.querySelector('.choice-verdict');
    v.className = 'choice-verdict ' + (ok ? 'ok' : 'bad');
    v.textContent = ok ? ('✓ 回答正确，+' + pts + ' 分') : ('✗ 回答错误，正确答案是 ' + ans);
    progress[qid] = {pick: pick, correct: ok, score: ok ? pts : 0, at: Date.now()};
    save(LS.progress, progress);
    delete drafts[qid]; save(LS.drafts, drafts);
    if(!ok) addWrong(qid);
    var rb = card.querySelector('.reveal-button');
    if(rb){ rb.textContent = '重做'; rb.classList.add('is-red'); rb.disabled = false; }
    showAnswer(card);
    revealStudy(card);
    sheetMark(qid);
  }

  /* ---------- 恢复答题状态 ---------- */
  function restoreCard(card){
    var qid = card.dataset.qid, type = card.dataset.type;
    var graded = progress[qid];
    if(type === 'choice'){
      if(graded && graded.pick){ setChoiceState(card, graded.pick, true); restoreVerdict(card); showAnswer(card); revealStudy(card); }
      else if(drafts[qid]){ setChoiceState(card, drafts[qid], false); }
      else if(revealAlways){ showAnswer(card); }
    } else {
      if(graded && graded.score != null){
        card.querySelector('.ref-answer').classList.add('show');
        card.querySelector('.self-score').classList.add('show');
        var rr = card.querySelector('.reveal-ref'); if(rr) rr.classList.add('hidden');
        card.querySelectorAll('.self-score button').forEach(function(x){
          x.classList.toggle('on', +x.dataset.score === graded.score);
        });
        revealStudy(card);
      } else if(revealAlways){
        var ra = card.querySelector('.ref-answer');
        if(ra){ ra.classList.add('show'); }
        var rb = card.querySelector('.reveal-ref'); if(rb) rb.classList.add('hidden');
        var ss = card.querySelector('.self-score'); if(ss) ss.classList.add('show');
      }
    }
    syncMetaBtns(card);
  }
  function restoreVerdict(card){
    var p = progress[card.dataset.qid];
    var v = card.querySelector('.choice-verdict');
    if(!v || !p) return;
    v.className = 'choice-verdict ' + (p.correct ? 'ok' : 'bad');
    v.textContent = p.correct ? ('✓ 回答正确，+' + p.score + ' 分') : ('✗ 回答错误，正确答案是 ' + card.dataset.answer);
    var rb = card.querySelector('.reveal-button');
    if(rb){ rb.textContent = '重做'; rb.classList.add('is-red'); rb.disabled = false; }
  }

  var cards = [].slice.call(document.querySelectorAll('.qcard'));
  cards.forEach(function(card){
    var qid = card.dataset.qid, type = card.dataset.type;
    var fb = card.querySelector('.favorite-button');
    if(fb) fb.addEventListener('click', function(){
      var i = fav.indexOf(qid);
      if(i >= 0) fav.splice(i, 1); else fav.push(qid);
      save(LS.fav, fav); syncMetaBtns(card);
    });
    var wb = card.querySelector('.mistake-book-button');
    if(wb) wb.addEventListener('click', function(){
      addWrong(qid); syncMetaBtns(card);
    });

    if(type === 'choice'){
      card.querySelectorAll('.choice-option').forEach(function(o){
        o.addEventListener('click', function(){
          if(o.classList.contains('locked')) return;
          drafts[qid] = o.dataset.letter; save(LS.drafts, drafts);
          setChoiceState(card, o.dataset.letter, false);
        });
      });
      var btn = card.querySelector('.reveal-button');
      if(btn) btn.addEventListener('click', function(){
        var graded = !!progress[qid];
        if(graded){ // 重做
          delete progress[qid]; save(LS.progress, progress);
          delete drafts[qid]; save(LS.drafts, drafts);
          var v = card.querySelector('.choice-verdict'); v.className = 'choice-verdict';
          setChoiceState(card, '', false);
          var ap = card.querySelector('.answer-placeholder');
          if(ap && !revealAlways) ap.classList.remove('show');
          sheetMark(qid);
        } else {
          var pick = drafts[qid];
          if(pick) gradeChoice(card, pick);
        }
      });
    } else {
      var rr = card.querySelector('.reveal-ref');
      if(rr) rr.addEventListener('click', function(){
        card.querySelector('.ref-answer').classList.add('show');
        card.querySelector('.self-score').classList.add('show');
        rr.classList.add('hidden');
        revealStudy(card);
      });
      card.querySelectorAll('.self-score button').forEach(function(b){
        b.addEventListener('click', function(){
          var sc = +b.dataset.score, pts = +card.dataset.points;
          card.querySelectorAll('.self-score button').forEach(function(x){ x.classList.toggle('on', x === b); });
          progress[qid] = {pick: null, correct: sc >= pts, score: sc, at: Date.now()};
          save(LS.progress, progress);
          if(sc === 0) addWrong(qid);
          sheetMark(qid);
        });
      });
    }
    restoreCard(card);
  });

  /* ---------- 学习区 tab ---------- */
  document.querySelectorAll('.study-tabs').forEach(function(tabs){
    tabs.addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      var card = tabs.closest('.qcard');
      tabs.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x === b); });
      card.querySelectorAll('.study-pane').forEach(function(p){
        var on = p.dataset.pane === b.dataset.tab;
        p.classList.toggle('on', on);
        if(on){
          var ifr = p.querySelector('iframe[data-lazy]');
          if(ifr){ ifr.src = ifr.dataset.lazy; ifr.removeAttribute('data-lazy'); }
        }
      });
    });
  });
  /* 动画全屏 */
  document.querySelectorAll('.fs-btn').forEach(function(b){
    b.addEventListener('click', function(){
      var pane = b.closest('.study-pane');
      var f = pane && pane.querySelector('iframe');
      if(!f) return;
      if(document.fullscreenElement){ document.exitFullscreen(); return; }
      if(f.requestFullscreen) f.requestFullscreen();
      else if(f.webkitRequestFullscreen) f.webkitRequestFullscreen();
    });
  });
  /* 每卡的「显示本题答案」小开关 */
  document.querySelectorAll('.answer-toggle').forEach(function(t){
    t.addEventListener('click', function(){
      var card = t.closest('.qcard');
      var pressed = t.getAttribute('aria-pressed') === 'true';
      t.setAttribute('aria-pressed', String(!pressed));
      if(!pressed){ showAnswer(card); if(card.dataset.type === 'essay'){ var ra = card.querySelector('.reveal-ref'); if(ra) ra.click(); } }
      else {
        var ap = card.querySelector('.answer-placeholder');
        if(ap && !progress[card.dataset.qid]) ap.classList.remove('show');
      }
    });
  });

  /* ---------- 计时器（正/倒计时，按年份持久） ---------- */
  var timerEl = document.getElementById('studyTimer');
  if(timerEl && year){
    var tstate = load(LS.timer, {});
    if(!tstate[year]) tstate[year] = {mode: 'up', running: false, base: 0, elapsed: 0};
    var T = tstate[year];
    var DOWN = 180 * 60; // 408 考试 180 分钟
    function fmt(s){
      s = Math.max(0, Math.floor(s));
      var h = Math.floor(s/3600), m = Math.floor(s%3600/60), ss = s%60;
      var mm = String(m).padStart(2,'0'), sss = String(ss).padStart(2,'0');
      return h > 0 ? h + ':' + mm + ':' + sss : mm + ':' + sss;
    }
    function cur(){ return T.elapsed + (T.running ? (Date.now() - T.base)/1000 : 0); }
    function paint(){
      var up = T.mode === 'up';
      var bu = document.querySelector('.timer-mode button[data-mode="up"]');
      var bd = document.querySelector('.timer-mode button[data-mode="down"]');
      if(bu) bu.classList.toggle('active', up);
      if(bd) bd.classList.toggle('active', !up);
      var ctrl = document.querySelector('.timer-control');
      if(ctrl) ctrl.textContent = T.running ? '暂停' : '开始';
      var strong = timerEl.querySelector('strong');
      var remain = DOWN - cur();
      if(!up){ strong.textContent = fmt(remain); strong.classList.toggle('is-finished', remain <= 0); }
      else { strong.textContent = fmt(cur()); strong.classList.remove('is-finished'); }
    }
    function persist(){ tstate[year] = T; save(LS.timer, tstate); }
    document.querySelectorAll('.timer-mode button').forEach(function(b){
      b.addEventListener('click', function(){
        var now = cur();
        T.mode = b.dataset.mode;
        T.elapsed = now; T.base = Date.now();
        persist(); paint();
      });
    });
    var ctrl = document.querySelector('.timer-control');
    if(ctrl) ctrl.addEventListener('click', function(){
      if(T.running){ T.elapsed = cur(); T.running = false; }
      else { T.base = Date.now(); T.running = true; }
      persist(); paint();
    });
    var rst = document.querySelector('.timer-reset');
    if(rst) rst.addEventListener('click', function(){ T.elapsed = 0; T.base = Date.now(); T.running = false; persist(); paint(); });
    setInterval(paint, 500);
    paint();
  }

  /* ---------- 考试模式 / 答案常显 ---------- */
  var examBtn = document.getElementById('examModeBtn');
  function paintExam(){
    if(examBtn){ examBtn.classList.toggle('is-active', examMode); examBtn.setAttribute('aria-pressed', String(examMode)); }
    document.querySelectorAll('.qcard .reveal-button').forEach(function(b){
      var graded = !!progress[b.closest('.qcard').dataset.qid];
      b.classList.toggle('hidden', examMode && !graded);
    });
  }
  if(examBtn) examBtn.addEventListener('click', function(){
    examMode = !examMode;
    var m = load(LS.exam, {}); m[year] = examMode; save(LS.exam, m);
    paintExam();
  });
  var revealAlwaysBtn = document.getElementById('revealAlwaysBtn');
  function paintRevealAlways(){
    if(revealAlwaysBtn) revealAlwaysBtn.setAttribute('aria-pressed', String(revealAlways));
    if(revealAlways){
      cards.forEach(function(c){
        if(!progress[c.dataset.qid]) showAnswer(c);
        var ra = c.querySelector('.reveal-ref');
        if(c.dataset.type === 'essay' && ra && !progress[c.dataset.qid]) ra.click();
      });
    }
  }
  if(revealAlwaysBtn) revealAlwaysBtn.addEventListener('click', function(){
    revealAlways = !revealAlways; save(LS.reveal, revealAlways); paintRevealAlways();
  });
  paintExam(); paintRevealAlways();

  /* ---------- 答题卡 ---------- */
  var layer = document.querySelector('.answer-sheet-layer');
  function sheetMark(qid){
    if(!layer) return;
    var a = layer.querySelector('[data-qid="' + qid + '"]');
    if(!a) return;
    var p = progress[qid];
    var card = document.querySelector('.qcard[data-qid="' + qid + '"]');
    a.className = '';
    if(!p){ if(drafts[qid]) a.classList.add('answered'); return; }
    if(card && card.dataset.type === 'essay') a.classList.add(p.score > 0 ? 'correct' : 'incorrect');
    else a.classList.add(p.correct ? 'correct' : 'incorrect');
  }
  if(layer && year){
    var grid = layer.querySelector('.answer-sheet-grid');
    var html = '';
    html += '<div class="grp">选择题 1–40（各 2 分）</div>';
    cards.forEach(function(c){
      var n = +c.dataset.number;
      if(n === 41) html += '<div class="grp">综合应用题 41–47</div>';
      var href = document.body.dataset.mode === 'question'
        ? ('../../question/' + c.dataset.qid + '/')
        : ('#q-' + c.dataset.qid);
      html += '<a href="' + href + '" data-qid="' + c.dataset.qid + '">' + n + '</a>';
    });
    grid.innerHTML = html;
    layer.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){ layer.classList.remove('show'); });
    });
    cards.forEach(function(c){ sheetMark(c.dataset.qid); });

    document.querySelectorAll('.sheet-open').forEach(function(b){
      b.addEventListener('click', function(){ layer.classList.add('show'); cards.forEach(function(c){ sheetMark(c.dataset.qid); }); });
    });
    layer.querySelector('.sheet-close').addEventListener('click', function(){ layer.classList.remove('show'); });
    layer.addEventListener('click', function(e){ if(e.target === layer) layer.classList.remove('show'); });

    /* 交卷判分（考试模式核心动作）：所有未判分的选择草稿统一判分 */
    var submit = layer.querySelector('.submit-all');
    if(submit) submit.addEventListener('click', function(){
      cards.forEach(function(c){
        var qid = c.dataset.qid;
        if(c.dataset.type === 'choice' && !progress[qid] && drafts[qid]) gradeChoice(c, drafts[qid]);
      });
      cards.forEach(function(c){ sheetMark(c.dataset.qid); });
      var total = 0, full = 0, correctN = 0, choiceN = 0;
      var wrongIds = [];
      cards.forEach(function(c){
        var pts = +c.dataset.points; full += pts;
        var p = progress[c.dataset.qid];
        if(p){ total += p.score || 0; }
        if(c.dataset.type === 'choice'){
          choiceN++;
          if(p && p.correct) correctN++;
          if(p && !p.correct) wrongIds.push(c.dataset.qid);
        } else if(p && p.score === 0){ wrongIds.push(c.dataset.qid); }
      });
      var box = layer.querySelector('.sheet-result');
      box.innerHTML = '<b>成绩 ' + total + ' / ' + full + '</b><br>' +
        '选择题答对 ' + correctN + ' / ' + choiceN +
        (wrongIds.length ? '<br>错题：' + wrongIds.join('、') + '<br>（已记入错题本）' : '<br>全部正确 🎉') +
        '<br><a class="btn ghost" style="margin-top:8px" href="../../wrongbook/">查看错题本</a>';
      box.classList.add('show');
      examMode = false;
      var m = load(LS.exam, {}); m[year] = false; save(LS.exam, m);
      paintExam();
    });
  }

  /* ---------- 键盘导航 ← → ---------- */
  document.addEventListener('keydown', function(e){
    if(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    var prev = document.querySelector('.question-navigation a[rel="prev"]');
    var next = document.querySelector('.question-navigation a[rel="next"]');
    if(e.key === 'ArrowLeft' && prev){ e.preventDefault(); location.href = prev.href; }
    if(e.key === 'ArrowRight' && next){ e.preventDefault(); location.href = next.href; }
  });

  /* ---------- 整张模式页：单题模式智能跳到当前正在看的题 ---------- */
  document.addEventListener('click', function(e){
    var link = e.target.closest && e.target.closest('a.js-single-link');
    if(!link || document.body.dataset.mode !== 'paper') return;
    var cards = [].slice.call(document.querySelectorAll('.qcard'));
    if(!cards.length) return;
    var mid = window.innerHeight / 2, current = cards[0];
    for(var i = 0; i < cards.length; i++){
      if(cards[i].getBoundingClientRect().top <= mid) current = cards[i];
    }
    if(current && current.dataset.qid){
      e.preventDefault();
      location.href = link.getAttribute('href').replace(/question\/[^/]+\/$/, 'question/' + current.dataset.qid + '/');
    }
  });
})();

/* ===== 搜索页 ===== */
(function(){
  var body = document.getElementById('search-page');
  if(!body) return;
  var state = {data: [], loaded: false, loading: false};
  var input = document.getElementById('search-input');
  var subjectSel = document.getElementById('search-subject');
  var results = document.getElementById('search-results');
  var cnt = document.getElementById('search-count');
  function ensureData(cb){
    if(state.loaded) return cb();
    if(state.loading) return setTimeout(function(){ ensureData(cb); }, 200);
    state.loading = true;
    var years = []; for(var y=2009; y<=2026; y++) years.push(y);
    var pending = years.length;
    years.forEach(function(y){
      fetch('../data/questions/' + y + '.json')
        .then(function(r){ return r.json(); })
        .then(function(js){ state.data = state.data.concat(js); if(--pending === 0){ state.loaded = true; cb(); } })
        .catch(function(){ if(--pending === 0){ state.loaded = true; cb(); } });
    });
  }
  function esc(s){ return s.replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function hi(text, kw){
    var t = esc(text);
    if(!kw) return t;
    return t.replace(new RegExp(esc(kw).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),
      function(m){ return '<mark>' + m + '</mark>'; });
  }
  function render(){
    var kw = input.value.trim(), subject = subjectSel.value;
    if(!kw && !subject){ results.innerHTML = '<p style="color:#586e72;font-size:14px">输入关键词（如 KMP、TCP、进程、Cache）搜索 846 道真题…</p>'; cnt.textContent=''; return; }
    var kwClean = kw.replace(/。$/, '');
    var hits = state.data.filter(function(q){
      if(subject && q.subject !== subject) return false;
      if(!kwClean) return true;
      var plain = (q.stemHtml + ' ' + (q.options||[]).map(function(o){return o.html;}).join(' ')).replace(/<[^>]+>/g,'');
      return plain.indexOf(kwClean) >= 0 || (q.tags||[]).some(function(t){ return t.indexOf(kwClean) >= 0; });
    });
    cnt.textContent = '共 ' + hits.length + ' 题';
    results.innerHTML = hits.slice(0, 80).map(function(q){
      var plain = q.stemHtml.replace(/<[^>]+>/g,'').slice(0, 120);
      return '<a class="result-item" href="../question/' + q.id + '/"><b>' + q.id + '</b> ' +
        '<span class="tag">' + q.subject + '</span>' +
        (q.tags && q.tags[0] ? '<span class="tag">' + esc(q.tags[0]) + '</span>' : '') +
        '<p>' + hi(plain, kwClean) + '</p></a>';
    }).join('') || '<p style="color:#586e72">没有匹配的题目</p>';
  }
  input.addEventListener('input', function(){ ensureData(render); });
  subjectSel.addEventListener('change', function(){ ensureData(render); });
  render();
})();

/* ---------- 从动画页「上下题」跳回时自动打开动画 tab ---------- */
(function(){
  if(location.hash !== '#anim') return;
  var btn = document.querySelector('.study-tabs [data-tab="anim"]');
  if(!btn) return;
  btn.click();
  var study = btn.closest('.study');
  if(study) setTimeout(function(){ study.scrollIntoView({block:'center'}); }, 100);
})();

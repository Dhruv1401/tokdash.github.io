(function () {
  if (document.documentElement.classList.contains('lander-skipped')) return;
  if (typeof anime === 'undefined') return;

  var overlay = document.getElementById('landerOverlay');
  var hi = document.getElementById('landerHi');
  var cursor = document.getElementById('landerCursor');
  var stage = document.getElementById('landerStage');
  var queryWrap = document.getElementById('landerQueryWrap');
  var query = document.getElementById('landerQuery');
  var desc = document.getElementById('landerDesc');
  var line1 = document.getElementById('descLine1');
  var line2 = document.getElementById('descLine2');
  var line3 = document.getElementById('descLine3');
  var exploreWrap = document.getElementById('landerExploreWrap');
  var exploreBtn = document.getElementById('landerExploreBtn');
  var skipBtn = document.getElementById('landerSkipBtn');
  var glassLens = document.getElementById('landerGlassLens');
  var langBtn = document.getElementById('landerLangBtn');
  var langModal = document.getElementById('landerLangModal');
  var langDialog = document.getElementById('landerLangDialog');
  var langClose = document.getElementById('landerLangClose');
  var heroHeading = document.getElementById('heroHeading');
  var heroParagraph = document.getElementById('heroParagraph');

  if (!overlay || !hi || !cursor || !stage || !query || !exploreBtn) return;

  var isFinished = false;
  var activeTimeline = null;
  var lensRafId = null;

  // 20px for a one-row line; a line that wraps (phones) gets a cursor as tall
  // as its rows, since the sweep reveals every row of the line at once.
  function lineCursorHeight(rect) {
    return Math.max(20, rect.height - 12);
  }

  // Language switcher modal handlers
  if (langBtn && langModal && langDialog) {
    langBtn.addEventListener('click', function (e) {
      if (e.target.closest('.lt')) return;
      e.stopPropagation();
      langModal.style.display = 'flex';
      setTimeout(function () { langDialog.classList.add('open'); }, 10);
      if (activeTimeline && !activeTimeline.completed && !isFinished) {
        activeTimeline.pause();
      }
    });
  }

  function closeLangModal() {
    if (!langModal || !langDialog) return;
    langDialog.classList.remove('open');
    setTimeout(function () { langModal.style.display = 'none'; }, 180);
    if (activeTimeline && !activeTimeline.completed && !isFinished) {
      activeTimeline.play();
    }
  }

  if (langClose) langClose.addEventListener('click', closeLangModal);
  if (langModal) {
    langModal.addEventListener('click', function (e) {
      if (e.target === langModal) closeLangModal();
    });
  }

  var LANDER_I18N = {
    en: {
      query: 'What is Tokdash?',
      line1: [
        { w: 'tokdash', t: 'hero-sub', text: 'Tokdash' },
        { w: 'is', text: 'is' },
        { w: 'a', text: 'a' },
        { w: 'token', t: 'hero-h1', text: 'token' },
        { w: 'and', t: 'hero-h1', text: 'and' },
        { w: 'cost', t: 'hero-h1', text: 'cost' },
        { w: 'tracker', text: 'tracker' },
        { w: 'dashboard', t: 'hero-h1', text: 'dashboard,' },
        { w: 'that', text: 'that' },
        { w: 'reads', t: 'hero-sub', text: 'reads' },
        { w: 'the', t: 'hero-sub', text: 'the' },
        { w: 'logs', t: 'hero-sub', text: 'logs' }
      ],
      line2: [
        { w: 'already', t: 'hero-sub', text: 'already' },
        { w: 'present', text: 'present' },
        { w: 'in', text: 'in' },
        { w: 'your', t: 'hero-h1', text: 'your' },
        { w: 'machine', t: 'hero-sub', text: 'machine' },
        { w: 'and', t: 'hero-sub', text: 'and' },
        { w: 'shows', t: 'hero-sub', text: 'shows' },
        { w: 'you', text: 'you' },
        { w: 'exactly', text: 'exactly' },
        { w: 'where', text: 'where' },
        { w: 'your', t: 'hero-h1', text: 'your' },
        { w: 'tokens', t: 'hero-sub', text: 'tokens' },
        { w: 'go', text: 'go' }
      ],
      line3: [
        { w: 'and', t: 'hero-sub', text: 'and' },
        { w: 'how', text: 'how' },
        { w: 'much', text: 'much' },
        { w: 'you', t: 'hero-sub', text: 'you' },
        { w: 'burn', t: 'hero-sub', text: 'burn,' },
        { w: 'what', t: 'hero-sub', text: 'what' },
        { w: 'they', t: 'hero-sub', text: 'they' },
        { w: 'cost', t: 'hero-sub', text: 'cost,' },
        { w: 'no', t: 'hero-sub', text: 'no' },
        { w: 'account', t: 'hero-sub', text: 'account,' },
        { w: 'no', t: 'hero-sub', text: 'no' },
        { w: 'telemetry', t: 'hero-sub', text: 'telemetry' },
        { w: 'and', t: 'hero-sub', text: 'and' },
        { w: 'no', text: 'no' },
        { w: 'upload', t: 'hero-sub', text: 'upload.' }
      ],
      chips: [
        'Twenty-four agents, one dashboard',
        'Local-first & 100% private',
        'Open source & MIT licensed',
        'Zero telemetry · Nothing leaves your PC',
        'Reads logs already on disk',
        'Real-time cost & cache tracking'
      ],
      explore: 'Explore Tokdash',
      skip: 'skip',
      modalTitle: 'Select Language'
    },
    zh: {
      query: '什么是 Tokdash？',
      line1: [
        { w: 'tokdash', t: 'hero-sub', text: 'Tokdash' },
        { w: '是', text: '是' },
        { w: '一个', text: '一个' },
        { w: '本地', t: 'hero-h1', text: '本地' },
        { w: 'token', t: 'hero-h1', text: 'Token' },
        { w: '与', t: 'hero-h1', text: '与' },
        { w: '成本', t: 'hero-h1', text: '成本' },
        { w: '追踪', text: '追踪' },
        { w: '仪表盘', t: 'hero-h1', text: '仪表盘，' },
        { w: '直接', text: '直接' },
        { w: '读取', t: 'hero-sub', text: '读取' },
        { w: '日志', t: 'hero-sub', text: '日志' }
      ],
      line2: [
        { w: '你', text: '你' },
        { w: '电脑', t: 'hero-sub', text: '电脑上' },
        { w: '现有', t: 'hero-sub', text: '现有的' },
        { w: '日志', t: 'hero-sub', text: '日志，' },
        { w: '精确', t: 'hero-sub', text: '精确' },
        { w: '呈现', t: 'hero-sub', text: '呈现' },
        { w: 'token', t: 'hero-sub', text: 'Token' },
        { w: '流向', text: '流向' },
        { w: '与', text: '与' },
        { w: '消耗', t: 'hero-sub', text: '消耗' }
      ],
      line3: [
        { w: '以及', text: '以及' },
        { w: '对应', text: '对应' },
        { w: '成本', t: 'hero-sub', text: '成本。' },
        { w: '无需', t: 'hero-sub', text: '无需' },
        { w: '账号', t: 'hero-sub', text: '账号，' },
        { w: '零遥测', t: 'hero-sub', text: '零遥测，' },
        { w: '不上传', t: 'hero-sub', text: '不上传' },
        { w: '任何', text: '任何' },
        { w: '数据', text: '数据。' }
      ],
      chips: [
        '二十四款 AI 编码工具，一站掌控',
        '本地优先 · 100% 私密安全',
        '开源免费 · MIT 许可协议',
        '零遥测 · 数据绝不离开你的电脑',
        '直接读取磁盘现有日志',
        '实时成本与缓存率追踪'
      ],
      explore: '探索 Tokdash',
      skip: '跳过',
      modalTitle: '选择语言'
    },
    ja: {
      query: 'Tokdash とは？',
      line1: [
        { w: 'tokdash', t: 'hero-sub', text: 'Tokdash' },
        { w: 'は', text: 'は' },
        { w: 'ローカルで', text: 'ローカルで' },
        { w: '動作する', text: '動作する' },
        { w: 'トークン', t: 'hero-h1', text: 'トークンと' },
        { w: 'コスト', t: 'hero-h1', text: 'コストの' },
        { w: '追跡', text: '追跡' },
        { w: 'ダッシュボード', t: 'hero-h1', text: 'ダッシュボードです。' }
      ],
      line2: [
        { w: 'マシン', t: 'hero-sub', text: 'マシン上の' },
        { w: '既存', t: 'hero-sub', text: '既存' },
        { w: 'ログ', t: 'hero-sub', text: 'ログを' },
        { w: '直接', text: '直接' },
        { w: '読み取り', t: 'hero-sub', text: '読み取り、' },
        { w: 'トークン', t: 'hero-sub', text: 'トークンの' },
        { w: '消費先', text: '消費先と' },
        { w: '利用量', text: '利用量を' },
        { w: '正確', t: 'hero-sub', text: '正確に表示。' }
      ],
      line3: [
        { w: 'コスト', t: 'hero-sub', text: 'コストも' },
        { w: '一目で', text: '一目で把握でき、' },
        { w: 'アカウント', t: 'hero-sub', text: 'アカウント不要・' },
        { w: 'テレメトリ', t: 'hero-sub', text: 'テレメトリなし・' },
        { w: 'アップロード', t: 'hero-sub', text: 'アップロード不要。' }
      ],
      chips: [
        '24種類のAIエージェントを1つの画面で',
        'ローカルファースト ＆ 100% プライベート',
        'オープンソース ＆ MIT ライセンス',
        'テレメトリなし · データはPC外に出ません',
        'ディスク上の既存ログを直接読み取り',
        'リアルタイムのコスト・キャッシュ追跡'
      ],
      explore: 'Tokdash を探索する',
      skip: 'スキップ',
      modalTitle: '言語を選択'
    },
    ko: {
      query: 'Tokdash란 무엇인가요?',
      line1: [
        { w: 'tokdash', t: 'hero-sub', text: 'Tokdash는' },
        { w: '로컬에서', text: '로컬에서' },
        { w: '동작하는', text: '동작하는' },
        { w: '토큰', t: 'hero-h1', text: '토큰 및' },
        { w: '비용', t: 'hero-h1', text: '비용' },
        { w: '추적', text: '추적' },
        { w: '대시보드로,', t: 'hero-h1', text: '대시보드로,' }
      ],
      line2: [
        { w: '컴퓨터에', text: '컴퓨터에' },
        { w: '이미', t: 'hero-sub', text: '이미' },
        { w: '존재하는', text: '존재하는' },
        { w: '로그를', t: 'hero-sub', text: '로그를' },
        { w: '직접', text: '직접' },
        { w: '읽어', t: 'hero-sub', text: '읽어' },
        { w: '토큰', t: 'hero-sub', text: '토큰의' },
        { w: '사용처와', text: '사용처와' },
        { w: '소비량을', text: '소비량을' },
        { w: '정확히', t: 'hero-sub', text: '정확히 보여줍니다.' }
      ],
      line3: [
        { w: '발생', text: '발생' },
        { w: '비용을', t: 'hero-sub', text: '비용을' },
        { w: '확인하며,', text: '확인하며,' },
        { w: '계정', t: 'hero-sub', text: '계정 없이,' },
        { w: '텔레메트리', t: 'hero-sub', text: '텔레메트리 없이,' },
        { w: '업로드', t: 'hero-sub', text: '업로드 없이.' }
      ],
      chips: [
        '24개 AI 에이전트, 하나의 대시보드',
        '로컬 우선 & 100% 개인정보 보호',
        '오픈 소스 & MIT 라이선스',
        '제로 텔레메트리 · 데이터 외부 전송 없음',
        '디스크의 기존 로그 직접 분석',
        '실시간 비용 및 캐시 모니터링'
      ],
      explore: 'Tokdash 둘러보기',
      skip: '건너뛰기',
      modalTitle: '언어 선택'
    },
    es: {
      query: '¿Qué es Tokdash?',
      line1: [
        { w: 'tokdash', t: 'hero-sub', text: 'Tokdash' },
        { w: 'es', text: 'es' },
        { w: 'un', text: 'un' },
        { w: 'panel', text: 'panel' },
        { w: 'de', text: 'de' },
        { w: 'seguimiento', text: 'seguimiento' },
        { w: 'de', text: 'de' },
        { w: 'tokens', t: 'hero-h1', text: 'tokens' },
        { w: 'y', t: 'hero-h1', text: 'y' },
        { w: 'costes', t: 'hero-h1', text: 'costes' },
        { w: 'que', text: 'que' },
        { w: 'lee', t: 'hero-sub', text: 'lee' },
        { w: 'los', t: 'hero-sub', text: 'los' },
        { w: 'registros', t: 'hero-sub', text: 'registros' }
      ],
      line2: [
        { w: 'ya', t: 'hero-sub', text: 'ya' },
        { w: 'presentes', text: 'presentes' },
        { w: 'en', text: 'en' },
        { w: 'tu', t: 'hero-h1', text: 'tu' },
        { w: 'máquina', t: 'hero-sub', text: 'máquina' },
        { w: 'y', t: 'hero-sub', text: 'y' },
        { w: 'te', text: 'te' },
        { w: 'muestra', t: 'hero-sub', text: 'muestra' },
        { w: 'exactamente', text: 'exactamente' },
        { w: 'adónde', text: 'adónde' },
        { w: 'van', text: 'van' },
        { w: 'tus', t: 'hero-h1', text: 'tus' },
        { w: 'tokens', t: 'hero-sub', text: 'tokens' }
      ],
      line3: [
        { w: 'y', t: 'hero-sub', text: 'y' },
        { w: 'cuánto', text: 'cuánto' },
        { w: 'consumes,', t: 'hero-sub', text: 'consumes,' },
        { w: 'lo', text: 'lo' },
        { w: 'que', text: 'que' },
        { w: 'cuestan,', t: 'hero-sub', text: 'cuestan,' },
        { w: 'sin', t: 'hero-sub', text: 'sin' },
        { w: 'cuenta,', t: 'hero-sub', text: 'cuenta,' },
        { w: 'sin', t: 'hero-sub', text: 'sin' },
        { w: 'telemetría', t: 'hero-sub', text: 'telemetría' },
        { w: 'y', t: 'hero-sub', text: 'y' },
        { w: 'sin', text: 'sin' },
        { w: 'subidas.', t: 'hero-sub', text: 'subidas.' }
      ],
      chips: [
        'Veinticuatro agentes, un solo panel',
        'Local-first y 100% privado',
        'Código abierto con licencia MIT',
        'Cero telemetría · Nada sale de tu PC',
        'Lee los registros ya existentes en disco',
        'Seguimiento de costes y caché en tiempo real'
      ],
      explore: 'Explorar Tokdash',
      skip: 'saltar',
      modalTitle: 'Seleccionar idioma'
    },
    pt: {
      query: 'O que é o Tokdash?',
      line1: [
        { w: 'tokdash', t: 'hero-sub', text: 'O Tokdash' },
        { w: 'é', text: 'é' },
        { w: 'um', text: 'um' },
        { w: 'painel', text: 'painel' },
        { w: 'de', text: 'de' },
        { w: 'rastreamento', text: 'rastreamento' },
        { w: 'de', text: 'de' },
        { w: 'tokens', t: 'hero-h1', text: 'tokens' },
        { w: 'e', t: 'hero-h1', text: 'e' },
        { w: 'custos', t: 'hero-h1', text: 'custos' },
        { w: 'que', text: 'que' },
        { w: 'lê', t: 'hero-sub', text: 'lê' },
        { w: 'os', t: 'hero-sub', text: 'os' },
        { w: 'logs', t: 'hero-sub', text: 'logs' }
      ],
      line2: [
        { w: 'já', t: 'hero-sub', text: 'já' },
        { w: 'presentes', text: 'presentes' },
        { w: 'na', text: 'na' },
        { w: 'sua', t: 'hero-h1', text: 'sua' },
        { w: 'máquina', t: 'hero-sub', text: 'máquina' },
        { w: 'e', t: 'hero-sub', text: 'e' },
        { w: 'mostra', t: 'hero-sub', text: 'mostra' },
        { w: 'exatamente', text: 'exatamente' },
        { w: 'para', text: 'para' },
        { w: 'onde', text: 'onde' },
        { w: 'vão', text: 'vão' },
        { w: 'os', text: 'os' },
        { w: 'seus', text: 'seus' },
        { w: 'tokens', t: 'hero-sub', text: 'tokens' }
      ],
      line3: [
        { w: 'e', t: 'hero-sub', text: 'e' },
        { w: 'quanto', text: 'quanto' },
        { w: 'você', t: 'hero-sub', text: 'você' },
        { w: 'consome,', t: 'hero-sub', text: 'consome,' },
        { w: 'o', text: 'o' },
        { w: 'que', text: 'que' },
        { w: 'custam,', t: 'hero-sub', text: 'custam,' },
        { w: 'sem', t: 'hero-sub', text: 'sem' },
        { w: 'conta,', t: 'hero-sub', text: 'conta,' },
        { w: 'sem', t: 'hero-sub', text: 'sem' },
        { w: 'telemetria', t: 'hero-sub', text: 'telemetria' },
        { w: 'e', t: 'hero-sub', text: 'e' },
        { w: 'sem', text: 'sem' },
        { w: 'upload.', t: 'hero-sub', text: 'upload.' }
      ],
      chips: [
        'Vinte e quatro agentes, um só dashboard',
        'Local-first e 100% privado',
        'Código aberto e licença MIT',
        'Zero telemetria · Nada sai do seu PC',
        'Lê os logs já gravados em disco',
        'Rastreamento de custos e cache em tempo real'
      ],
      explore: 'Explorar Tokdash',
      skip: 'pular',
      modalTitle: 'Selecionar idioma'
    }
  };

  function renderLine(lineEl, words) {
    if (!lineEl || !words) return;
    var html = words.map(function (item) {
      var targetAttr = item.t ? ' data-target="' + item.t + '"' : '';
      var wAttr = item.w ? ' data-w="' + item.w + '"' : '';
      var clean = item.w || item.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      return '<span class="anime-word m-word"' + wAttr + targetAttr + ' data-word="' + clean + '">' + item.text + '</span>';
    }).join(' ');
    lineEl.innerHTML = html;
  }

  window.__updateLanderText = function (lang) {
    var data = LANDER_I18N[lang] || LANDER_I18N.en;
    if (!data) return;

    if (query) query.textContent = data.query;
    renderLine(line1, data.line1);
    renderLine(line2, data.line2);
    renderLine(line3, data.line3);

    var chips = document.querySelectorAll('.lander-chips-grid .lander-story-chip');
    if (chips && data.chips) {
      chips.forEach(function (chip, idx) {
        if (data.chips[idx]) {
          var textSpan = chip.querySelector('span:not(.chip-dot)');
          if (textSpan) textSpan.innerHTML = data.chips[idx];
        }
      });
    }

    if (exploreBtn && data.explore) {
      var expSpan = exploreBtn.querySelector('span');
      if (expSpan) expSpan.textContent = data.explore;
    }

    if (skipBtn && data.skip) {
      skipBtn.textContent = data.skip;
    }

    var modalH3 = document.querySelector('.lander-lang-head h3');
    if (modalH3 && data.modalTitle) {
      modalH3.textContent = data.modalTitle;
    }

    if (activeTimeline && activeTimeline.completed) {
      if (query) query.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
      if (line1) line1.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
      if (line2) line2.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
      if (line3) line3.style.clipPath = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
    }

    prepareHeroWords();
  };

  // Handle language selection
  function setupLangOptions() {
    document.querySelectorAll('.lander-lang-opt, .lander-lang-tokens .lt').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var targetLang = btn.getAttribute('data-lang');
        if (targetLang && window.__applyLang) {
          window.__applyLang(targetLang);
        }
        closeLangModal();
      });
    });
  }
  setupLangOptions();

  // Prepare words inside hero section using splitText with includeSpaces: false
  function prepareHeroWords() {
    [heroHeading, heroParagraph, document.getElementById('heroEyebrow'), document.getElementById('heroTag1')].forEach(function (container) {
      if (!container) return;
      splitText(container, { words: true, includeSpaces: false });
    });
  }

  // Synchronize initial lander language
  var initialLanderLang = window.__lang || 'en';
  window.__updateLanderText(initialLanderLang);
  if (window.__syncLanderTokens) window.__syncLanderTokens(initialLanderLang);

  function finishIntro(skipAnim) {
    if (isFinished) return;
    isFinished = true;
    try { localStorage.setItem('tokdash_lander_seen', 'true'); } catch (err) {}

    if (lensRafId) cancelAnimationFrame(lensRafId);
    if (activeTimeline) activeTimeline.pause();

    if (skipAnim) {
      anime({
        targets: overlay,
        opacity: 0,
        duration: 350,
        easing: 'easeOutQuad',
        complete: function () {
          document.documentElement.classList.remove('lander-active');
          document.documentElement.classList.add('lander-skipped');
          document.body.classList.remove('lander-locked');
          if (window.__lenis) window.__lenis.start();
        }
      });
    }
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', function () {
      finishIntro(true);
    });
  }

  // Track cursor position for liquid glass burst
  var mouseX = window.innerWidth / 2;
  var mouseY = window.innerHeight / 2;
  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  // Run sequence
  prepareHeroWords();

  // Timeline
  activeTimeline = anime.timeline({
    autoplay: true
  });

  // Stage 1: "Hi." in dead center
  activeTimeline
    .add({
      targets: hi,
      opacity: [0, 1],
      scale: [0.85, 1],
      duration: 750,
      easing: 'easeOutBack(1.4)'
    })
    // Generous wait in center
    .add({
      targets: hi,
      duration: 1400
    })
    // Stage 2: Typing cursor glides from left screen over "Hi.", erasing it, and stops at right of "Hi."
    .add({
      targets: cursor,
      opacity: [0, 1],
      left: [-20, 0],
      duration: 180,
      easing: 'linear'
    })
    .add({
      targets: cursor,
      duration: 1150,
      easing: 'cubicBezier(0.4, 0, 0.2, 1)',
      update: function (anim) {
        var hiRect = hi.getBoundingClientRect();
        var maxRight = hiRect.right + 25;
        var curX = (anim.progress / 100) * maxRight;
        cursor.style.left = curX + 'px';
        cursor.style.top = (hiRect.top + hiRect.height / 2) + 'px';
        cursor.style.height = (hiRect.height * 0.95) + 'px';

        if (curX > hiRect.left) {
          var wipePct = Math.min(100, Math.max(0, ((curX - hiRect.left) / hiRect.width) * 100));
          hi.style.clipPath = 'polygon(' + wipePct + '% 0%, 100% 0%, 100% 100%, ' + wipePct + '% 100%)';
        }
        if (curX >= hiRect.right) {
          hi.style.opacity = '0';
        }
      }
    })
    // Brief pause after erasing "Hi."
    .add({
      targets: cursor,
      duration: 350
    })
    // Stage 3: Cursor FLIES to the place above for the next line ("What is Tokdash?") instead of appearing there
    .add({
      targets: stage,
      opacity: [0, 1],
      duration: 450,
      easing: 'easeOutQuad'
    }, '-=100')
    .add({
      targets: cursor,
      duration: 700,
      easing: 'cubicBezier(0.33, 1, 0.68, 1)',
      update: function (anim) {
        var p = anim.progress / 100;
        var hiRect = hi.getBoundingClientRect();
        var qRect = query.getBoundingClientRect();
        var startX = hiRect.right + 25;
        var startY = hiRect.top + hiRect.height / 2;
        var targetX = qRect.right;
        var targetY = qRect.top + qRect.height / 2;

        cursor.style.left = (startX + (targetX - startX) * p) + 'px';
        cursor.style.top = (startY + (targetY - startY) * p) + 'px';
        cursor.style.height = ((hiRect.height * (1 - p) + qRect.height * p) * 0.9) + 'px';
      }
    }, '-=400')
    // Pause at the start of "What is Tokdash?"
    .add({
      targets: cursor,
      duration: 250
    })
    // Stage 4: Cursor glides towards left, revealing "What is Tokdash?" slowly and properly
    .add({
      targets: cursor,
      duration: 1500,
      easing: 'cubicBezier(0.25, 1, 0.5, 1)',
      update: function (anim) {
        var qRect = query.getBoundingClientRect();
        var progress = anim.progress; // 0 to 100
        var revealPct = Math.max(0, 100 - progress);
        query.style.clipPath = 'polygon(' + revealPct + '% 0%, 100% 0%, 100% 100%, ' + revealPct + '% 100%)';

        var cX = qRect.left + (revealPct / 100) * qRect.width;
        var cY = qRect.top + qRect.height / 2;
        cursor.style.left = cX + 'px';
        cursor.style.top = cY + 'px';
        cursor.style.height = (qRect.height * 0.9) + 'px';
      }
    })
    // Generous pause at the 'W' of "What"
    .add({
      targets: cursor,
      duration: 500
    })
    // Stage 5: Shift cursor down to description line 1 start
    .add({
      targets: cursor,
      duration: 380,
      easing: 'easeInOutCubic',
      update: function (anim) {
        var p = anim.progress / 100;
        var qRect = query.getBoundingClientRect();
        var l1Rect = line1 ? line1.getBoundingClientRect() : desc.getBoundingClientRect();
        var startX = qRect.left;
        var startY = qRect.top + qRect.height / 2;
        var targetX = l1Rect.left;
        var targetY = l1Rect.top + l1Rect.height / 2;

        cursor.style.left = (startX + (targetX - startX) * p) + 'px';
        cursor.style.top = (startY + (targetY - startY) * p) + 'px';
        cursor.style.height = (qRect.height * 0.9 * (1 - p) + lineCursorHeight(l1Rect) * p) + 'px';
      }
    })
    .add({
      targets: cursor,
      duration: 150
    })
    // Stage 6: Glide over Description line-by-line to reveal it
    // Line 1
    .add({
      targets: cursor,
      duration: 950,
      easing: 'cubicBezier(0.3, 0, 0.2, 1)',
      update: function (anim) {
        if (!line1) return;
        var l1Rect = line1.getBoundingClientRect();
        var p = anim.progress; // 0 to 100
        line1.style.clipPath = 'polygon(0% 0%, ' + p + '% 0%, ' + p + '% 100%, 0% 100%)';
        cursor.style.left = (l1Rect.left + (p / 100) * l1Rect.width) + 'px';
        cursor.style.top = (l1Rect.top + l1Rect.height / 2) + 'px';
        cursor.style.height = lineCursorHeight(l1Rect) + 'px';
      }
    })
    // Carriage return to Line 2 start
    .add({
      targets: cursor,
      duration: 180,
      easing: 'easeInOutQuad',
      update: function (anim) {
        if (!line1 || !line2) return;
        var p = anim.progress / 100;
        var l1Rect = line1.getBoundingClientRect();
        var l2Rect = line2.getBoundingClientRect();
        var startX = l1Rect.right;
        var startY = l1Rect.top + l1Rect.height / 2;
        var targetX = l2Rect.left;
        var targetY = l2Rect.top + l2Rect.height / 2;
        cursor.style.left = (startX + (targetX - startX) * p) + 'px';
        cursor.style.top = (startY + (targetY - startY) * p) + 'px';
      }
    })
    // Line 2
    .add({
      targets: cursor,
      duration: 1000,
      easing: 'cubicBezier(0.3, 0, 0.2, 1)',
      update: function (anim) {
        if (!line2) return;
        var l2Rect = line2.getBoundingClientRect();
        var p = anim.progress; // 0 to 100
        line2.style.clipPath = 'polygon(0% 0%, ' + p + '% 0%, ' + p + '% 100%, 0% 100%)';
        cursor.style.left = (l2Rect.left + (p / 100) * l2Rect.width) + 'px';
        cursor.style.top = (l2Rect.top + l2Rect.height / 2) + 'px';
        cursor.style.height = lineCursorHeight(l2Rect) + 'px';
      }
    })
    // Carriage return to Line 3 start
    .add({
      targets: cursor,
      duration: 180,
      easing: 'easeInOutQuad',
      update: function (anim) {
        if (!line2 || !line3) return;
        var p = anim.progress / 100;
        var l2Rect = line2.getBoundingClientRect();
        var l3Rect = line3.getBoundingClientRect();
        var startX = l2Rect.right;
        var startY = l2Rect.top + l2Rect.height / 2;
        var targetX = l3Rect.left;
        var targetY = l3Rect.top + l3Rect.height / 2;
        cursor.style.left = (startX + (targetX - startX) * p) + 'px';
        cursor.style.top = (startY + (targetY - startY) * p) + 'px';
      }
    })
    // Line 3
    .add({
      targets: cursor,
      duration: 1150,
      easing: 'cubicBezier(0.3, 0, 0.2, 1)',
      update: function (anim) {
        if (!line3) return;
        var l3Rect = line3.getBoundingClientRect();
        var p = anim.progress; // 0 to 100
        line3.style.clipPath = 'polygon(0% 0%, ' + p + '% 0%, ' + p + '% 100%, 0% 100%)';
        cursor.style.left = (l3Rect.left + (p / 100) * l3Rect.width) + 'px';
        cursor.style.top = (l3Rect.top + l3Rect.height / 2) + 'px';
        cursor.style.height = lineCursorHeight(l3Rect) + 'px';
      }
    })
    // Fade out cursor
    .add({
      targets: cursor,
      opacity: [1, 0],
      duration: 280,
      easing: 'easeOutQuad'
    })
    // Stage 7: Circular feature pill boxes pop in sequentially
    .add({
      targets: '.lander-story-chip',
      opacity: [0, 1],
      translateY: [14, 0],
      scale: [0.92, 1],
      delay: anime.stagger(90),
      duration: 550,
      easing: 'easeOutBack(1.4)'
    }, '+=100')
    // Stage 8: "Explore" button emerges downwards and waits
    .add({
      targets: exploreWrap,
      opacity: [0, 1],
      translateY: [-18, 0],
      duration: 700,
      easing: 'easeOutBack(1.2)'
    }, '+=150');

  // Stage 9: Explore Button Click -> splitText Word Flight & Liquid Glass Burst
  exploreBtn.addEventListener('click', function (e) {
    if (isFinished) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishIntro(true);
      return;
    }
    isFinished = true;
    try { localStorage.setItem('tokdash_lander_seen', 'true'); } catch (err) {}

    if (activeTimeline) activeTimeline.pause();

    var clickX = e ? e.clientX : mouseX;
    var clickY = e ? e.clientY : mouseY;

    // Position & burst liquid glass lens
    if (glassLens) {
      glassLens.style.left = clickX + 'px';
      glassLens.style.top = clickY + 'px';

      var targetLensX = clickX;
      var targetLensY = clickY;
      var curLensX = clickX;
      var curLensY = clickY;

      function onLensMouseMove(evt) {
        targetLensX = evt.clientX;
        targetLensY = evt.clientY;
      }
      window.addEventListener('mousemove', onLensMouseMove, { passive: true });

      function updateLens() {
        curLensX += (targetLensX - curLensX) * 0.15;
        curLensY += (targetLensY - curLensY) * 0.15;
        glassLens.style.left = curLensX + 'px';
        glassLens.style.top = curLensY + 'px';
        lensRafId = requestAnimationFrame(updateLens);
      }
      lensRafId = requestAnimationFrame(updateLens);

      anime({
        targets: glassLens,
        opacity: [0, 1, 0.9, 0],
        scale: [0.5, 1.35, 1.7],
        duration: 1100,
        easing: 'easeOutCubic',
        complete: function () {
          if (lensRafId) cancelAnimationFrame(lensRafId);
          window.removeEventListener('mousemove', onLensMouseMove);
          glassLens.style.display = 'none';
        }
      });
    }

    // Unclip lines so text is fully measurable and visible
    if (line1) line1.style.clipPath = 'none';
    if (line2) line2.style.clipPath = 'none';
    if (line3) line3.style.clipPath = 'none';
    if (query) query.style.clipPath = 'none';

    // Prepare frontpage target elements: remove transitions, force static placement so dstRect is true final resting position
    var heroHeading = document.getElementById('heroHeading');
    var heroParagraph = document.getElementById('heroParagraph');
    var heroEyebrow = document.getElementById('heroEyebrow');
    var heroTag1 = document.getElementById('heroTag1');
    var headerEl = document.querySelector('header');

    if (headerEl) {
      headerEl.style.opacity = '1';
      headerEl.style.visibility = 'visible';
    }

    [heroHeading, heroParagraph, heroEyebrow, heroTag1].forEach(function (el) {
      if (el) {
        el.style.transition = 'none';
        el.classList.add('in');
        el.style.transform = 'none';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
      }
    });

    // Split frontpage target containers and lander description by words with includeSpaces: false
    var landerSplit = splitText('#landerDesc', {
      words: true,
      includeSpaces: false
    });
    var heroParaSplit = splitText('#heroParagraph', {
      words: true,
      includeSpaces: false
    });
    var heroHeadingSplit = splitText('#heroHeading', {
      words: true,
      includeSpaces: false
    });
    var heroEyebrowSplit = splitText('#heroEyebrow', {
      words: true,
      includeSpaces: false
    });

    // Force browser layout flush so bounding rects reflect final document positions
    if (heroParagraph) void heroParagraph.offsetWidth;

    // Match words to destination locations
    var usedTargets = new Set();
    var flights = [];

    landerSplit.words.forEach(function (srcWord) {
      var clean = (srcWord.getAttribute('data-word') || srcWord.getAttribute('data-w') || srcWord.textContent || '')
        .toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      var targetPref = srcWord.getAttribute('data-target') || '';
      var targetEl = null;

      function findCandidate(wordList) {
        if (!wordList) return null;
        for (var i = 0; i < wordList.length; i++) {
          var cand = wordList[i];
          if (!usedTargets.has(cand)) {
            var candClean = (cand.getAttribute('data-word') || cand.textContent || '')
              .toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            if (candClean === clean) {
              return cand;
            }
          }
        }
        return null;
      }

      // Priority 1: Check preferred container if data-target is set
      if (targetPref === 'hero-h1') {
        targetEl = findCandidate(heroHeadingSplit.words);
      } else if (targetPref === 'hero-sub') {
        targetEl = findCandidate(heroParaSplit.words);
      } else if (targetPref === 'hero-eyebrow') {
        targetEl = findCandidate(heroEyebrowSplit.words);
      }

      // Priority 2: Fallback across target containers
      if (!targetEl) targetEl = findCandidate(heroParaSplit.words);
      if (!targetEl) targetEl = findCandidate(heroHeadingSplit.words);
      if (!targetEl) targetEl = findCandidate(heroEyebrowSplit.words);

      if (targetEl) {
        usedTargets.add(targetEl);
        flights.push({
          src: srcWord,
          dst: targetEl
        });
      }
    });

    // Create top-level flying layer directly in body (unconstrained by overflow or clipping)
    var flyLayer = document.getElementById('landerFlyLayer');
    if (!flyLayer) {
      flyLayer = document.createElement('div');
      flyLayer.id = 'landerFlyLayer';
      flyLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:100050;overflow:visible;';
      document.body.appendChild(flyLayer);
    }
    flyLayer.innerHTML = '';

    var flyingItems = [];

    flights.forEach(function (f, fIdx) {
      var srcRect = f.src.getBoundingClientRect();
      var dstRect = f.dst.getBoundingClientRect();
      var srcStyle = window.getComputedStyle(f.src);
      var dstStyle = window.getComputedStyle(f.dst);

      // Pre-hide destination word until flight docks
      f.dst.style.opacity = '0';
      f.dst.style.visibility = 'visible';

      // Hide original source word in lander
      f.src.style.opacity = '0';

      var flyer = document.createElement('span');
      flyer.textContent = f.src.textContent;
      flyer.style.cssText =
        'position:fixed;' +
        'left:' + srcRect.left + 'px;' +
        'top:' + srcRect.top + 'px;' +
        'font-size:' + srcStyle.fontSize + ';' +
        'font-weight:' + srcStyle.fontWeight + ';' +
        'color:' + srcStyle.color + ';' +
        'line-height:' + srcStyle.lineHeight + ';' +
        'font-family:' + srcStyle.fontFamily + ';' +
        'letter-spacing:' + srcStyle.letterSpacing + ';' +
        'margin:0;padding:0;display:inline-block;white-space:nowrap;' +
        'transform-origin:0 0;' +
        'transform:translate3d(0, 0, 0);' +
        'transition:color 0.85s cubic-bezier(0.22, 1, 0.36, 1);' +
        'pointer-events:none;will-change:transform,opacity,color;';
      flyLayer.appendChild(flyer);

      var dx = dstRect.left - srcRect.left;
      var dy = dstRect.top - srcRect.top;

      flyingItems.push({
        flyer: flyer,
        dst: f.dst,
        dx: dx,
        dy: dy,
        srcColor: srcStyle.color,
        dstColor: dstStyle.color,
        srcSize: parseFloat(srcStyle.fontSize) || 18,
        dstSize: parseFloat(dstStyle.fontSize) || 18,
        idx: fIdx
      });
    });

    // Trigger color transition on next animation frame
    requestAnimationFrame(function () {
      flyingItems.forEach(function (item) {
        item.flyer.style.color = item.dstColor;
      });
    });

    // Launch word flights using a continuous parametric quadratic Bézier curve:
    // No abrupt mid-flight stops, continuous velocity, and gentle aerodynamic curvature ("not too much curved")
    var totalFlying = flyingItems.length;

    flyingItems.forEach(function (item) {
      var dist = Math.hypot(item.dx, item.dy);

      // Gentle upward peak arc deflection: 16px to 32px based on travel distance
      var peakY = -Math.min(32, Math.max(16, dist * 0.065));

      // Subtle lateral spread based on word index: maintains distinct slipstreams without clutter
      var spread = (item.idx / Math.max(1, totalFlying - 1)) - 0.5;
      var peakX = spread * 16;

      var targetScale = item.dstSize / item.srcSize;
      var animObj = { p: 0 };

      // Cascading stagger: smooth fluid wave
      var delay = (item.idx % 6) * 20 + Math.floor(item.idx / 6) * 16;

      anime({
        targets: animObj,
        p: 1,
        duration: 1050,
        delay: delay,
        easing: 'cubicBezier(0.22, 1, 0.36, 1)',
        update: function () {
          var t = animObj.p;
          // Parabolic arc: 4 * t * (1 - t) has peak 1.0 at t = 0.5, and 0 at t = 0 and t = 1
          var arc = 4 * t * (1 - t);
          var curX = t * item.dx + arc * peakX;
          var curY = t * item.dy + arc * peakY;
          // Subtle flight elevation scale (+5% max at mid-flight), smoothly scaling to target font size
          var scale = (1 + (targetScale - 1) * t) * (1 + 0.05 * Math.sin(t * Math.PI));
          item.flyer.style.transform =
            'translate3d(' + curX.toFixed(2) + 'px, ' + curY.toFixed(2) + 'px, 0) scale(' + scale.toFixed(3) + ')';
        },
        complete: function () {
          item.dst.style.opacity = '1';
          item.flyer.style.opacity = '0';
          if (item.flyer.parentNode) {
            item.flyer.parentNode.removeChild(item.flyer);
          }
        }
      });
    });

    // Non-flying destination words fade in softly to complete the sentences
    var allDstWords = [].concat(
      heroParaSplit.words,
      heroHeadingSplit.words,
      heroEyebrowSplit.words
    );
    var remainingDstWords = allDstWords.filter(function (w) {
      return !usedTargets.has(w);
    });
    if (remainingDstWords.length > 0) {
      remainingDstWords.forEach(function (w) { w.style.opacity = '0'; });
      anime({
        targets: remainingDstWords,
        opacity: [0, 1],
        duration: 700,
        delay: 380,
        easing: 'easeOutCubic'
      });
    }

    // Disperse non-matching words
    var nonMatching = landerSplit.words.filter(function (w) {
      return !flights.some(function (f) { return f.src === w; });
    });
    if (nonMatching.length > 0) {
      anime({
        targets: nonMatching,
        opacity: [1, 0],
        translateY: [0, 25],
        filter: ['blur(0px)', 'blur(8px)'],
        duration: 550,
        easing: 'easeOutQuad'
      });
    }

    // Disperse query title
    if (query) {
      anime({
        targets: query,
        opacity: [1, 0],
        translateY: [0, -25],
        filter: ['blur(0px)', 'blur(8px)'],
        duration: 550,
        easing: 'easeOutQuad'
      });
    }

    // Disperse circular chips
    anime({
      targets: '.lander-story-chip',
      opacity: [1, 0],
      translateY: [0, 20],
      filter: ['blur(0px)', 'blur(6px)'],
      duration: 500,
      easing: 'easeOutQuad'
    });

    // Hide explore button & query wrapper
    anime({
      targets: [exploreWrap, queryWrap],
      opacity: [1, 0],
      scale: [1, 0.94],
      duration: 450,
      easing: 'easeOutQuad'
    });

    // Fade out overlay and reveal landing page
    anime({
      targets: overlay,
      opacity: [1, 0],
      duration: 800,
      delay: 420,
      easing: 'linear',
      complete: function () {
        document.documentElement.classList.remove('lander-active');
        document.documentElement.classList.add('lander-skipped');
        document.body.classList.remove('lander-locked');
        if (window.__lenis) window.__lenis.start();
        if (flyLayer && flyLayer.parentNode) {
          flyLayer.parentNode.removeChild(flyLayer);
        }
        // Ensure all destination words are visible and transitions restored
        allDstWords.forEach(function (w) {
          w.style.opacity = '1';
          w.style.visibility = 'visible';
        });
        [heroHeading, heroParagraph, heroEyebrow, heroTag1].forEach(function (el) {
          if (el) el.style.transition = '';
        });
      }
    });

    // Subtle stagger reveal for preview card
    anime({
      targets: '.preview-wrap',
      opacity: [0.7, 1],
      translateY: [12, 0],
      duration: 750,
      delay: 420,
      easing: 'easeOutCubic'
    });
  });

  document.documentElement.classList.add('lander-active');
  document.body.classList.add('lander-locked');
  if (window.__lenis) window.__lenis.stop();
})();

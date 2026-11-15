/* ============================================================
   Mini App logic: exchange form, order, tabs, language, sheets.
   ============================================================ */
(function () {
  'use strict';

  const C = window.APP_CONFIG;
  const I = window.I18N;
  const R = window.Rates;
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTG = !!(tg && tg.initData);
  const tgAtLeast = (v) => inTG && typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast(v);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Assets ---------- */
  const ASSETS = {};
  C.crypto.forEach((a) => { ASSETS[a.code] = { ...a, type: 'crypto' }; });
  C.fiat.forEach((f) => { ASSETS[f.code] = { ...f, type: 'fiat' }; });
  const isCrypto = (code) => ASSETS[code].type === 'crypto';

  const ICON = {
    card: '<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    qr: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 20.5h1M20.5 14v1.5"/></svg>',
    sepa: '<svg viewBox="0 0 24 24"><path d="M17.5 6.5a7 7 0 1 0 0 11"/><path d="M4 10.5h9.5M4 13.5h9.5"/></svg>',
    iban: '<svg viewBox="0 0 24 24"><path d="M3 9.5 12 4l9 5.5M5 10.5v7M9.7 10.5v7M14.3 10.5v7M19 10.5v7M3 20h18"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    check: '<svg class="check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="m21 4-18 7 6.5 2.5L21 4Zm0 0-7.5 16-4-6.5"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8"/></svg>',
  };

  /* ---------- Storage (optional) ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  };

  /* ---------- Language ---------- */
  const LOCALE = { en: 'en-US', ru: 'ru-RU', kk: 'kk-KZ', uk: 'uk-UA', tr: 'tr-TR', ar: 'ar-u-nu-latn', es: 'es-ES', de: 'de-DE' };

  function detectLang() {
    const saved = store.get('lang');
    if (saved && I[saved]) return saved;
    const tgLang = inTG && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.language_code;
    const raw = (tgLang || navigator.language || 'en').toLowerCase().slice(0, 2);
    if (raw === 'be') return 'ru';
    return I[raw] ? raw : 'en';
  }

  const state = {
    lang: detectLang(),
    give: C.defaultGive,
    get: C.defaultGet,
    giveAmt: '',
    getAmt: '',
    edited: 'give',
    method: null,
    bank: null,
    nets: {},
    ratesFiat: 'USD',
    countdown: C.refreshSec,
    sheetClose: null,
  };

  function t(key, vars, lang) {
    const L = I[lang || state.lang] || I.en;
    const s = (L[key] != null ? L[key] : (I.en[key] != null ? I.en[key] : key));
    return s.replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ''));
  }

  /* ---------- Numbers ---------- */
  function fmt(n, dp, lang) {
    if (!isFinite(n)) return '—';
    return new Intl.NumberFormat(LOCALE[lang || state.lang] || 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: dp }).format(n);
  }
  function fmtRate(n, lang) {
    if (!isFinite(n)) return '—';
    const dp = n >= 100 ? 2 : n >= 1 ? 4 : n >= 0.01 ? 6 : 8;
    return fmt(n, dp, lang);
  }
  const fmtAsset = (n, code, lang) => `${fmt(n, ASSETS[code].dp, lang)} ${code}`;
  function parseNum(s) {
    const n = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }
  function plain(n, dp) {
    if (!isFinite(n) || n <= 0) return '';
    return String(+n.toFixed(dp));
  }

  /* ---------- Telegram helpers ---------- */
  function haptic(kind) {
    if (!tgAtLeast('6.1')) return;
    try {
      if (kind === 'ok') tg.HapticFeedback.notificationOccurred('success');
      else if (kind === 'err') tg.HapticFeedback.notificationOccurred('error');
      else if (kind) tg.HapticFeedback.impactOccurred(kind);
      else tg.HapticFeedback.selectionChanged();
    } catch (e) { /* ignore */ }
  }
  function openLink(url) {
    if (inTG) {
      try { tg.openTelegramLink(url); return; } catch (e) { /* fall through */ }
    }
    window.open(url, '_blank', 'noopener');
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ---------- Pair logic ---------- */
  const other = (side) => (side === 'give' ? 'get' : 'give');

  function fiatSide() {
    if (!isCrypto(state.give)) return { side: 'give', code: state.give };
    if (!isCrypto(state.get)) return { side: 'get', code: state.get };
    return null;
  }

  function syncPairOptions() {
    const f = fiatSide();
    if (f) {
      const a = ASSETS[f.code];
      if (!a.methods.includes(state.method)) state.method = a.methods[0];
      if (state.bank && !a.banks.includes(state.bank)) state.bank = null;
    } else {
      state.method = null; state.bank = null;
    }
    [state.give, state.get].forEach((code) => {
      if (isCrypto(code)) {
        const nets = ASSETS[code].networks;
        if (!nets.includes(state.nets[code])) state.nets[code] = nets[0];
      }
    });
  }

  function setAsset(side, code) {
    const o = other(side);
    if (code === state[o]) state[o] = state[side];
    state[side] = code;
    if (!isCrypto(state.give) && !isCrypto(state.get)) state[o] = 'USDT';
    syncPairOptions();
    recalc();
    renderExchange();
  }

  function recalc() {
    const rate = R.client(state.give, state.get);
    if (state.edited === 'give') {
      const n = parseNum(state.giveAmt);
      state.getAmt = plain(n * rate, ASSETS[state.get].dp);
    } else {
      const n = parseNum(state.getAmt);
      state.giveAmt = plain(n / rate, ASSETS[state.give].dp);
    }
    if (state.edited === 'give') $('#getAmt').value = state.getAmt;
    else $('#giveAmt').value = state.giveAmt;
  }

  /* ---------- Rendering: exchange ---------- */
  function coinHTML(code, size) {
    const a = ASSETS[code];
    const cls = ['coin', size || '', a.type === 'fiat' ? 'fiat' : '', (a.type === 'fiat' && a.symbol.length > 2) ? 'long' : ''].join(' ');
    const style = a.type === 'crypto' ? ` style="background:radial-gradient(circle at 30% 25%, ${a.color}, ${a.color}cc 60%, #000 140%)"` : '';
    const glyph = a.type === 'crypto' ? a.glyph : a.symbol;
    return `<span class="${cls}"${style} aria-hidden="true">${esc(glyph)}</span>`;
  }

  function renderAssetBtn(btn, code) {
    btn.innerHTML = `${coinHTML(code, 'sm')}<span>${esc(code)}</span>${ICON.chev}`;
  }

  function minIn(code) { return C.minOrderUsd / R.usd(code); }

  function renderRateLine() {
    const g = state.give, r = state.get;
    let base, quote, val;
    if (!isCrypto(g) && isCrypto(r)) { base = r; quote = g; val = 1 / R.client(g, r); }
    else { base = g; quote = r; val = R.client(g, r); }
    $('#rateText').innerHTML = `${esc(t('rate'))}: <b>1 ${esc(base)} = ${esc(fmtRate(val))} ${esc(quote)}</b>`;
    $('#giveHint').textContent = t('min', { v: fmtAsset(minIn(g), g) });
    $('#giveHint').classList.remove('bad');
    $('#getHint').textContent = ASSETS[r].name;
  }

  function renderNets() {
    const block = $('#netBlock');
    const codes = [state.give, state.get].filter((c) => isCrypto(c) && ASSETS[c].networks.length > 1);
    if (!codes.length) { block.hidden = true; block.innerHTML = ''; return; }
    block.hidden = false;
    block.innerHTML = codes.map((c) => `
      <div class="net-group">
        <div class="label">${esc(t('network_of', { c }))}</div>
        <div class="chips">${ASSETS[c].networks.map((n) => `<button type="button" class="chip${state.nets[c] === n ? ' active' : ''}" data-net="${esc(c)}" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      </div>`).join('');
  }

  function renderMethods() {
    const block = $('#methodBlock');
    const f = fiatSide();
    if (!f) { block.hidden = true; return; }
    block.hidden = false;
    const a = ASSETS[f.code];
    $('#methodLabel').textContent = t(f.side === 'give' ? 'method_pay' : 'method_receive');
    $('#methodGrid').innerHTML = a.methods.map((m) =>
      `<button type="button" class="method${state.method === m ? ' active' : ''}" data-method="${m}">${ICON[m]}<span>${esc(t('m_' + m))}</span></button>`).join('');
    const banks = [{ v: '', label: t('any_bank') }].concat(a.banks.map((b) => ({ v: b, label: b })));
    $('#bankChips').innerHTML = banks.map((b) =>
      `<button type="button" class="chip${(state.bank || '') === b.v ? ' active' : ''}" data-bank="${esc(b.v)}">${esc(b.label)}</button>`).join('');
  }

  const PLACEHOLDER = { card: '0000 0000 0000 0000', phone: '+', iban: 'XX00 0000 0000 0000 0000', sepa: 'XX00 0000 0000 0000 0000', qr: '' };

  function renderDetails() {
    const label = $('#detailsLabel');
    const input = $('#details');
    if (isCrypto(state.get)) {
      label.textContent = t('details_wallet', { c: state.get, n: state.nets[state.get] });
      input.placeholder = '0x… / T… / UQ…';
    } else {
      label.textContent = t('details_' + state.method);
      input.placeholder = PLACEHOLDER[state.method] || '';
    }
  }

  function renderExchange() {
    renderAssetBtn($('#giveAsset'), state.give);
    renderAssetBtn($('#getAsset'), state.get);
    renderRateLine();
    renderNets();
    renderMethods();
    renderDetails();
  }

  function renderRateStatus() {
    const live = R.isLive();
    const pill = $('#rateStatus');
    pill.querySelector('.dot').className = 'dot ' + (live ? 'ok' : 'warn');
    pill.querySelector('span').textContent = t(live ? 'rate_live' : 'rate_offline');
    $('#rateTimer').textContent = t('update_in', { s: state.countdown });
  }

  /* ---------- Rendering: rates ---------- */
  function renderRates() {
    $('#rateFiatChips').innerHTML = C.fiat.map((f) =>
      `<button type="button" class="chip${state.ratesFiat === f.code ? ' active' : ''}" data-rfiat="${f.code}">${esc(f.symbol)} ${f.code}</button>`).join('');
    const fc = state.ratesFiat;
    const dp = Math.max(ASSETS[fc].dp, 2);
    $('#rateList').innerHTML = C.crypto.map((a) => {
      const buy = R.client(a.code, fc);          // client sells crypto → we buy
      const sell = 1 / R.client(fc, a.code);     // client buys crypto → we sell
      const ch = R.change[a.code];
      const chg = typeof ch === 'number' ? `<span class="chg ${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '+' : ''}${fmt(ch, 2)}%</span>` : '';
      return `<div class="row">
        ${coinHTML(a.code, 'lg')}
        <div class="name"><b>${esc(a.code)}${chg}</b><small>${esc(a.name)}</small></div>
        <div class="px">
          <div><span>${esc(t('we_buy'))}</span>${esc(fmt(buy, buy >= 100 ? 2 : dp + 2))}</div>
          <div class="sell"><span>${esc(t('we_sell'))}</span>${esc(fmt(sell, sell >= 100 ? 2 : dp + 2))}</div>
        </div>
      </div>`;
    }).join('');
  }

  /* ---------- Rendering: methods ---------- */
  function renderMethodsView() {
    $('#methodsList').innerHTML = C.fiat.map((f) => `
      <div class="card cur-card">
        <div class="cur-head">${coinHTML(f.code, 'lg')}<div><b>${esc(f.code)}</b><small>${esc(f.name)}</small></div></div>
        <div class="tags">${f.methods.map((m) => `<span class="tag">${ICON[m]}${esc(t('m_' + m))}</span>`).join('')}</div>
        <div class="banks">${f.banks.map(esc).join(' · ')}</div>
      </div>`).join('');
  }

  /* ---------- Rendering: help ---------- */
  function renderHelp() {
    $('#faq').innerHTML = [1, 2, 3, 4].map((i) =>
      `<details><summary>${esc(t('q' + i))}</summary><p>${esc(t('a' + i, { v: C.minOrderUsd }))}</p></details>`).join('');
  }

  /* ---------- i18n apply ---------- */
  function applyLang() {
    const meta = window.LANGS.find((l) => l.code === state.lang) || window.LANGS[0];
    document.documentElement.lang = state.lang;
    document.documentElement.dir = meta.rtl ? 'rtl' : 'ltr';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $('#langCode').textContent = state.lang.toUpperCase();
    renderExchange();
    renderRateStatus();
    renderRates();
    renderMethodsView();
    renderHelp();
  }

  /* ---------- Sheets ---------- */
  function openSheet(html, onMount) {
    const sheet = $('#sheet');
    $('#sheetBody').innerHTML = html;
    sheet.scrollTop = 0;
    $('#backdrop').classList.add('open');
    sheet.classList.add('open');
    if (onMount) onMount($('#sheetBody'));
    if (tgAtLeast('6.1')) { tg.BackButton.show(); }
  }
  function closeSheet() {
    $('#backdrop').classList.remove('open');
    $('#sheet').classList.remove('open');
    if (tgAtLeast('6.1')) tg.BackButton.hide();
  }

  function openAssetPicker(side) {
    const current = state[side];
    let tab = ASSETS[current].type;
    let q = '';
    const html = `
      <h2>${esc(t('select_asset'))}</h2>
      <input class="text-input" id="assetSearch" placeholder="${esc(t('search'))}" autocomplete="off">
      <div class="seg"><button type="button" data-tab="crypto">${esc(t('crypto'))}</button><button type="button" data-tab="fiat">${esc(t('fiat'))}</button></div>
      <div id="assetList"></div>`;
    openSheet(html, (root) => {
      const list = $('#assetList', root);
      const draw = () => {
        $$('.seg button', root).forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
        const src = q ? Object.values(ASSETS) : Object.values(ASSETS).filter((a) => a.type === tab);
        const items = src.filter((a) => !q || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
        list.innerHTML = items.map((a) => `
          <button type="button" class="pick${a.code === current ? ' active' : ''}" data-code="${a.code}">
            ${coinHTML(a.code, 'lg')}
            <span class="name"><b>${esc(a.code)}</b><small>${esc(a.name)}</small></span>
            ${ICON.check}
          </button>`).join('');
      };
      draw();
      $('#assetSearch', root).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
      root.addEventListener('click', (e) => {
        const seg = e.target.closest('[data-tab]');
        if (seg) { tab = seg.dataset.tab; haptic(); draw(); return; }
        const pick = e.target.closest('[data-code]');
        if (pick) { haptic(); setAsset(side, pick.dataset.code); closeSheet(); }
      });
    });
  }

  function openLangPicker() {
    const html = `<h2>${esc(t('language'))}</h2>` + window.LANGS.map((l) => `
      <button type="button" class="pick${l.code === state.lang ? ' active' : ''}" data-lang="${l.code}" dir="${l.rtl ? 'rtl' : 'ltr'}">
        <span class="coin lg fiat">${l.code.toUpperCase()}</span>
        <span class="name"><b>${esc(l.native)}</b></span>
        ${ICON.check}
      </button>`).join('');
    openSheet(html, (root) => {
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-lang]');
        if (!b) return;
        state.lang = b.dataset.lang;
        store.set('lang', state.lang);
        haptic();
        applyLang();
        closeSheet();
      });
    });
  }

  /* ---------- Order ---------- */
  function validate() {
    const err = $('#err');
    const details = $('#details');
    err.textContent = '';
    details.classList.remove('bad');
    const n = parseNum(state.giveAmt);
    if (!(n > 0)) { err.textContent = t('err_amount'); $('#giveAmt').focus(); return false; }
    if (n * R.usd(state.give) < C.minOrderUsd) {
      err.textContent = t('err_min', { v: fmtAsset(minIn(state.give), state.give) });
      $('#giveHint').classList.add('bad');
      return false;
    }
    if (details.value.trim().length < 4) { err.textContent = t('err_details'); details.classList.add('bad'); details.focus(); return false; }
    return true;
  }

  function orderRows(lang) {
    const L = lang || state.lang;
    const g = state.give, r = state.get;
    const net = (c) => (isCrypto(c) ? ` (${state.nets[c]})` : '');
    let rateStr;
    if (!isCrypto(g) && isCrypto(r)) rateStr = `1 ${r} = ${fmtRate(1 / R.client(g, r), L)} ${g}`;
    else rateStr = `1 ${g} = ${fmtRate(R.client(g, r), L)} ${r}`;
    const rows = [
      [t('give', null, L), `${fmtAsset(parseNum(state.giveAmt), g, L)}${net(g)}`],
      [t('get', null, L), `${fmtAsset(parseNum(state.getAmt), r, L)}${net(r)}`, 'big'],
      [t('rate', null, L), rateStr],
    ];
    if (state.method) rows.push([t('method', null, L), t('m_' + state.method, null, L) + (state.bank ? ' · ' + state.bank : '')]);
    rows.push([t('details', null, L), $('#details').value.trim()]);
    return rows;
  }

  function orderText(id) {
    const L = C.orderLang || 'en';
    const lines = [`${t('new_order', null, L)} #${id}`, ''];
    orderRows(L).forEach(([k, v]) => lines.push(`${k}: ${v}`));
    lines.push(`${t('client_lang', null, L)}: ${state.lang.toUpperCase()}`);
    return lines.join('\n');
  }

  function openOrder() {
    if (!validate()) { haptic('err'); return; }
    haptic('ok');
    const id = `${C.brand.orderPrefix}-${Math.floor(10000 + Math.random() * 90000)}`;
    const rows = orderRows();
    const html = `
      <div class="order-id">${esc(t('order_title', { id }))}</div>
      <div class="sum">${rows.map(([k, v, cls]) => `<div class="${cls || ''}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>
      <p class="order-hint">${esc(t('order_hint'))}</p>
      <button type="button" class="gold-btn" id="sendOp">${ICON.send}<span>${esc(t('send_operator'))}</span></button>
      <button type="button" class="gold-btn ghost" id="copyOrder">${ICON.copy}<span>${esc(t('copy'))}</span></button>`;
    openSheet(html, (root) => {
      const text = orderText(id);
      $('#sendOp', root).addEventListener('click', async () => {
        await copyText(text);
        toast(t('copied'));
        openLink(`https://t.me/${encodeURIComponent(C.operator)}?text=${encodeURIComponent(text)}`);
      });
      $('#copyOrder', root).addEventListener('click', async () => {
        if (await copyText(text)) { toast(t('copied')); haptic('ok'); }
      });
    });
  }

  /* ---------- Input handling ---------- */
  function sanitize(v, dp) {
    v = v.replace(/,/g, '.').replace(/[^\d.]/g, '');
    const i = v.indexOf('.');
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, '').slice(0, dp);
    if (/^0\d/.test(v)) v = v.replace(/^0+(?=\d)/, '');
    return v;
  }

  function bindAmount(side) {
    const el = $('#' + side + 'Amt');
    el.addEventListener('input', () => {
      const clean = sanitize(el.value, ASSETS[state[side]].dp);
      if (clean !== el.value) el.value = clean;
      state[side + 'Amt'] = clean;
      state.edited = side;
      $('#err').textContent = '';
      $('#giveHint').classList.remove('bad');
      recalc();
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.blur(); });
  }

  /* ---------- Gold dust background ---------- */
  function startDust() {
    const cv = $('#dust');
    const ctx = cv.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w, h, dpr, parts;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (y) => ({ x: Math.random() * w, y: y != null ? y : Math.random() * h, r: Math.random() * 1.6 + .4, vy: -(Math.random() * .25 + .06), vx: (Math.random() - .5) * .12, p: Math.random() * Math.PI * 2 });
    resize();
    parts = Array.from({ length: Math.round(Math.min(46, w / 9)) }, () => spawn());
    window.addEventListener('resize', resize);
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      parts.forEach((p, i) => {
        if (!reduce) { p.x += p.vx; p.y += p.vy; p.p += .02; }
        if (p.y < -5) parts[i] = spawn(h + 5);
        const a = .25 + Math.sin(p.p) * .2 + .2;
        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 196, 110, ${a.toFixed(3)})`;
        ctx.shadowColor = 'rgba(214,170,76,.8)';
        ctx.shadowBlur = p.r * 4;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      if (!reduce && !document.hidden) requestAnimationFrame(draw);
    };
    draw();
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !reduce) requestAnimationFrame(draw); });
  }

  /* ---------- Rates refresh loop ---------- */
  async function refreshRates() {
    await R.refresh();
    state.countdown = C.refreshSec;
    recalc();
    renderRateLine();
    renderRateStatus();
    renderRates();
  }

  /* ---------- Init ---------- */
  function init() {
    // Telegram
    if (inTG) {
      try { tg.ready(); tg.expand(); } catch (e) { /* ignore */ }
      if (tgAtLeast('6.1')) {
        try { tg.setHeaderColor('#09090a'); tg.setBackgroundColor('#09090a'); } catch (e) { /* ignore */ }
        tg.BackButton.onClick(closeSheet);
      }
      if (tgAtLeast('7.7')) { try { tg.disableVerticalSwipes(); } catch (e) { /* ignore */ } }
      if (tgAtLeast('7.10')) { try { tg.setBottomBarColor('#09090a'); } catch (e) { /* ignore */ } }
    }

    // Brand
    $('#brandName').textContent = C.brand.name;
    document.title = C.brand.name;

    // State
    syncPairOptions();

    // Events
    bindAmount('give');
    bindAmount('get');
    $('#giveAsset').addEventListener('click', () => { haptic(); openAssetPicker('give'); });
    $('#getAsset').addEventListener('click', () => { haptic(); openAssetPicker('get'); });
    $('#swapBtn').addEventListener('click', (e) => {
      haptic('light');
      e.currentTarget.classList.toggle('turn');
      const prevGet = state.getAmt;
      [state.give, state.get] = [state.get, state.give];
      state.giveAmt = prevGet;
      state.edited = 'give';
      syncPairOptions();
      $('#giveAmt').value = state.giveAmt;
      recalc();
      renderExchange();
    });
    $('#netBlock').addEventListener('click', (e) => {
      const b = e.target.closest('[data-net]');
      if (!b) return;
      haptic();
      state.nets[b.dataset.net] = b.dataset.v;
      renderNets();
      renderDetails();
    });
    $('#methodBlock').addEventListener('click', (e) => {
      const m = e.target.closest('[data-method]');
      const b = e.target.closest('[data-bank]');
      if (m) { haptic(); state.method = m.dataset.method; renderMethods(); renderDetails(); }
      if (b) { haptic(); state.bank = b.dataset.bank || null; renderMethods(); }
    });
    $('#details').addEventListener('input', () => { $('#details').classList.remove('bad'); $('#err').textContent = ''; });
    $('#createBtn').addEventListener('click', openOrder);
    $('#langBtn').addEventListener('click', () => { haptic(); openLangPicker(); });
    $('#backdrop').addEventListener('click', closeSheet);
    $('#contactBtn').addEventListener('click', () => { haptic('light'); openLink(`https://t.me/${encodeURIComponent(C.operator)}`); });
    $('#rateFiatChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-rfiat]');
      if (!b) return;
      haptic();
      state.ratesFiat = b.dataset.rfiat;
      renderRates();
    });
    $$('.tab').forEach((tab) => tab.addEventListener('click', () => {
      haptic();
      $$('.tab').forEach((x) => x.classList.toggle('active', x === tab));
      $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + tab.dataset.view));
      window.scrollTo({ top: 0 });
    }));

    applyLang();
    startDust();
    refreshRates();
    setInterval(() => {
      state.countdown -= 1;
      if (state.countdown <= 0) { state.countdown = C.refreshSec; refreshRates(); }
      $('#rateTimer').textContent = t('update_in', { s: state.countdown });
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

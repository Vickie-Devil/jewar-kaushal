// साझा code: Supabase client, गिनती, समर्थन फ़ॉर्म, शेयर लिंक
(function () {
  const C = window.JKA_CONFIG || {};
  const ready = C.SUPABASE_URL && !C.SUPABASE_URL.includes('YOUR-PROJECT') && window.supabase;
  const db = ready ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: false } }) : null;
  const T0 = Date.now();
  // सारे सार्वजनिक फ़ॉर्म इसी सुरक्षित server function से जाते हैं (bot/spam जाँच वहीं होती है)
  async function submit(payload, form) {
    if (!ready) return { status: 0, data: { error: 'config' } };
    const hp = form && form.elements.website ? form.elements.website.value : '';
    const wait = 3100 - (Date.now() - T0); if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      const r = await fetch(C.SUPABASE_URL + '/functions/v1/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ t: Date.now() - T0, website: hp }, payload))
      });
      let data = {}; try { data = await r.json(); } catch (e) {}
      return { status: r.status, data };
    } catch (e) { return { status: 0, data: { error: 'network' } }; }
  }
  window.JKA = { db, C, submit };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

  // लिंक किस स्रोत से आया (?src=wa / yt1 / fb ...)
  let src = null;
  try {
    const p = new URLSearchParams(location.search).get('src');
    if (p && /^[a-z0-9_-]{1,30}$/i.test(p)) sessionStorage.setItem('jka_src', p);
    src = sessionStorage.getItem('jka_src');
  } catch (e) { /* storage बंद हो तो भी काम चले */ }

  // शेयर लिंक
  const base = C.SITE_URL || location.origin + location.pathname;
  // data-url हो तो उसी लेख का लिंक, वरना इसी पन्ने का लिंक
  function shareUrl(tag, target) {
    const u = new URL(target || location.href.split('#')[0].split('?')[0], location.href);
    const keep = u.searchParams.get('s');
    u.hash = ''; u.search = '';
    if (keep && /^[a-z0-9-]{1,80}$/.test(keep)) u.searchParams.set('s', keep);
    u.searchParams.set('src', tag);
    return u.toString();
  }
  function bindShares() {
  $$('[data-share="wa"]:not([data-bound])').forEach((a) => {
    a.dataset.bound = '1';
    const text = (a.dataset.text || 'जेवर में सार्वजनिक कौशल केंद्र चाहिए। अगर आप सहमत हैं, तो अपना समर्थन दर्ज करें:') + ' ' + shareUrl('wa', a.dataset.url);
    a.href = 'https://wa.me/?text=' + encodeURIComponent(text);
    a.target = '_blank'; a.rel = 'noopener';
  });
  $$('[data-share="fb"]:not([data-bound])').forEach((a) => {
    a.dataset.bound = '1';
    a.href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl('fb', a.dataset.url));
    a.target = '_blank'; a.rel = 'noopener';
  });
  $$('[data-share="native"]:not([data-bound])').forEach((b) => {
    b.dataset.bound = '1';
    if (!navigator.share) { b.hidden = true; return; }
    b.addEventListener('click', () => navigator.share({ title: document.title, url: shareUrl('share', b.dataset.url) }).catch(() => {}));
  });
  $$('[data-share="copy"]:not([data-bound])').forEach((b) => { b.dataset.bound = '1'; b.addEventListener('click', async () => {
    const label = b.lastChild;
    try { await navigator.clipboard.writeText(shareUrl('copy', b.dataset.url)); label.textContent = 'लिंक कॉपी हो गया'; }
    catch (e) { label.textContent = 'कॉपी नहीं हुआ'; }
  }); });

  }
  window.JKA.bindShares = bindShares;
  bindShares();

  // लाइव गिनती
  async function loadStats() {
    if (!db || !$('[data-total]')) return;
    const { data, error } = await db.rpc('support_stats');
    if (error || !data) return;
    $$('[data-total]').forEach((el) => (el.textContent = fmt(data.total)));
    const goal = C.GOAL || 5000;
    $$('[data-bar]').forEach((el) => (el.style.width = Math.min(100, (data.total / goal) * 100) + '%'));
    $$('[data-goal-note]').forEach((el) => {
      el.textContent = data.total >= goal
        ? 'लक्ष्य पार हो गया! समर्थन अब भी दर्ज हो रहा है।'
        : 'लक्ष्य तक पहुँचने में ' + fmt(goal - data.total) + ' समर्थन बाकी। 5,000 के बाद भी समर्थन दर्ज होता रहेगा।';
    });
    $$('[data-last]').forEach((el) => {
      el.textContent = data.last_at
        ? new Date(data.last_at).toLocaleString('hi-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : 'अभी कोई समर्थन दर्ज नहीं';
    });
    const box = $('[data-villages]');
    if (box) {
      box.replaceChildren();
      (data.villages || []).forEach((v) => box.append(row(v.name, v.n)));
      if (data.other) box.append(row('अन्य गाँव', data.other));
      if (!box.children.length) {
        const p = document.createElement('p'); p.className = 'empty';
        p.textContent = 'किसी गाँव से 10 समर्थन होते ही उसका नाम यहाँ दिखेगा।';
        box.append(p);
      }
    }
  }
  function row(name, n) {
    const d = document.createElement('div'); d.className = 'vrow';
    const a = document.createElement('span'); a.textContent = name;
    const b = document.createElement('b'); b.textContent = fmt(n);
    d.append(a, b); return d;
  }
  // गुब्बारे दिखते ही हल्का-सा उछलकर आएँ
  const bubbles = $$('.bubble');
  if ('IntersectionObserver' in window) {
    bubbles.forEach((b) => b.classList.add('pop'));
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.4 });
    bubbles.forEach((b) => io.observe(b));
  }
  window.JKA.loadStats = loadStats;
  loadStats();

  // समर्थन फ़ॉर्म
  const form = $('#support-form');
  if (form) form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#support-msg');
    const show = (t, ok) => { msg.hidden = false; msg.className = 'msg ' + (ok ? 'ok' : 'err'); msg.textContent = t; };
    const f = form.elements;
    const name = f.name.value.trim();
    const mobile = f.mobile.value.replace(/\D/g, '').replace(/^(91|0)(?=[6-9]\d{9}$)/, '');
    const village = f.village.value.trim();
    if (name.length < 2) return show('कृपया अपना नाम लिखें।');
    if (!/^[6-9]\d{9}$/.test(mobile)) return show('मोबाइल नंबर 10 अंकों का हो और 6, 7, 8 या 9 से शुरू हो।');
    if (village.length < 2) return show('कृपया अपने गाँव, वार्ड या मोहल्ले का नाम लिखें।');
    if (!f.adult.checked) return show('समर्थन दर्ज करने के लिए उम्र 18 वर्ष या अधिक होनी चाहिए। छोटे बच्चे अपने अभिभावक से समर्थन दर्ज करवाएँ।');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'दर्ज हो रहा है…';
    const res = await submit({ action: 'support', name, mobile, village, adult: true, updates: f.updates.checked, src }, form);
    btn.disabled = false; btn.textContent = 'समर्थन दर्ज करें';
    if (res.status === 409) return show('इस मोबाइल नंबर से समर्थन पहले ही दर्ज है। धन्यवाद!', true);
    if (res.status === 429) return show('इस नेटवर्क से अभी बहुत सारे समर्थन आए हैं। थोड़ी देर बाद दोबारा कोशिश करें।');
    if (res.status === 400) return show('जानकारी सही नहीं लगी। नाम, नंबर और गाँव जाँचकर दोबारा भरें।');
    if (res.status !== 200) return show('समर्थन दर्ज नहीं हो पाया। इंटरनेट जाँचकर दोबारा कोशिश करें।');
    form.hidden = true;
    $('#support-thanks').hidden = false;
    loadStats();
  });
})();

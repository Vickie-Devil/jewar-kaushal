// लेख-पेज: प्रतिक्रियाएँ, हुनर सर्वे, टिप्पणियाँ
(function () {
  const { db, submit } = window.JKA || {};
  const slug = document.body.dataset.slug;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const seen = {
    has(k) { try { return localStorage.getItem('jka_' + k) === '1'; } catch (e) { return false; } },
    set(k) { try { localStorage.setItem('jka_' + k, '1'); } catch (e) {} }
  };
  const el = (tag, cls, text) => { const x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; };

  // ---------- प्रतिक्रियाएँ ----------
  const counts = {};
  async function loadCounts(targets) {
    if (!db || !targets.length) return;
    const { data } = await db.rpc('reaction_counts', { p_targets: targets });
    (data || []).forEach((r) => (counts[r.target + '|' + r.kind] = Number(r.n)));
    $$('[data-react]').forEach(paint);
  }
  function paint(b) {
    const key = b.dataset.target + '|' + b.dataset.react;
    b.querySelector('[data-n]').textContent = fmt(counts[key] || 0);
    if (seen.has('r:' + key)) { b.setAttribute('aria-pressed', 'true'); b.disabled = true; }
  }
  async function react(b) {
    const key = b.dataset.target + '|' + b.dataset.react;
    if (!db || seen.has('r:' + key)) return;
    b.disabled = true;
    const res = await submit({ action: 'react', target: b.dataset.target, kind: b.dataset.react });
    if (res.status !== 200) { b.disabled = false; return; }
    seen.set('r:' + key); counts[key] = (counts[key] || 0) + 1; paint(b);
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-react]'); if (b) react(b);
  });
  $$('[data-react]').forEach((b) => (b.dataset.target = b.dataset.target || 'post:' + slug));

  // ---------- हुनर सर्वे ----------
  const LABELS = { computer: 'कंप्यूटर और डिजिटल काम', electrician: 'इलेक्ट्रिशियन / तकनीकी काम', airport: 'एयरपोर्ट और लॉजिस्टिक्स से जुड़े काम', silai: 'सिलाई, ब्यूटी और घरेलू उद्यम', english: 'अंग्रेज़ी बोलना और इंटरव्यू की तैयारी', other: 'अन्य' };
  const poll = $('#poll-form');
  async function showResults() {
    const box = $('#poll-results'); if (!db || !box) return;
    const { data } = await db.rpc('poll_results');
    const rows = data || []; const total = rows.reduce((s, r) => s + Number(r.n), 0) || 1;
    box.replaceChildren(el('p', null, 'अब तक लोगों की पसंद:'));
    Object.keys(LABELS).forEach((k) => {
      const n = Number((rows.find((r) => r.choice === k) || {}).n || 0);
      const r = el('div', 'result');
      r.append(el('span', null, LABELS[k] + ' · ' + fmt(n)));
      const bar = el('div', 'bar'); const fill = el('span'); fill.style.width = (n / total) * 100 + '%'; bar.append(fill);
      r.append(bar); box.append(r);
    });
    box.hidden = false;
  }
  if (poll) {
    if (seen.has('poll')) { poll.hidden = true; showResults(); }
    poll.addEventListener('submit', async (e) => {
      e.preventDefault();
      const choices = $$('input[name="skill"]:checked', poll).map((i) => i.value);
      const msg = $('#poll-msg');
      if (!choices.length) { msg.hidden = false; msg.className = 'msg err'; msg.textContent = 'कम से कम एक हुनर चुनें।'; return; }
      if (!db) return;
      const res = await submit({ action: 'poll', choices });
      if (res.status !== 200) { msg.hidden = false; msg.className = 'msg err'; msg.textContent = 'राय दर्ज नहीं हो पाई। दोबारा कोशिश करें।'; return; }
      seen.set('poll'); poll.hidden = true; showResults();
    });
  }

  // ---------- टिप्पणियाँ ----------
  const list = $('#comment-list');
  const cform = $('#comment-form');
  let replyTo = null;

  function commentNode(c, isReply) {
    const box = el('div', isReply ? 'reply' + (c.is_official ? ' official' : '') : 'comment');
    const who = el('p', 'who');
    const name = c.is_official ? 'अभियान की ओर से जवाब' : (c.name || 'गुमनाम');
    who.append(el('b', null, name));
    const meta = [c.is_official ? null : c.village, new Date(c.created_at).toLocaleDateString('hi-IN', { day: 'numeric', month: 'short', year: 'numeric' })].filter(Boolean).join(', ');
    who.append(document.createTextNode(' · ' + meta));
    box.append(who, el('p', 'body', c.body));
    if (!isReply) {
      const acts = el('div', 'acts');
      const agree = el('button'); agree.type = 'button';
      agree.dataset.react = 'agree'; agree.dataset.target = 'comment:' + c.id;
      agree.append(document.createTextNode('सहमत · ')); const n = el('span'); n.dataset.n = ''; agree.append(n);
      const rep = el('button', null, 'जवाब दें'); rep.type = 'button';
      rep.addEventListener('click', () => startReply(c));
      acts.append(agree, rep); box.append(acts);
    }
    return box;
  }
  async function loadComments() {
    if (!db || !list) return;
    const { data, error } = await db.from('comments')
      .select('id,parent_id,name,village,body,is_official,created_at')
      .eq('post_slug', slug).order('created_at', { ascending: true });
    if (error) return;
    const all = data || [];
    $$('[data-ccount]').forEach((x) => (x.textContent = fmt(all.length)));
    list.replaceChildren();
    const tops = all.filter((c) => !c.parent_id).reverse();
    if (!tops.length) {
      list.append(el('p', 'empty', 'अभी कोई टिप्पणी नहीं है। सबसे पहले अपनी बात लिखिए।'));
      loadCounts(['post:' + slug]); return;
    }
    tops.forEach((c) => {
      const node = commentNode(c, false);
      all.filter((r) => r.parent_id === c.id).forEach((r) => node.append(commentNode(r, true)));
      list.append(node);
    });
    loadCounts(['post:' + slug].concat(tops.map((c) => 'comment:' + c.id)));
  }
  function startReply(c) {
    replyTo = c.id;
    const bar = $('#replying'); bar.hidden = false;
    $('#replying-name').textContent = c.name || 'गुमनाम';
    cform.elements.body.focus();
  }
  const cancel = $('#reply-cancel');
  if (cancel) cancel.addEventListener('click', () => { replyTo = null; $('#replying').hidden = true; });

  if (cform) cform.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = cform.elements; const msg = $('#comment-msg');
    const show = (t, ok) => { msg.hidden = false; msg.className = 'msg ' + (ok ? 'ok' : 'err'); msg.textContent = t; };
    const anon = f.anon.checked;
    const name = f.name.value.trim(); const village = f.village.value.trim(); const body = f.body.value.trim();
    if (!anon && name.length < 2) return show('अपना नाम लिखें, या "मेरा नाम न दिखाएँ" चुनें।');
    if (body.length < 3) return show('कृपया अपनी बात लिखें।');
    if (body.length > 1500) return show('टिप्पणी 1500 अक्षरों से छोटी रखें।');
    if (!db) return show('पोर्टल अभी database से जुड़ा नहीं है।');
    const btn = cform.querySelector('button[type="submit"]'); btn.disabled = true;
    const res = await submit({ action: 'comment', slug, parent_id: replyTo, anon, name, village, body }, cform);
    btn.disabled = false;
    if (res.status === 429) return show('आप बहुत जल्दी-जल्दी टिप्पणी भेज रहे हैं। थोड़ी देर बाद कोशिश करें।');
    if (res.status !== 200) return show('टिप्पणी नहीं भेजी जा सकी। दोबारा कोशिश करें।');
    cform.reset(); replyTo = null; $('#replying').hidden = true;
    show('आपकी टिप्पणी मिल गई। जाँच के बाद यहाँ दिखेगी। धन्यवाद!', true);
  });

  loadComments();
  if (!list) loadCounts(['post:' + slug]);
  else if (!db) $$('[data-react]').forEach(paint);
})();

// संचालक कक्ष: लॉगिन, समर्थक, टिप्पणियाँ, लेख (सारी सुरक्षा database के RLS नियमों में है)
(function () {
  const C = window.JKA_CONFIG || {};
  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: 'jka-admin' } });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const when = (d) => new Date(d).toLocaleString('hi-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const msg = (id, t, ok) => { const m = $(id); m.hidden = false; m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = t; };
  const LABELS = { computer: 'कंप्यूटर और डिजिटल', electrician: 'इलेक्ट्रिशियन / तकनीकी', airport: 'एयरपोर्ट और लॉजिस्टिक्स', silai: 'सिलाई, ब्यूटी, घरेलू उद्यम', english: 'अंग्रेज़ी और इंटरव्यू', other: 'अन्य' };

  // ---------- लॉगिन ----------
  async function start() {
    const { data } = await db.auth.getSession();
    if (!data.session) return showLogin();
    const { data: ok } = await db.rpc('is_admin');
    if (!ok) { await db.auth.signOut(); return showLogin('इस खाते को संचालक की अनुमति नहीं है।'); }
    $('#login-view').hidden = true; $('#app-view').hidden = false; $('#who').hidden = false;
    $('#who-email').textContent = data.session.user.email;
    openTab('summary');
  }
  function showLogin(t) { $('#app-view').hidden = true; $('#who').hidden = true; $('#login-view').hidden = false; if (t) msg('#login-msg', t); }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements; const btn = e.target.querySelector('button');
    btn.disabled = true;
    const { error } = await db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    btn.disabled = false; f.password.value = '';
    if (error) return msg('#login-msg', 'ईमेल या पासवर्ड गलत है।');
    start();
  });
  $('#logout').addEventListener('click', async () => { await db.auth.signOut(); location.reload(); });

  // ---------- टैब ----------
  function openTab(name) {
    $$('.tabs button').forEach((b) => { if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $$('.tab').forEach((t) => (t.hidden = t.id !== 'tab-' + name));
    ({ summary: loadSummary, supporters: loadSupporters, comments: loadComments, posts: loadPosts })[name]();
  }
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab)));

  // ---------- सारांश ----------
  async function loadSummary() {
    const { data, error } = await db.rpc('admin_summary');
    const box = $('#stats'); box.replaceChildren();
    if (error || !data) { box.append(el('p', 'empty', 'सारांश लोड नहीं हुआ।')); return; }
    [['कुल समर्थन', data.supporters], ['आज', data.today], ['अपडेट चाहने वाले', data.wants_updates], ['मंज़ूरी बाकी टिप्पणियाँ', data.pending_comments], ['लेख', data.posts]].forEach(([k, v]) => {
      const d = el('div', 'stat'); d.append(el('b', null, fmt(v)), el('span', 'small', k)); box.append(d);
    });
    const badge = $('#pending-badge'); badge.hidden = !data.pending_comments; badge.textContent = data.pending_comments;
    const src = $('#by-src'); src.replaceChildren();
    (data.by_src || []).forEach((r) => { const d = el('div', 'vrow'); d.append(el('span', null, r.src), el('b', null, fmt(r.n))); src.append(d); });
    if (!(data.by_src || []).length) src.append(el('p', 'empty', 'अभी कोई समर्थन नहीं।'));
    const { data: poll } = await db.rpc('poll_results');
    const pb = $('#poll'); pb.replaceChildren();
    Object.keys(LABELS).forEach((k) => { const n = ((poll || []).find((r) => r.choice === k) || {}).n || 0; const d = el('div', 'vrow'); d.append(el('span', null, LABELS[k]), el('b', null, fmt(n))); pb.append(d); });
  }

  // ---------- समर्थक ----------
  let supporters = [];
  async function loadSupporters() {
    $('#sup-count').textContent = 'लोड हो रहा है…';
    supporters = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('supporters').select('id,name,mobile,village,wants_updates,src,created_at').order('created_at', { ascending: false }).range(from, from + 999);
      if (error) { $('#sup-count').textContent = 'सूची लोड नहीं हुई।'; return; }
      supporters = supporters.concat(data);
      if (data.length < 1000) break;
    }
    drawSupporters();
  }
  function drawSupporters() {
    const q = $('#sup-search').value.trim().toLowerCase();
    const rows = supporters.filter((s) => !q || (s.name + ' ' + s.mobile + ' ' + s.village).toLowerCase().includes(q));
    $('#sup-count').textContent = fmt(rows.length) + ' समर्थक' + (q ? ' (खोज के अनुसार)' : '');
    const tb = $('#sup-rows'); tb.replaceChildren();
    rows.slice(0, 500).forEach((s) => {
      const tr = el('tr');
      [s.name, s.mobile, s.village, s.wants_updates ? 'हाँ' : '—', s.src || 'सीधा', when(s.created_at)].forEach((v) => tr.append(el('td', null, v)));
      const td = el('td'); const del = el('button', 'linkbtn', 'हटाएँ'); del.type = 'button';
      del.addEventListener('click', async () => {
        if (!confirm(s.name + ' (' + s.mobile + ') का समर्थन हटाना है? यह वापस नहीं आएगा।')) return;
        const { error } = await db.from('supporters').delete().eq('id', s.id);
        if (!error) { supporters = supporters.filter((x) => x.id !== s.id); drawSupporters(); }
      });
      td.append(del); tr.append(td); tb.append(tr);
    });
    if (rows.length > 500) { const tr = el('tr'); const td = el('td', 'small', 'पहले 500 दिख रहे हैं। पूरी सूची के लिए CSV डाउनलोड करें।'); td.colSpan = 7; tr.append(td); tb.append(tr); }
  }
  $('#sup-search').addEventListener('input', drawSupporters);
  $('#sup-reload').addEventListener('click', loadSupporters);
  $('#sup-csv').addEventListener('click', () => {
    const safe = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const lines = [['नाम', 'मोबाइल', 'गाँव', 'अपडेट चाहिए', 'स्रोत', 'तारीख'].map(safe).join(',')]
      .concat(supporters.map((s) => [s.name, s.mobile, s.village, s.wants_updates ? 'हाँ' : 'नहीं', s.src || 'सीधा', when(s.created_at)].map(safe).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'jewar-samarthak-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  // ---------- टिप्पणियाँ ----------
  let cfilter = 'pending';
  $$('[data-cfilter]').forEach((b) => b.addEventListener('click', () => {
    cfilter = b.dataset.cfilter; $$('[data-cfilter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); loadComments();
  }));
  async function loadComments() {
    const box = $('#c-list'); box.replaceChildren(el('p', 'empty', 'लोड हो रहा है…'));
    const { data, error } = await db.from('comments').select('id,post_slug,parent_id,name,village,body,is_official,approved,created_at')
      .eq('approved', cfilter === 'approved').order('created_at', { ascending: false }).limit(200);
    box.replaceChildren();
    if (error) return box.append(el('p', 'empty', 'टिप्पणियाँ लोड नहीं हुईं।'));
    if (!data.length) return box.append(el('p', 'empty', cfilter === 'pending' ? 'कोई टिप्पणी मंज़ूरी के लिए बाकी नहीं है।' : 'अभी कोई प्रकाशित टिप्पणी नहीं।'));
    data.forEach((c) => {
      const d = el('div', 'comment');
      const who = el('p', 'who'); who.append(el('b', null, c.is_official ? 'अभियान' : (c.name || 'गुमनाम')), document.createTextNode(' · ' + [c.village, 'लेख: ' + c.post_slug, when(c.created_at), c.parent_id ? 'किसी टिप्पणी का जवाब' : null].filter(Boolean).join(' · ')));
      d.append(who, el('p', 'body', c.body));
      const acts = el('div', 'acts');
      if (!c.approved) {
        const ok = el('button', 'linkbtn ok', 'मंज़ूर करें'); ok.type = 'button';
        ok.addEventListener('click', async () => { const { error } = await db.from('comments').update({ approved: true }).eq('id', c.id); if (!error) d.remove(); });
        acts.append(ok);
      }
      const del = el('button', 'linkbtn', 'हटाएँ'); del.type = 'button';
      del.addEventListener('click', async () => { if (!confirm('यह टिप्पणी हटानी है?')) return; const { error } = await db.from('comments').delete().eq('id', c.id); if (!error) d.remove(); });
      acts.append(del);
      if (!c.parent_id) {
        const rep = el('button', 'linkbtn blue', 'अभियान की ओर से जवाब दें'); rep.type = 'button';
        rep.addEventListener('click', () => {
          if (d.querySelector('.reply-box')) return;
          const rb = el('div', 'reply-box'); const inp = el('input'); inp.maxLength = 1500; inp.placeholder = 'जवाब लिखें';
          const send = el('button', 'btn btn-primary', 'भेजें'); send.type = 'button';
          send.addEventListener('click', async () => {
            const body = inp.value.trim(); if (body.length < 3) return;
            send.disabled = true;
            const up = c.approved ? { error: null } : await db.from('comments').update({ approved: true }).eq('id', c.id);
            const { error } = await db.from('comments').insert({ post_slug: c.post_slug, parent_id: c.id, body, is_official: true, approved: true, name: 'अभियान' });
            send.disabled = false;
            if (!error && !up.error) { rb.replaceWith(el('p', 'msg ok', 'जवाब प्रकाशित हो गया (टिप्पणी भी मंज़ूर हुई)।')); }
          });
          rb.append(inp, send); d.append(rb); inp.focus();
        });
        acts.append(rep);
      }
      d.append(acts); box.append(d);
    });
  }

  // ---------- लेख ----------
  const pf = $('#post-form'); const F = pf.elements;
  let editing = null;
  async function loadPosts() {
    const box = $('#post-list'); box.replaceChildren(el('p', 'empty', 'लोड हो रहा है…'));
    const { data, error } = await db.from('posts').select('*').order('published_at', { ascending: false }).order('id', { ascending: false });
    box.replaceChildren();
    if (error) return box.append(el('p', 'empty', 'लेख लोड नहीं हुए।'));
    data.forEach((p) => {
      const r = el('div', 'post-row');
      const left = el('div'); left.append(el('b', null, p.title), el('br'), el('span', 'small', [p.category, p.published_at, p.static_url ? 'पुराना (फ़ाइल वाला) लेख' : null].filter(Boolean).join(' · ')));
      const right = el('div', 'chips');
      right.append(el('span', 'pill' + (p.published ? '' : ' off'), p.published ? 'प्रकाशित' : 'मसौदा'));
      const link = (C.SITE_URL || '') + (p.static_url || 'lekh/?s=' + p.slug);
      const open = el('a', 'linkbtn blue', 'देखें'); open.href = p.static_url || 'lekh/?s=' + p.slug; open.target = '_blank'; open.rel = 'noopener';
      const copy = el('button', 'linkbtn blue', 'लिंक कॉपी'); copy.type = 'button';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); copy.textContent = 'कॉपी हो गया'; } catch (e) { prompt('लिंक:', link); } });
      right.append(open, copy);
      if (!p.static_url) {
        const ed = el('button', 'linkbtn blue', 'बदलें'); ed.type = 'button'; ed.addEventListener('click', () => editPost(p)); right.append(ed);
      }
      const tog = el('button', 'linkbtn' + (p.published ? '' : ' ok'), p.published ? 'छिपाएँ' : 'प्रकाशित करें'); tog.type = 'button';
      tog.addEventListener('click', async () => { const { error } = await db.from('posts').update({ published: !p.published, updated_at: new Date().toISOString() }).eq('id', p.id); if (!error) loadPosts(); });
      const del = el('button', 'linkbtn', 'हटाएँ'); del.type = 'button';
      del.addEventListener('click', async () => { if (!confirm('"' + p.title + '" हटाना है? इसकी टिप्पणियाँ नहीं हटेंगी।')) return; const { error } = await db.from('posts').delete().eq('id', p.id); if (!error) loadPosts(); });
      right.append(tog, del);
      r.append(left, right); box.append(r);
    });
    if (!data.length) box.append(el('p', 'empty', 'अभी कोई लेख नहीं।'));
  }
  function editPost(p) {
    editing = p || null; pf.reset(); pf.hidden = false; $('#post-msg').hidden = true; $('#post-preview-box').hidden = true;
    $('#post-form-title').textContent = p ? 'लेख बदलें' : 'नया लेख';
    F.id.value = p ? p.id : ''; F.title.value = p ? p.title : ''; F.summary.value = p ? p.summary || '' : '';
    F.category.value = p ? p.category || '' : ''; F.published_at.value = p ? p.published_at : new Date().toISOString().slice(0, 10);
    F.slug.value = p ? p.slug : ''; F.body.value = p ? p.body || '' : ''; F.published.checked = p ? p.published : true;
    $('#img-now').textContent = p && p.image_url ? 'अभी की तस्वीर लगी है (नई चुनेंगे तो बदल जाएगी)।' : '';
    F.title.focus(); pf.scrollIntoView({ behavior: 'smooth' });
  }
  $('#post-new').addEventListener('click', () => editPost(null));
  $('#post-cancel').addEventListener('click', () => { pf.hidden = true; editing = null; });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const bodyToHtml = (t) => String(t || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) =>
    b.startsWith('## ') ? '<h2>' + inline(b.slice(3)) + '</h2>' : b.startsWith('> ') ? '<blockquote>' + inline(b.replace(/^> ?/gm, '')) + '</blockquote>' : '<p>' + inline(b).replace(/\n/g, '<br>') + '</p>').join('\n');
  $('#post-preview').addEventListener('click', () => {
    const box = $('#post-preview-box'); box.hidden = false;
    box.innerHTML = '<h1 style="margin-top:0">' + esc(F.title.value) + '</h1>' + (F.summary.value ? '<p class="small">' + esc(F.summary.value) + '</p>' : '') + bodyToHtml(F.body.value);
  });
  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const slug = F.slug.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    F.slug.value = slug;
    if (F.title.value.trim().length < 3) return msg('#post-msg', 'शीर्षक लिखें।');
    if (!slug) return msg('#post-msg', 'लिंक का नाम अंग्रेज़ी अक्षरों में लिखें, जैसे degree-aur-hunar');
    if (F.body.value.trim().length < 20) return msg('#post-msg', 'लेख का पाठ लिखें।');
    const btn = pf.querySelector('button[type="submit"]'); btn.disabled = true; msg('#post-msg', 'सहेजा जा रहा है…', true);
    let image_url = editing ? editing.image_url : null;
    const file = F.image.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { btn.disabled = false; return msg('#post-msg', 'तस्वीर 5 MB से छोटी होनी चाहिए।'); }
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file.type];
      if (!ext) { btn.disabled = false; return msg('#post-msg', 'सिर्फ़ JPG, PNG या WebP तस्वीर चलेगी।'); }
      const path = slug + '-' + Date.now() + '.' + ext;
      const up = await db.storage.from('post-images').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { btn.disabled = false; return msg('#post-msg', 'तस्वीर upload नहीं हुई।'); }
      image_url = db.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    }
    const row = { slug, title: F.title.value.trim(), summary: F.summary.value.trim() || null, category: F.category.value.trim() || null,
      published_at: F.published_at.value || new Date().toISOString().slice(0, 10), body: F.body.value, image_url, published: F.published.checked, updated_at: new Date().toISOString() };
    const q = editing ? db.from('posts').update(row).eq('id', editing.id) : db.from('posts').insert(row);
    const { error } = await q;
    btn.disabled = false;
    if (error) return msg('#post-msg', error.code === '23505' ? 'यह लिंक-नाम पहले से है। कोई दूसरा नाम रखें।' : 'लेख सहेजा नहीं गया।');
    msg('#post-msg', row.published ? 'लेख प्रकाशित हो गया! मुखपृष्ठ पर सबसे ऊपर दिखेगा।' : 'मसौदा सहेज लिया गया (साइट पर नहीं दिखेगा)।', true);
    editing = null; loadPosts();
  });

  start();
})();

// Admin panel: login, supporters, comments, blog posts. All real security is in the database RLS rules.
(function () {
  const C = window.JKA_CONFIG || {};
  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, storageKey: 'jka-admin' } });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  // ---------- Language (English default, Hindi on button) ----------
  const I18N = {
    en: {
      adminRoom: 'Admin panel', logout: 'Log out', loginTitle: 'Admin login', loginNote: 'This page is only for the campaign administrator.',
      email: 'Email', password: 'Password', login: 'Log in', tabSummary: 'Overview', tabSupporters: 'Supporters', tabComments: 'Comments', tabPosts: 'Blog posts',
      bySource: 'Where support came from', search: 'Search', searchPh: 'Search by name, mobile or village', refresh: 'Refresh', downloadCsv: 'Download Excel (CSV)',
      colName: 'Name', colMobile: 'Mobile', colVillage: 'Village', colUpdates: 'Updates?', colSource: 'Source', colDate: 'Date',
      pending: 'Awaiting approval', published: 'Published', newPost: '+ Write a new post', fTitle: 'Title', fSummary: 'Short summary (shown on cards and WhatsApp)',
      fCategory: 'Category', fDate: 'Date', fSlug: 'Link name (English letters, e.g. degree-aur-hunar)', fImage: 'Cover image (JPG/PNG/WebP, up to 5 MB)', fBody: 'Post text',
      bodyPh: 'Leave one empty line between paragraphs.\n## at the start of a line = sub-heading\n> at the start of a line = big quote\n**word** = bold',
      fPublish: 'Publish now (visible on the site)', preview: 'Preview', save: 'Save', cancel: 'Cancel', footer: 'Admin panel · This data is private. Do not share it.',
      noAccess: 'This account is not allowed to use the admin panel.', badLogin: 'Wrong email or password.',
      sTotal: 'Total supporters', sToday: 'Today', sUpdates: 'Want WhatsApp updates', sPending: 'Comments awaiting approval', sPosts: 'Blog posts',
      summaryFail: 'Could not load the overview.', noSupport: 'No supporters yet.', direct: 'Direct', loading: 'Loading…', listFail: 'Could not load the list.',
      supporters: ' supporters', bySearch: ' (matching search)', yes: 'Yes', no: 'No', remove: 'Delete',
      confirmSup: (n, m) => 'Delete the support of ' + n + ' (' + m + ')? This cannot be undone.', first500: 'Showing the first 500. Download the CSV for the full list.',
      csvHead: ['Name', 'Mobile', 'Village', 'Wants updates', 'Source', 'Date'],
      cFail: 'Could not load comments.', cNonePending: 'No comments are waiting for approval.', cNoneApproved: 'No published comments yet.',
      campaign: 'Campaign', anonymous: 'Anonymous', post: 'Post: ', isReply: 'reply to a comment', approve: 'Approve', confirmC: 'Delete this comment?',
      replyAs: 'Reply as the campaign', replyPh: 'Write a reply', send: 'Send', replied: 'Reply published (the comment was approved too).',
      pFail: 'Could not load posts.', pNone: 'No posts yet.', oldPost: 'old (file-based) post', live: 'Published', draft: 'Draft', view: 'View', copyLink: 'Copy link', copied: 'Copied',
      edit: 'Edit', hide: 'Hide', publish: 'Publish', confirmP: (x) => 'Delete "' + x + '"? Its comments will not be deleted.',
      editTitle: 'Edit post', newTitle: 'New post', imgNow: 'A cover image is set (choosing a new one will replace it).',
      eTitle: 'Write a title.', eSlug: 'Write the link name in English letters, e.g. degree-aur-hunar', eBody: 'Write the post text.', saving: 'Saving…',
      eSize: 'The image must be smaller than 5 MB.', eType: 'Only JPG, PNG or WebP images are allowed.', eUpload: 'The image could not be uploaded.',
      eDup: 'This link name already exists. Choose another one.', eSave: 'The post was not saved.',
      okLive: 'Post published! It will appear at the top of the homepage.', okDraft: 'Draft saved (not visible on the site).'
    },
    hi: {
      adminRoom: 'संचालक कक्ष', logout: 'बाहर निकलें', loginTitle: 'संचालक लॉगिन', loginNote: 'यह पन्ना सिर्फ़ अभियान के संचालक के लिए है।',
      email: 'ईमेल', password: 'पासवर्ड', login: 'लॉगिन करें', tabSummary: 'सारांश', tabSupporters: 'समर्थक', tabComments: 'टिप्पणियाँ', tabPosts: 'लेख',
      bySource: 'समर्थन कहाँ से आया', search: 'खोजें', searchPh: 'नाम, नंबर या गाँव से खोजें', refresh: 'ताज़ा करें', downloadCsv: 'Excel (CSV) डाउनलोड',
      colName: 'नाम', colMobile: 'मोबाइल', colVillage: 'गाँव', colUpdates: 'अपडेट?', colSource: 'स्रोत', colDate: 'तारीख',
      pending: 'मंज़ूरी बाकी', published: 'प्रकाशित', newPost: '+ नया लेख लिखें', fTitle: 'शीर्षक', fSummary: 'छोटा सार (कार्ड और WhatsApp झलक में दिखेगा)',
      fCategory: 'श्रेणी', fDate: 'तारीख', fSlug: 'लिंक का नाम (अंग्रेज़ी अक्षर, जैसे degree-aur-hunar)', fImage: 'मुख्य तस्वीर (JPG/PNG/WebP, 5 MB तक)', fBody: 'लेख का पाठ',
      bodyPh: 'पैराग्राफ़ के बीच एक खाली लाइन छोड़ें।\n## से शुरू लाइन = उपशीर्षक\n> से शुरू लाइन = बड़ा उद्धरण\n**शब्द** = मोटे अक्षर',
      fPublish: 'अभी प्रकाशित करें (साइट पर दिखे)', preview: 'झलक देखें', save: 'सहेजें', cancel: 'रद्द करें', footer: 'संचालक कक्ष · यहाँ का डेटा निजी है, किसी से साझा न करें।',
      noAccess: 'इस खाते को संचालक की अनुमति नहीं है।', badLogin: 'ईमेल या पासवर्ड गलत है।',
      sTotal: 'कुल समर्थन', sToday: 'आज', sUpdates: 'अपडेट चाहने वाले', sPending: 'मंज़ूरी बाकी टिप्पणियाँ', sPosts: 'लेख',
      summaryFail: 'सारांश लोड नहीं हुआ।', noSupport: 'अभी कोई समर्थन नहीं।', direct: 'सीधा', loading: 'लोड हो रहा है…', listFail: 'सूची लोड नहीं हुई।',
      supporters: ' समर्थक', bySearch: ' (खोज के अनुसार)', yes: 'हाँ', no: 'नहीं', remove: 'हटाएँ',
      confirmSup: (n, m) => n + ' (' + m + ') का समर्थन हटाना है? यह वापस नहीं आएगा।', first500: 'पहले 500 दिख रहे हैं। पूरी सूची के लिए CSV डाउनलोड करें।',
      csvHead: ['नाम', 'मोबाइल', 'गाँव', 'अपडेट चाहिए', 'स्रोत', 'तारीख'],
      cFail: 'टिप्पणियाँ लोड नहीं हुईं।', cNonePending: 'कोई टिप्पणी मंज़ूरी के लिए बाकी नहीं है।', cNoneApproved: 'अभी कोई प्रकाशित टिप्पणी नहीं।',
      campaign: 'अभियान', anonymous: 'गुमनाम', post: 'लेख: ', isReply: 'किसी टिप्पणी का जवाब', approve: 'मंज़ूर करें', confirmC: 'यह टिप्पणी हटानी है?',
      replyAs: 'अभियान की ओर से जवाब दें', replyPh: 'जवाब लिखें', send: 'भेजें', replied: 'जवाब प्रकाशित हो गया (टिप्पणी भी मंज़ूर हुई)।',
      pFail: 'लेख लोड नहीं हुए।', pNone: 'अभी कोई लेख नहीं।', oldPost: 'पुराना (फ़ाइल वाला) लेख', live: 'प्रकाशित', draft: 'मसौदा', view: 'देखें', copyLink: 'लिंक कॉपी', copied: 'कॉपी हो गया',
      edit: 'बदलें', hide: 'छिपाएँ', publish: 'प्रकाशित करें', confirmP: (x) => '"' + x + '" हटाना है? इसकी टिप्पणियाँ नहीं हटेंगी।',
      editTitle: 'लेख बदलें', newTitle: 'नया लेख', imgNow: 'अभी की तस्वीर लगी है (नई चुनेंगे तो बदल जाएगी)।',
      eTitle: 'शीर्षक लिखें।', eSlug: 'लिंक का नाम अंग्रेज़ी अक्षरों में लिखें, जैसे degree-aur-hunar', eBody: 'लेख का पाठ लिखें।', saving: 'सहेजा जा रहा है…',
      eSize: 'तस्वीर 5 MB से छोटी होनी चाहिए।', eType: 'सिर्फ़ JPG, PNG या WebP तस्वीर चलेगी।', eUpload: 'तस्वीर upload नहीं हुई।',
      eDup: 'यह लिंक-नाम पहले से है। कोई दूसरा नाम रखें।', eSave: 'लेख सहेजा नहीं गया।',
      okLive: 'लेख प्रकाशित हो गया! मुखपृष्ठ पर सबसे ऊपर दिखेगा।', okDraft: 'मसौदा सहेज लिया गया (साइट पर नहीं दिखेगा)।'
    }
  };
  let lang = 'en';
  try { lang = localStorage.getItem('jka-admin-lang') === 'hi' ? 'hi' : 'en'; } catch (e) {}
  const t = (k) => I18N[lang][k];
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const when = (d) => new Date(d).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const msg = (id, txt, ok) => { const m = $(id); m.hidden = false; m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = txt; };
  let currentTab = null;

  function applyLang() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((e) => (e.textContent = t(e.dataset.i18n)));
    $$('[data-i18n-ph]').forEach((e) => (e.placeholder = t(e.dataset.i18nPh)));
    $('#lang-toggle').textContent = lang === 'en' ? 'हिंदी' : 'English';
    if (!$('#post-form').hidden) $('#post-form-title').textContent = editing ? t('editTitle') : t('newTitle');
    if (currentTab) openTab(currentTab);
  }
  $('#lang-toggle').addEventListener('click', () => {
    lang = lang === 'en' ? 'hi' : 'en';
    try { localStorage.setItem('jka-admin-lang', lang); } catch (e) {}
    applyLang();
  });

  // ---------- Login ----------
  async function start() {
    const { data } = await db.auth.getSession();
    if (!data.session) return showLogin();
    const { data: ok } = await db.rpc('is_admin');
    if (!ok) { await db.auth.signOut(); return showLogin(t('noAccess')); }
    $('#login-view').hidden = true; $('#app-view').hidden = false;
    $('#logout').hidden = false; $('#who-email').hidden = false;
    $('#who-email').textContent = data.session.user.email;
    openTab('summary');
  }
  function showLogin(txt) { $('#app-view').hidden = true; $('#logout').hidden = true; $('#who-email').hidden = true; $('#login-view').hidden = false; if (txt) msg('#login-msg', txt); }
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target.elements; const btn = e.target.querySelector('button');
    btn.disabled = true;
    const { error } = await db.auth.signInWithPassword({ email: f.email.value.trim(), password: f.password.value });
    btn.disabled = false; f.password.value = '';
    if (error) return msg('#login-msg', t('badLogin'));
    start();
  });
  $('#logout').addEventListener('click', async () => { await db.auth.signOut(); location.reload(); });

  // ---------- Tabs ----------
  function openTab(name) {
    currentTab = name;
    $$('.tabs button').forEach((b) => { if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $$('.tab').forEach((x) => (x.hidden = x.id !== 'tab-' + name));
    ({ summary: loadSummary, supporters: loadSupporters, comments: loadComments, posts: loadPosts })[name]();
  }
  $$('.tabs button').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.tab)));

  // ---------- Overview ----------
  async function loadSummary() {
    const { data, error } = await db.rpc('admin_summary');
    const box = $('#stats'); box.replaceChildren();
    if (error || !data) { box.append(el('p', 'empty', t('summaryFail'))); return; }
    [['sTotal', data.supporters], ['sToday', data.today], ['sUpdates', data.wants_updates], ['sPending', data.pending_comments], ['sPosts', data.posts]].forEach(([k, v]) => {
      const d = el('div', 'stat'); d.append(el('b', null, fmt(v)), el('span', 'small', t(k))); box.append(d);
    });
    const badge = $('#pending-badge'); badge.hidden = !data.pending_comments; badge.textContent = data.pending_comments;
    const src = $('#by-src'); src.replaceChildren();
    (data.by_src || []).forEach((r) => { const d = el('div', 'vrow'); d.append(el('span', null, r.src === 'सीधा' ? t('direct') : r.src), el('b', null, fmt(r.n))); src.append(d); });
    if (!(data.by_src || []).length) src.append(el('p', 'empty', t('noSupport')));
  }

  // ---------- Supporters ----------
  let supporters = [];
  async function loadSupporters() {
    $('#sup-count').textContent = t('loading');
    supporters = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('supporters').select('id,name,mobile,village,wants_updates,src,created_at').order('created_at', { ascending: false }).range(from, from + 999);
      if (error) { $('#sup-count').textContent = t('listFail'); return; }
      supporters = supporters.concat(data);
      if (data.length < 1000) break;
    }
    drawSupporters();
  }
  function drawSupporters() {
    const q = $('#sup-search').value.trim().toLowerCase();
    const rows = supporters.filter((s) => !q || (s.name + ' ' + s.mobile + ' ' + s.village).toLowerCase().includes(q));
    $('#sup-count').textContent = fmt(rows.length) + t('supporters') + (q ? t('bySearch') : '');
    const tb = $('#sup-rows'); tb.replaceChildren();
    rows.slice(0, 500).forEach((s) => {
      const tr = el('tr');
      [s.name, s.mobile, s.village, s.wants_updates ? t('yes') : '—', s.src || t('direct'), when(s.created_at)].forEach((v) => tr.append(el('td', null, v)));
      const td = el('td'); const del = el('button', 'linkbtn', t('remove')); del.type = 'button';
      del.addEventListener('click', async () => {
        if (!confirm(t('confirmSup')(s.name, s.mobile))) return;
        const { error } = await db.from('supporters').delete().eq('id', s.id);
        if (!error) { supporters = supporters.filter((x) => x.id !== s.id); drawSupporters(); }
      });
      td.append(del); tr.append(td); tb.append(tr);
    });
    if (rows.length > 500) { const tr = el('tr'); const td = el('td', 'small', t('first500')); td.colSpan = 7; tr.append(td); tb.append(tr); }
  }
  $('#sup-search').addEventListener('input', drawSupporters);
  $('#sup-reload').addEventListener('click', loadSupporters);
  $('#sup-csv').addEventListener('click', () => {
    const safe = (v) => { let s = String(v == null ? '' : v); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
    const lines = [t('csvHead').map(safe).join(',')]
      .concat(supporters.map((s) => [s.name, s.mobile, s.village, s.wants_updates ? t('yes') : t('no'), s.src || t('direct'), when(s.created_at)].map(safe).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'jewar-supporters-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  // ---------- Comments ----------
  let cfilter = 'pending';
  $$('[data-cfilter]').forEach((b) => b.addEventListener('click', () => {
    cfilter = b.dataset.cfilter; $$('[data-cfilter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); loadComments();
  }));
  async function loadComments() {
    const box = $('#c-list'); box.replaceChildren(el('p', 'empty', t('loading')));
    const { data, error } = await db.from('comments').select('id,post_slug,parent_id,name,village,body,is_official,approved,created_at')
      .eq('approved', cfilter === 'approved').order('created_at', { ascending: false }).limit(200);
    box.replaceChildren();
    if (error) return box.append(el('p', 'empty', t('cFail')));
    if (!data.length) return box.append(el('p', 'empty', cfilter === 'pending' ? t('cNonePending') : t('cNoneApproved')));
    data.forEach((c) => {
      const d = el('div', 'comment');
      const who = el('p', 'who');
      who.append(el('b', null, c.is_official ? t('campaign') : (c.name || t('anonymous'))), document.createTextNode(' · ' + [c.village, t('post') + c.post_slug, when(c.created_at), c.parent_id ? t('isReply') : null].filter(Boolean).join(' · ')));
      d.append(who, el('p', 'body', c.body));
      const acts = el('div', 'acts');
      if (!c.approved) {
        const ok = el('button', 'linkbtn ok', t('approve')); ok.type = 'button';
        ok.addEventListener('click', async () => { const { error } = await db.from('comments').update({ approved: true }).eq('id', c.id); if (!error) d.remove(); });
        acts.append(ok);
      }
      const del = el('button', 'linkbtn', t('remove')); del.type = 'button';
      del.addEventListener('click', async () => { if (!confirm(t('confirmC'))) return; const { error } = await db.from('comments').delete().eq('id', c.id); if (!error) d.remove(); });
      acts.append(del);
      if (!c.parent_id) {
        const rep = el('button', 'linkbtn blue', t('replyAs')); rep.type = 'button';
        rep.addEventListener('click', () => {
          if (d.querySelector('.reply-box')) return;
          const rb = el('div', 'reply-box'); const inp = el('input'); inp.maxLength = 1500; inp.placeholder = t('replyPh');
          const send = el('button', 'btn btn-primary', t('send')); send.type = 'button';
          send.addEventListener('click', async () => {
            const body = inp.value.trim(); if (body.length < 3) return;
            send.disabled = true;
            const up = c.approved ? { error: null } : await db.from('comments').update({ approved: true }).eq('id', c.id);
            const { error } = await db.from('comments').insert({ post_slug: c.post_slug, parent_id: c.id, body, is_official: true, approved: true, name: 'अभियान' });
            send.disabled = false;
            if (!error && !up.error) rb.replaceWith(el('p', 'msg ok', t('replied')));
          });
          rb.append(inp, send); d.append(rb); inp.focus();
        });
        acts.append(rep);
      }
      d.append(acts); box.append(d);
    });
  }

  // ---------- Blog posts ----------
  const pf = $('#post-form'); const F = pf.elements;
  let editing = null;
  async function loadPosts() {
    const box = $('#post-list'); box.replaceChildren(el('p', 'empty', t('loading')));
    const { data, error } = await db.from('posts').select('*').order('published_at', { ascending: false }).order('id', { ascending: false });
    box.replaceChildren();
    if (error) return box.append(el('p', 'empty', t('pFail')));
    data.forEach((p) => {
      const r = el('div', 'post-row');
      const left = el('div'); left.append(el('b', null, p.title), el('br'), el('span', 'small', [p.category, p.published_at, p.static_url ? t('oldPost') : null].filter(Boolean).join(' · ')));
      const right = el('div', 'chips');
      right.append(el('span', 'pill' + (p.published ? '' : ' off'), p.published ? t('live') : t('draft')));
      const path = p.static_url || 'lekh/?s=' + p.slug;
      const link = (C.SITE_URL || '') + path;
      const open = el('a', 'linkbtn blue', t('view')); open.href = path; open.target = '_blank'; open.rel = 'noopener';
      const copy = el('button', 'linkbtn blue', t('copyLink')); copy.type = 'button';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(link); copy.textContent = t('copied'); } catch (e) { prompt('Link:', link); } });
      right.append(open, copy);
      if (!p.static_url) { const ed = el('button', 'linkbtn blue', t('edit')); ed.type = 'button'; ed.addEventListener('click', () => editPost(p)); right.append(ed); }
      const tog = el('button', 'linkbtn' + (p.published ? '' : ' ok'), p.published ? t('hide') : t('publish')); tog.type = 'button';
      tog.addEventListener('click', async () => { const { error } = await db.from('posts').update({ published: !p.published, updated_at: new Date().toISOString() }).eq('id', p.id); if (!error) loadPosts(); });
      const del = el('button', 'linkbtn', t('remove')); del.type = 'button';
      del.addEventListener('click', async () => { if (!confirm(t('confirmP')(p.title))) return; const { error } = await db.from('posts').delete().eq('id', p.id); if (!error) loadPosts(); });
      right.append(tog, del);
      r.append(left, right); box.append(r);
    });
    if (!data.length) box.append(el('p', 'empty', t('pNone')));
  }
  function editPost(p) {
    editing = p || null; pf.reset(); pf.hidden = false; $('#post-msg').hidden = true; $('#post-preview-box').hidden = true;
    $('#post-form-title').textContent = p ? t('editTitle') : t('newTitle');
    F.id.value = p ? p.id : ''; F.title.value = p ? p.title : ''; F.summary.value = p ? p.summary || '' : '';
    F.category.value = p ? p.category || '' : ''; F.published_at.value = p ? p.published_at : new Date().toISOString().slice(0, 10);
    F.slug.value = p ? p.slug : ''; F.body.value = p ? p.body || '' : ''; F.published.checked = p ? p.published : true;
    $('#img-now').textContent = p && p.image_url ? t('imgNow') : '';
    F.title.focus(); pf.scrollIntoView({ behavior: 'smooth' });
  }
  $('#post-new').addEventListener('click', () => editPost(null));
  $('#post-cancel').addEventListener('click', () => { pf.hidden = true; editing = null; });
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const bodyToHtml = (txt) => String(txt || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) =>
    b.startsWith('## ') ? '<h2>' + inline(b.slice(3)) + '</h2>' : b.startsWith('> ') ? '<blockquote>' + inline(b.replace(/^> ?/gm, '')) + '</blockquote>' : '<p>' + inline(b).replace(/\n/g, '<br>') + '</p>').join('\n');
  $('#post-preview').addEventListener('click', () => {
    const box = $('#post-preview-box'); box.hidden = false;
    box.innerHTML = '<h1 style="margin-top:0">' + esc(F.title.value) + '</h1>' + (F.summary.value ? '<p class="small">' + esc(F.summary.value) + '</p>' : '') + bodyToHtml(F.body.value);
  });
  pf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const slug = F.slug.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    F.slug.value = slug;
    if (F.title.value.trim().length < 3) return msg('#post-msg', t('eTitle'));
    if (!slug) return msg('#post-msg', t('eSlug'));
    if (F.body.value.trim().length < 20) return msg('#post-msg', t('eBody'));
    const btn = pf.querySelector('button[type="submit"]'); btn.disabled = true; msg('#post-msg', t('saving'), true);
    let image_url = editing ? editing.image_url : null;
    const file = F.image.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { btn.disabled = false; return msg('#post-msg', t('eSize')); }
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file.type];
      if (!ext) { btn.disabled = false; return msg('#post-msg', t('eType')); }
      const path = slug + '-' + Date.now() + '.' + ext;
      const up = await db.storage.from('post-images').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { btn.disabled = false; return msg('#post-msg', t('eUpload')); }
      image_url = db.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    }
    const row = { slug, title: F.title.value.trim(), summary: F.summary.value.trim() || null, category: F.category.value.trim() || null,
      published_at: F.published_at.value || new Date().toISOString().slice(0, 10), body: F.body.value, image_url, published: F.published.checked, updated_at: new Date().toISOString() };
    const q = editing ? db.from('posts').update(row).eq('id', editing.id) : db.from('posts').insert(row);
    const { error } = await q;
    btn.disabled = false;
    if (error) return msg('#post-msg', error.code === '23505' ? t('eDup') : t('eSave'));
    msg('#post-msg', row.published ? t('okLive') : t('okDraft'), true);
    editing = null; loadPosts();
  });

  applyLang();
  start();
})();

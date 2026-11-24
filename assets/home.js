// मुखपृष्ठ और ब्लॉग-सूची पर लेख कार्ड बनाना (posts.js से)
(function () {
  let posts = (window.JKA_POSTS || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const rel = (u) => (/^https?:/.test(u || '') ? u : prefix + (u || ''));
  const prefix = document.body.dataset.root || '';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const fmtDate = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
  const icon = (path) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = path; return s; };
  const ARROW = '<path d="M5 12h14M13 6l6 6-6 6"/>';
  const WA = '<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3a8.5 8.5 0 1 1 15.5-4.6z"/>';
  const COPY = '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>';

  function feature(p, isNewest) {
    const box = el('article', 'feature');
    if (p.image) { const img = el('img'); img.src = rel(p.image); img.alt = ''; img.loading = 'lazy'; box.append(img); }
    else box.append(el('div', 'ph'));
    const body = el('div');
    body.append(el('p', 'meta', [isNewest ? 'नवीनतम लेख' : null, p.category, fmtDate(p.date)].filter(Boolean).join(' · ')));
    const h = el('h3'); const a = el('a', null, p.title); a.href = rel(p.url); h.append(a); body.append(h);
    if (p.summary) body.append(el('p', 'sum', p.summary));
    const acts = el('div', 'card-actions');
    const read = el('a', 'btn btn-primary', 'लेख पढ़ें'); read.href = rel(p.url); read.append(icon(ARROW));
    const wa = el('a', 'btn btn-wa'); wa.dataset.share = 'wa'; wa.dataset.url = rel(p.url); wa.dataset.text = p.title + ' — यह लेख पढ़िए:'; wa.append(icon(WA), document.createTextNode('वॉट्सऐप पर भेजें'));
    const cp = el('button', 'btn btn-outline'); cp.type = 'button'; cp.dataset.share = 'copy'; cp.dataset.url = rel(p.url); cp.append(icon(COPY), document.createTextNode('लिंक कॉपी करें'));
    acts.append(read, wa, cp); body.append(acts); box.append(body);
    return box;
  }
  function mini(p) {
    const a = el('a', 'mini'); a.href = rel(p.url);
    if (p.image) { const img = el('img'); img.src = rel(p.image); img.alt = ''; img.loading = 'lazy'; a.append(img); } else a.append(el('span', 'ph'));
    const d = el('div'); d.append(el('p', 'cat', p.category || 'लेख'), el('h3', null, p.title)); a.append(d);
    return a;
  }

  function render() {
    const latest = document.getElementById('latest-post');
    if (latest) { latest.replaceChildren(); if (posts[0]) latest.append(feature(posts[0], true)); else latest.append(el('p', 'empty', 'पहला लेख जल्द आ रहा है।')); }
    const rest = document.getElementById('more-posts');
    if (rest) { rest.replaceChildren(); posts.slice(1, rest.dataset.limit ? +rest.dataset.limit + 1 : undefined).forEach((p) => rest.append(mini(p))); }
    if (window.JKA && window.JKA.bindShares) window.JKA.bindShares();
  }
  render();
  // database से ताज़ा लेख (admin panel से डाले गए)
  window.addEventListener('load', async () => {
    const db = window.JKA && window.JKA.db; if (!db) return;
    const { data, error } = await db.from('posts').select('slug,title,summary,category,image_url,static_url,published_at')
      .eq('published', true).order('published_at', { ascending: false }).order('id', { ascending: false }).limit(50);
    if (error || !data) return;
    posts = data.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, category: p.category, date: p.published_at, image: p.image_url, url: p.static_url || 'lekh/?s=' + p.slug }));
    render();
  });
})();

// database से लेख लाकर दिखाना (admin panel से डाले गए लेख)
(function () {
  const { db, bindShares } = window.JKA || {};
  const slug = document.body.dataset.slug;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  // खाली लाइन = नया पैराग्राफ, "## " = उपशीर्षक, "> " = उद्धरण, **शब्द** = मोटा
  function bodyToHtml(text) {
    return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
      if (b.startsWith('## ')) return '<h2>' + inline(b.slice(3)) + '</h2>';
      if (b.startsWith('> ')) return '<blockquote>' + inline(b.replace(/^> ?/gm, '')) + '</blockquote>';
      return '<p>' + inline(b).replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
  }
  window.JKA_bodyToHtml = bodyToHtml;
  const fmtDate = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
  function notFound(msg) {
    $('p-title').textContent = 'लेख नहीं मिला';
    $('p-meta').textContent = '';
    $('p-body').innerHTML = '<p>' + esc(msg) + ' <a href="../jan-awaaz.html">सभी लेख देखें</a></p>';
  }
  async function load() {
    if (!slug) return notFound('यह लिंक अधूरा है।');
    if (!db) return notFound('अभी लेख लोड नहीं हो पाया।');
    const { data, error } = await db.from('posts').select('slug,title,summary,category,body,image_url,static_url,published_at').eq('slug', slug).maybeSingle();
    if (error || !data) return notFound('यह लेख हटाया गया है या अभी प्रकाशित नहीं हुआ।');
    if (data.static_url) { location.replace('../' + data.static_url); return; }
    document.title = data.title + ' | जन-आवाज़ की डायरी';
    $('p-title').textContent = data.title;
    $('p-meta').textContent = [data.category, fmtDate(data.published_at)].filter(Boolean).join(' · ');
    if (data.summary) { $('p-sub').textContent = data.summary; $('p-sub').hidden = false; }
    if (data.image_url) { const img = $('p-cover'); img.src = /^https?:/.test(data.image_url) ? data.image_url : '../' + data.image_url; img.hidden = false; }
    $('p-body').innerHTML = bodyToHtml(data.body);
    document.querySelectorAll('[data-share="wa"], [data-share="fb"]').forEach((a) => {
      if (a.dataset.share === 'wa') a.dataset.text = data.title + ' — यह लेख पढ़िए:';
      delete a.dataset.bound;
    });
    if (bindShares) bindShares();
  }
  load();
})();

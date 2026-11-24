// लेख का slug पता (?s=...) से लें, ताकि टिप्पणी/प्रतिक्रिया सही लेख से जुड़ें
(function () {
  var s = new URLSearchParams(location.search).get('s') || '';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s)) s = '';
  document.body.dataset.slug = s;
})();

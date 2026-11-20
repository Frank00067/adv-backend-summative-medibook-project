const router = require('express').Router();
const path = require('path');
const fs = require('fs');

const SUPPORTED = ['en', 'fr'];
const locales = {};
for (const l of SUPPORTED) {
  const raw = fs.readFileSync(path.join(__dirname, '..', '..', 'locales', `${l}.json`), 'utf8');
  locales[l] = JSON.parse(raw.replace(/^\uFEFF/, '')); // strip BOM added by Windows editors
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

router.get('/', (req, res) => {
  const lang = SUPPORTED.includes(req.query.lang) ? req.query.lang : 'en';
  const t = locales[lang];
  const today = new Intl.DateTimeFormat(lang, { dateStyle: 'full' }).format(new Date());

  const questions = t.questions.map((q, i) => `
    <label for="q${i + 1}">${i + 1}. ${esc(q)}</label>
    <textarea id="q${i + 1}" name="q${i + 1}" rows="4"></textarea>`).join('');

  res.type('html').send(`<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t.title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
    label { display: block; margin-top: 1.2rem; font-weight: 600; }
    textarea { width: 100%; box-sizing: border-box; margin-top: .4rem; }
    nav a { margin-right: .5rem; }
  </style>
</head>
<body>
  <nav><a href="?lang=en">English</a> <a href="?lang=fr">Français</a></nav>
  <h1>${esc(t.title)}</h1>
  <p>${esc(t.instructions)}</p>
  <p><strong>${esc(t.dateLabel)}:</strong> ${esc(today)}</p>
  <form onsubmit="return false;">${questions}
    <p><button type="submit">${esc(t.submit)}</button></p>
  </form>
</body>
</html>`);
});

module.exports = router;
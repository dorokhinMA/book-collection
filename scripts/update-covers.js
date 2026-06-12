/**
 * Fetches correct cover IDs from OpenLibrary Search API
 * and updates the books database.
 *
 * Usage:
 *   node scripts/update-covers.js               # local books.db
 *   DB_PATH=/data/books.db node scripts/update-covers.js
 */

const https = require('https');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, '..', 'books.db'));
db.function('lower_u', s => (s == null ? null : s.toLowerCase()));

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'bookshelf-app/1.0 (cover-updater)' } }, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

async function findCoverId(title, author) {
  // Search by title + author, take first result that has a cover
  const q = encodeURIComponent(`${title} ${author}`);
  const url = `https://openlibrary.org/search.json?q=${q}&limit=5&fields=title,author_name,cover_i`;
  const json = await get(url);
  if (!json?.docs?.length) return null;
  const hit = json.docs.find(d => d.cover_i);
  return hit?.cover_i ?? null;
}

async function main() {
  const books = db.prepare('SELECT id, title, author FROM books ORDER BY id').all();
  const update = db.prepare('UPDATE books SET cover = ? WHERE id = ?');

  console.log(`Обновляем обложки для ${books.length} книг...\n`);

  let ok = 0, fail = 0;

  for (const book of books) {
    try {
      const coverId = await findCoverId(book.title, book.author);
      if (coverId) {
        const url = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
        update.run(url, book.id);
        console.log(`✓  [${book.id}] ${book.title}`);
        console.log(`      ${url}`);
        ok++;
      } else {
        update.run(null, book.id);
        console.log(`✗  [${book.id}] ${book.title} — обложка не найдена, сброшена в null`);
        fail++;
      }
    } catch (err) {
      console.error(`!  [${book.id}] ${book.title} — ошибка: ${err.message}`);
      fail++;
    }

    // Respect OpenLibrary rate limit (~1 req/sec)
    await new Promise(r => setTimeout(r, 1100));
  }

  console.log(`\nГотово: ${ok} обновлено, ${fail} без обложки.`);
  db.close();
}

main().catch(err => { console.error(err); process.exit(1); });

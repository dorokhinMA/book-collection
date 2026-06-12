const Database = require('better-sqlite3');

const DB_SCHEMA = `
  CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT NOT NULL,
    year INTEGER NOT NULL,
    rating REAL NOT NULL CHECK(rating >= 0 AND rating <= 10),
    cover TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`;

// 8 books — enough for pagination testing (PAGE_SIZE=6: page1=6, page2=2)
const SAMPLE_BOOKS = [
  ['Мастер и Маргарита',    'Михаил Булгаков',    'Роман',          1967, 9.5, 'https://example.com/1.jpg'],
  ['1984',                  'Джордж Оруэлл',      'Антиутопия',     1949, 9.2, null],
  ['Дюна',                  'Фрэнк Герберт',      'Фантастика',     1965, 8.9, null],
  ['Идиот',                 'Фёдор Достоевский',  'Роман',          1869, 8.9, null],
  ['Евгений Онегин',        'Александр Пушкин',   'Роман в стихах', 1833, 9.0, null],
  ['Герой нашего времени',  'Михаил Лермонтов',   'Роман',          1840, 8.8, null],
  ['Мёртвые души',          'Николай Гоголь',     'Поэма',          1842, 8.7, null],
  ['Обломов',               'Иван Гончаров',      'Роман',          1859, 8.4, null],
];

function createDb() {
  const db = new Database(':memory:');
  db.function('lower_u', s => (s == null ? null : s.toLowerCase()));
  db.exec(DB_SCHEMA);
  return db;
}

function seedDb(db) {
  db.exec('DELETE FROM books');
  // Reset AUTOINCREMENT counter so ids are predictable (start at 1)
  try { db.exec("DELETE FROM sqlite_sequence WHERE name='books'"); } catch (_) {}
  const insert = db.prepare(
    'INSERT INTO books (title, author, genre, year, rating, cover) VALUES (?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => { for (const b of SAMPLE_BOOKS) insert.run(...b); })();
}

module.exports = { createDb, seedDb, SAMPLE_BOOKS };

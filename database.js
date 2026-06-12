const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(process.env.DB_PATH || path.join(__dirname, 'books.db'));

// SQLite's built-in LOWER/UPPER only handles ASCII; register a Unicode-aware version
db.function('lower_u', s => (s == null ? null : s.toLowerCase()));

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    genre TEXT NOT NULL,
    year INTEGER NOT NULL,
    rating REAL NOT NULL CHECK(rating >= 0 AND rating <= 10),
    cover TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed data if table is empty
const count = db.prepare('SELECT COUNT(*) as cnt FROM books').get();
if (count.cnt === 0) {
  const insert = db.prepare(`
    INSERT INTO books (title, author, genre, year, rating, cover) VALUES (?, ?, ?, ?, ?, ?)
  `);
  const books = [
    ['Мастер и Маргарита',                'Михаил Булгаков',           'Роман',          1967, 9.5, 'https://covers.openlibrary.org/b/id/12947486-L.jpg'],
    ['1984',                              'Джордж Оруэлл',             'Антиутопия',     1949, 9.2, 'https://covers.openlibrary.org/b/id/9267242-L.jpg'],
    ['Преступление и наказание',          'Фёдор Достоевский',         'Роман',          1866, 9.0, 'https://covers.openlibrary.org/b/id/9411873-L.jpg'],
    ['Гарри Поттер и философский камень', 'Дж. К. Роулинг',            'Фэнтези',        1997, 8.8, 'https://covers.openlibrary.org/b/id/15155833-L.jpg'],
    ['Маленький принц',                   'Антуан де Сент-Экзюпери',   'Сказка',         1943, 9.1, 'https://covers.openlibrary.org/b/id/10708272-L.jpg'],
    ['Дюна',                              'Фрэнк Герберт',             'Фантастика',     1965, 8.9, 'https://covers.openlibrary.org/b/id/12981475-L.jpg'],
    ['Анна Каренина',                     'Лев Толстой',               'Роман',          1878, 9.1, 'https://covers.openlibrary.org/b/id/2560652-L.jpg'],
    ['Братья Карамазовы',                 'Фёдор Достоевский',         'Роман',          1880, 9.4, 'https://covers.openlibrary.org/b/id/8272336-L.jpg'],
    ['Идиот',                             'Фёдор Достоевский',         'Роман',          1869, 8.9, 'https://covers.openlibrary.org/b/id/11226648-L.jpg'],
    ['Евгений Онегин',                    'Александр Пушкин',          'Роман в стихах', 1833, 9.0, 'https://covers.openlibrary.org/b/id/14561608-L.jpg'],
    ['Герой нашего времени',              'Михаил Лермонтов',          'Роман',          1840, 8.8, 'https://covers.openlibrary.org/b/id/104294-L.jpg'],
    ['Мёртвые души',                      'Николай Гоголь',            'Поэма',          1842, 8.7, 'https://covers.openlibrary.org/b/id/7993798-L.jpg'],
    ['Отцы и дети',                       'Иван Тургенев',             'Роман',          1862, 8.6, 'https://covers.openlibrary.org/b/id/8236420-L.jpg'],
    ['Обломов',                           'Иван Гончаров',             'Роман',          1859, 8.4, 'https://covers.openlibrary.org/b/id/5755397-L.jpg'],
    ['Вишнёвый сад',                      'Антон Чехов',               'Пьеса',          1904, 8.7, 'https://covers.openlibrary.org/b/id/13420205-L.jpg'],
    ['Капитанская дочка',                 'Александр Пушкин',          'Повесть',        1836, 8.8, 'https://covers.openlibrary.org/b/id/893480-L.jpg'],
  ];
  for (const book of books) insert.run(...book);
}

module.exports = db;

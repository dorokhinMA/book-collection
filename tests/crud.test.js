const request = require('supertest');
const { seedDb } = require('./helpers');

jest.mock('../database', () => {
  const { createDb } = require('./helpers');
  return createDb();
});

const db  = require('../database');
const app = require('../app');

beforeEach(() => seedDb(db));

// Helper: look up a book id by title after seed
function bookId(title) {
  return db.prepare('SELECT id FROM books WHERE title = ?').get(title).id;
}

// ---------------------------------------------------------------------------
// GET /books/new
// ---------------------------------------------------------------------------

describe('GET /books/new', () => {
  test('возвращает 200', async () => {
    const res = await request(app).get('/books/new');
    expect(res.status).toBe(200);
  });

  test('содержит форму добавления книги', async () => {
    const res = await request(app).get('/books/new');
    expect(res.text).toContain('Добавить книгу');
    expect(res.text).toContain('name="title"');
    expect(res.text).toContain('name="author"');
    expect(res.text).toContain('name="genre"');
    expect(res.text).toContain('name="year"');
    expect(res.text).toContain('name="rating"');
  });

  test('форма содержит жанры из базы данных', async () => {
    const res = await request(app).get('/books/new');
    expect(res.text).toContain('Роман');
    expect(res.text).toContain('Антиутопия');
  });
});

// ---------------------------------------------------------------------------
// POST /books — create
// ---------------------------------------------------------------------------

describe('POST /books', () => {
  const validBook = {
    title:  'Анна Каренина',
    author: 'Лев Толстой',
    genre:  'Роман',
    year:   '1878',
    rating: '9.1',
    cover:  '',
  };

  test('возвращает 302 редирект на /books', async () => {
    const res = await request(app).post('/books').type('form').send(validBook);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/books');
  });

  test('книга сохраняется в базу данных', async () => {
    await request(app).post('/books').type('form').send(validBook);
    const book = db.prepare('SELECT * FROM books WHERE title = ?').get('Анна Каренина');
    expect(book).toBeTruthy();
    expect(book.author).toBe('Лев Толстой');
    expect(book.genre).toBe('Роман');
    expect(book.year).toBe(1878);
    expect(book.rating).toBeCloseTo(9.1);
  });

  test('cover сохраняется как null если пустая строка', async () => {
    await request(app).post('/books').type('form').send({ ...validBook, cover: '' });
    const book = db.prepare('SELECT cover FROM books WHERE title = ?').get('Анна Каренина');
    expect(book.cover).toBeNull();
  });

  test('cover сохраняется если URL указан', async () => {
    await request(app).post('/books').type('form').send({ ...validBook, cover: 'https://example.com/cover.jpg' });
    const book = db.prepare('SELECT cover FROM books WHERE title = ?').get('Анна Каренина');
    expect(book.cover).toBe('https://example.com/cover.jpg');
  });

  test('использует genre_new если указан новый жанр', async () => {
    await request(app).post('/books').type('form').send({
      ...validBook,
      genre:     '__new__',
      genre_new: 'Эпос',
    });
    const book = db.prepare('SELECT genre FROM books WHERE title = ?').get('Анна Каренина');
    expect(book.genre).toBe('Эпос');
  });

  test('обрезает пробелы у названия и автора', async () => {
    await request(app).post('/books').type('form').send({
      ...validBook,
      title:  '  Анна Каренина  ',
      author: '  Лев Толстой  ',
    });
    const book = db.prepare('SELECT * FROM books WHERE title = ?').get('Анна Каренина');
    expect(book.title).toBe('Анна Каренина');
    expect(book.author).toBe('Лев Толстой');
  });
});

// ---------------------------------------------------------------------------
// GET /books/:id — detail
// ---------------------------------------------------------------------------

describe('GET /books/:id', () => {
  test('возвращает 200 для существующей книги', async () => {
    const id = bookId('Мастер и Маргарита');
    const res = await request(app).get(`/books/${id}`);
    expect(res.status).toBe(200);
  });

  test('показывает название, автора, год и рейтинг книги', async () => {
    const id = bookId('Мастер и Маргарита');
    const res = await request(app).get(`/books/${id}`);
    expect(res.text).toContain('Мастер и Маргарита');
    expect(res.text).toContain('Михаил Булгаков');
    expect(res.text).toContain('1967');
    expect(res.text).toContain('9.5');
  });

  test('содержит кнопки редактирования и удаления', async () => {
    const id = bookId('1984');
    const res = await request(app).get(`/books/${id}`);
    expect(res.text).toContain(`/books/${id}/edit`);
    expect(res.text).toContain('_method=DELETE');
  });

  test('возвращает 404 для несуществующей книги', async () => {
    const res = await request(app).get('/books/99999');
    expect(res.status).toBe(404);
  });

  test('страница 404 содержит текст об ошибке', async () => {
    const res = await request(app).get('/books/99999');
    expect(res.text).toContain('404');
  });
});

// ---------------------------------------------------------------------------
// GET /books/:id/edit
// ---------------------------------------------------------------------------

describe('GET /books/:id/edit', () => {
  test('возвращает 200', async () => {
    const id = bookId('1984');
    const res = await request(app).get(`/books/${id}/edit`);
    expect(res.status).toBe(200);
  });

  test('форма предзаполнена данными книги', async () => {
    const id = bookId('1984');
    const res = await request(app).get(`/books/${id}/edit`);
    expect(res.text).toContain('1984');
    expect(res.text).toContain('Джордж Оруэлл');
    expect(res.text).toContain('1949');
    expect(res.text).toContain('Редактировать книгу');
  });

  test('action формы указывает на PUT эндпоинт', async () => {
    const id = bookId('1984');
    const res = await request(app).get(`/books/${id}/edit`);
    expect(res.text).toContain(`/books/${id}?_method=PUT`);
  });

  test('возвращает 404 для несуществующей книги', async () => {
    const res = await request(app).get('/books/99999/edit');
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PUT /books/:id — update
// ---------------------------------------------------------------------------

describe('PUT /books/:id', () => {
  test('обновляет книгу и редиректит на /books/:id', async () => {
    const id = bookId('1984');
    const res = await request(app)
      .post(`/books/${id}?_method=PUT`)
      .type('form')
      .send({ title: '1984', author: 'Джордж Оруэлл', genre: 'Антиутопия', year: '1949', rating: '9.8', cover: '' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/books/${id}`);
  });

  test('изменения сохраняются в базе данных', async () => {
    const id = bookId('1984');
    await request(app)
      .post(`/books/${id}?_method=PUT`)
      .type('form')
      .send({ title: 'Тысяча девятьсот восемьдесят четыре', author: 'Джордж Оруэлл', genre: 'Антиутопия', year: '1949', rating: '9.8', cover: '' });
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    expect(book.title).toBe('Тысяча девятьсот восемьдесят четыре');
    expect(book.rating).toBeCloseTo(9.8);
  });

  test('можно сменить жанр через genre_new', async () => {
    const id = bookId('Дюна');
    await request(app)
      .post(`/books/${id}?_method=PUT`)
      .type('form')
      .send({ title: 'Дюна', author: 'Фрэнк Герберт', genre: '__new__', genre_new: 'Космическая опера', year: '1965', rating: '9.0', cover: '' });
    const book = db.prepare('SELECT genre FROM books WHERE id = ?').get(id);
    expect(book.genre).toBe('Космическая опера');
  });

  test('обновление не затрагивает другие книги', async () => {
    const id = bookId('1984');
    await request(app)
      .post(`/books/${id}?_method=PUT`)
      .type('form')
      .send({ title: '1984', author: 'Оруэлл', genre: 'Антиутопия', year: '1949', rating: '7.0', cover: '' });
    const other = db.prepare('SELECT * FROM books WHERE title = ?').get('Мастер и Маргарита');
    expect(other.rating).toBeCloseTo(9.5);
  });
});

// ---------------------------------------------------------------------------
// DELETE /books/:id
// ---------------------------------------------------------------------------

describe('DELETE /books/:id', () => {
  test('удаляет книгу и редиректит на /books', async () => {
    const id = bookId('Дюна');
    const res = await request(app).post(`/books/${id}?_method=DELETE`).type('form').send({});
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/books');
  });

  test('книга удаляется из базы данных', async () => {
    const id = bookId('Дюна');
    await request(app).post(`/books/${id}?_method=DELETE`).type('form').send({});
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    expect(book).toBeUndefined();
  });

  test('общее количество книг уменьшается на 1', async () => {
    const before = db.prepare('SELECT COUNT(*) as n FROM books').get().n;
    const id = bookId('Обломов');
    await request(app).post(`/books/${id}?_method=DELETE`).type('form').send({});
    const after = db.prepare('SELECT COUNT(*) as n FROM books').get().n;
    expect(after).toBe(before - 1);
  });

  test('редиректит на /books даже для несуществующего id', async () => {
    const res = await request(app).post('/books/99999?_method=DELETE').type('form').send({});
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/books');
  });

  test('удаление не затрагивает другие книги', async () => {
    const id = bookId('Дюна');
    await request(app).post(`/books/${id}?_method=DELETE`).type('form').send({});
    const other = db.prepare('SELECT * FROM books WHERE title = ?').get('1984');
    expect(other).toBeTruthy();
  });
});

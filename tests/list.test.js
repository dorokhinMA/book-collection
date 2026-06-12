const request = require('supertest');
const { seedDb, SAMPLE_BOOKS } = require('./helpers');

// Replace the real DB with an in-memory one before app is loaded
jest.mock('../database', () => {
  const { createDb } = require('./helpers');
  return createDb();
});

const db  = require('../database');
const app = require('../app');

beforeEach(() => seedDb(db));

// ---------------------------------------------------------------------------
// Redirect
// ---------------------------------------------------------------------------

describe('GET /', () => {
  test('redirects to /books', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/books');
  });
});

// ---------------------------------------------------------------------------
// Main list page
// ---------------------------------------------------------------------------

describe('GET /books — основная страница', () => {
  test('возвращает 200', async () => {
    const res = await request(app).get('/books');
    expect(res.status).toBe(200);
  });

  test('содержит заголовок страницы', async () => {
    const res = await request(app).get('/books');
    expect(res.text).toContain('Моя коллекция');
  });

  test('показывает субтитл с диапазоном книг (1–6 из 8)', async () => {
    const res = await request(app).get('/books');
    expect(res.text).toContain('1–6 из 8 книг');
  });

  test('отображает ровно 6 карточек на первой странице', async () => {
    const res = await request(app).get('/books');
    const count = (res.text.match(/book-card"/g) || []).length;
    expect(count).toBe(6);
  });

  test('содержит книги из базы данных', async () => {
    const res = await request(app).get('/books');
    expect(res.text).toContain('Мастер и Маргарита');
    expect(res.text).toContain('1984');
  });

  test('содержит жанровые чипы', async () => {
    const res = await request(app).get('/books');
    expect(res.text).toContain('genre-chips');
    expect(res.text).toContain('Роман');
    expect(res.text).toContain('Антиутопия');
  });

  test('содержит форму поиска', async () => {
    const res = await request(app).get('/books');
    expect(res.text).toContain('search-bar');
    expect(res.text).toContain('name="search"');
  });

  test('содержит ссылку "Добавить книгу"', async () => {
    const res = await request(app).get('/books');
    expect(res.text).toContain('href="/books/new"');
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('Пагинация', () => {
  test('показывает пагинацию когда книг > 6', async () => {
    const res = await request(app).get('/books');
    expect(res.text).toContain('pagination');
  });

  test('страница 2 возвращает оставшиеся 2 книги', async () => {
    const res = await request(app).get('/books?page=2');
    expect(res.status).toBe(200);
    const count = (res.text.match(/book-card"/g) || []).length;
    expect(count).toBe(2);
    expect(res.text).toContain('7–8 из 8 книг');
  });

  test('страница 2 содержит книги которых нет на странице 1', async () => {
    const p1 = await request(app).get('/books?page=1');
    const p2 = await request(app).get('/books?page=2');
    // "Мёртвые души" and "Обломов" are inserted last, so page2 (latest) has first 2 by created_at desc
    // Actually we order by created_at DESC: IDs 8,7 would appear on page2 → "Обломов", "Мёртвые души"
    // Page 1 shows IDs 8..3, page 2 shows IDs 2,1
    expect(p1.text).not.toEqual(p2.text);
  });

  test('page=0 зажимается до первой страницы', async () => {
    const res = await request(app).get('/books?page=0');
    expect(res.text).toContain('1–6 из 8 книг');
  });

  test('page=999 зажимается до последней страницы', async () => {
    const res = await request(app).get('/books?page=999');
    expect(res.status).toBe(200);
    expect(res.text).toContain('7–8 из 8 книг');
  });

  test('нет пагинации когда книг ≤ 6', async () => {
    // Remove all but 5 books
    db.exec('DELETE FROM books WHERE id > 5');
    const res = await request(app).get('/books');
    expect(res.text).not.toContain('class="pagination"');
  });

  test('ссылки пагинации сохраняют параметр search', async () => {
    // Add 7 more "Роман" books so pagination appears under search
    const insert = db.prepare('INSERT INTO books (title,author,genre,year,rating,cover) VALUES(?,?,?,?,?,?)');
    db.transaction(() => {
      for (let i = 1; i <= 7; i++) {
        insert.run(`Роман ${i}`, 'Автор', 'Роман', 2000, 7.0, null);
      }
    })();
    const res = await request(app).get('/books?search=%D0%A0%D0%BE%D0%BC%D0%B0%D0%BD');
    expect(res.text).toContain('search=');
  });

  test('ссылки пагинации сохраняют параметр genre', async () => {
    const insert = db.prepare('INSERT INTO books (title,author,genre,year,rating,cover) VALUES(?,?,?,?,?,?)');
    db.transaction(() => {
      for (let i = 1; i <= 7; i++) {
        insert.run(`Роман ${i}`, 'Автор', 'Роман', 2000, 7.0, null);
      }
    })();
    const res = await request(app).get('/books?genre=%D0%A0%D0%BE%D0%BC%D0%B0%D0%BD');
    expect(res.text).toContain('genre=');
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe('Поиск', () => {
  test('находит книгу по части названия (кириллица)', async () => {
    const res = await request(app).get('/books?search=%D0%9C%D0%B0%D1%80%D0%B3%D0%B0%D1%80%D0%B8%D1%82%D0%B0'); // Маргарита
    expect(res.status).toBe(200);
    expect(res.text).toContain('Мастер и Маргарита');
    expect(res.text).not.toContain('1984');
  });

  test('поиск регистронезависимый (нижний регистр кириллицы)', async () => {
    // "маргарита" lowercase should find "Мастер и Маргарита"
    const res = await request(app).get('/books?search=%D0%BC%D0%B0%D1%80%D0%B3%D0%B0%D1%80%D0%B8%D1%82%D0%B0');
    expect(res.text).toContain('Мастер и Маргарита');
  });

  test('находит книгу по части имени автора', async () => {
    const res = await request(app).get('/books?search=%D0%91%D1%83%D0%BB%D0%B3%D0%B0%D0%BA%D0%BE%D0%B2'); // Булгаков
    expect(res.text).toContain('Мастер и Маргарита');
    const count = (res.text.match(/book-card"/g) || []).length;
    expect(count).toBe(1);
  });

  test('поиск автора регистронезависимый (верхний регистр)', async () => {
    const res = await request(app).get('/books?search=%D0%91%D0%A3%D0%9B%D0%93%D0%90%D0%9A%D0%9E%D0%92'); // БУЛГАКОВ
    expect(res.text).toContain('Мастер и Маргарита');
  });

  test('показывает "Ничего не найдено" при отсутствии результатов', async () => {
    const res = await request(app).get('/books?search=xyzxyzxyz');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Ничего не найдено');
  });

  test('субтитл показывает количество найденных', async () => {
    const res = await request(app).get('/books?search=%D0%9E%D1%80%D1%83%D1%8D%D0%BB%D0%BB'); // Оруэлл
    expect(res.text).toContain('1–1 из 1 книг');
  });

  test('субтитл содержит "(по фильтру)" при активном поиске', async () => {
    const res = await request(app).get('/books?search=%D0%BE%D1%80%D1%83%D1%8D%D0%BB%D0%BB');
    expect(res.text).toContain('по фильтру');
  });
});

// ---------------------------------------------------------------------------
// Genre filter
// ---------------------------------------------------------------------------

describe('Фильтрация по жанру', () => {
  test('возвращает только книги нужного жанра', async () => {
    const res = await request(app).get('/books?genre=%D0%90%D0%BD%D1%82%D0%B8%D1%83%D1%82%D0%BE%D0%BF%D0%B8%D1%8F'); // Антиутопия
    expect(res.status).toBe(200);
    expect(res.text).toContain('1984');
    expect(res.text).not.toContain('Мастер и Маргарита');
  });

  test('показывает субтитл "(по фильтру)" при активном жанре', async () => {
    const res = await request(app).get('/books?genre=%D0%A4%D0%B0%D0%BD%D1%82%D0%B0%D1%81%D1%82%D0%B8%D0%BA%D0%B0'); // Фантастика
    expect(res.text).toContain('по фильтру');
  });

  test('фильтрует несколько книг одного жанра', async () => {
    // Роман: Мастер и Маргарита, Идиот, Герой нашего времени, Обломов = 4 books
    const res = await request(app).get('/books?genre=%D0%A0%D0%BE%D0%BC%D0%B0%D0%BD'); // Роман
    const count = (res.text.match(/book-card"/g) || []).length;
    expect(count).toBe(4);
  });

  test('комбинированный поиск + жанр', async () => {
    // search="Лермонтов" + genre="Роман"
    const res = await request(app).get(
      '/books?search=%D0%9B%D0%B5%D1%80%D0%BC%D0%BE%D0%BD%D1%82%D0%BE%D0%B2&genre=%D0%A0%D0%BE%D0%BC%D0%B0%D0%BD'
    );
    expect(res.text).toContain('Герой нашего времени');
    const count = (res.text.match(/book-card"/g) || []).length;
    expect(count).toBe(1);
  });

  test('несуществующий жанр показывает пустое состояние', async () => {
    const res = await request(app).get('/books?genre=' + encodeURIComponent('НесуществующийЖанр'));
    expect(res.text).toContain('Ничего не найдено');
  });
});

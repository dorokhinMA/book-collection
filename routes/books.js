const express = require('express');
const router = express.Router();
const db = require('../database');

const PAGE_SIZE = 6;

// GET / — list with search, filter & pagination
router.get('/', (req, res) => {
  const { search = '', genre = '' } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);

  let where = 'WHERE 1=1';
  const params = [];

  if (search) {
    where += ' AND (lower_u(title) LIKE ? OR lower_u(author) LIKE ?)';
    params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }
  if (genre) {
    where += ' AND genre = ?';
    params.push(genre);
  }

  const total = db.prepare(`SELECT COUNT(*) as n FROM books ${where}`).get(...params).n;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const books = db.prepare(
    `SELECT * FROM books ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, PAGE_SIZE, offset);

  const genres = db.prepare('SELECT DISTINCT genre FROM books ORDER BY genre').all().map(r => r.genre);

  res.render('index', { books, genres, search, selectedGenre: genre, currentPage, totalPages, total });
});

// GET /new — add form
router.get('/new', (req, res) => {
  const genres = db.prepare('SELECT DISTINCT genre FROM books ORDER BY genre').all().map(r => r.genre);
  res.render('form', { book: null, genres, action: '/books', method: 'POST', title: 'Добавить книгу' });
});

// POST / — create
router.post('/', (req, res) => {
  const { title, author, genre, genre_new, year, rating, cover } = req.body;
  const finalGenre = genre_new?.trim() || genre;
  db.prepare('INSERT INTO books (title, author, genre, year, rating, cover) VALUES (?, ?, ?, ?, ?, ?)')
    .run(title.trim(), author.trim(), finalGenre, parseInt(year), parseFloat(rating), cover?.trim() || null);
  res.redirect('/books');
});

// GET /:id — detail
router.get('/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).render('404');
  res.render('detail', { book });
});

// GET /:id/edit — edit form
router.get('/:id/edit', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).render('404');
  const genres = db.prepare('SELECT DISTINCT genre FROM books ORDER BY genre').all().map(r => r.genre);
  res.render('form', { book, genres, action: `/books/${book.id}?_method=PUT`, method: 'POST', title: 'Редактировать книгу' });
});

// PUT /:id — update
router.put('/:id', (req, res) => {
  const { title, author, genre, genre_new, year, rating, cover } = req.body;
  const finalGenre = genre_new?.trim() || genre;
  db.prepare('UPDATE books SET title=?, author=?, genre=?, year=?, rating=?, cover=? WHERE id=?')
    .run(title.trim(), author.trim(), finalGenre, parseInt(year), parseFloat(rating), cover?.trim() || null, req.params.id);
  res.redirect(`/books/${req.params.id}`);
});

// DELETE /:id — delete
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.redirect('/books');
});

module.exports = router;

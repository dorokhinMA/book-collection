const express = require('express');
const methodOverride = require('method-override');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

const booksRouter = require('./routes/books');
app.use('/books', booksRouter);

app.get('/', (req, res) => res.redirect('/books'));

app.use((req, res) => res.status(404).render('404'));

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Книжная полка запущена: http://localhost:${PORT}`);
  });
}

module.exports = app;

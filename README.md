# Книжная полка

Веб-приложение для управления личной коллекцией книг. Построено на **Express.js + SQLite + EJS**, поддерживает CRUD, поиск, фильтрацию по жанру и пагинацию.

## Содержание

- [Возможности](#возможности)
- [Стек технологий](#стек-технологий)
- [Быстрый старт](#быстрый-старт)
- [Разработка](#разработка)
- [Тесты](#тесты)
- [Деплой с Docker](#деплой-с-docker)
- [Переменные окружения](#переменные-окружения)
- [Структура проекта](#структура-проекта)

---

## Возможности

- Каталог книг с обложками, рейтингом и метаданными
- Создание, редактирование и удаление книг
- Поиск по названию и автору (регистронезависимый, поддержка кириллицы)
- Фильтрация по жанру
- Пагинация — 6 книг на страницу
- Адаптивный интерфейс (мобильный + десктоп)
- Тёмная тема

---

## Стек технологий

| Слой | Технология |
|---|---|
| Сервер | Node.js 20, Express 4 |
| Шаблоны | EJS |
| База данных | SQLite (better-sqlite3) |
| Стили | Vanilla CSS (CSS Variables, Grid, Flexbox) |
| Тесты | Jest + Supertest |
| Деплой | Docker, Docker Compose |

---

## Быстрый старт

### Требования

- Node.js 18+
- npm 9+

### Установка и запуск

```bash
# Перейти в папку проекта
cd bookshelf

# Установить зависимости
npm install

# Запустить приложение
npm start
```

Откройте в браузере: **http://localhost:3000**

При первом запуске база данных создаётся автоматически и заполняется шестью книгами.

---

## Разработка

### Горячая перезагрузка (nodemon)

```bash
npm run dev
```

### Переменные окружения

Создайте файл `.env` в корне проекта (опционально):

```env
PORT=3000
DB_PATH=./books.db
```

> Без `.env` приложение использует значения по умолчанию: порт `3000`, база данных в файле `books.db` рядом с `app.js`.

---

## Тесты

Тесты используют **изолированную базу данных в памяти** — они не затрагивают реальный `books.db`.

```bash
# Запустить все тесты
npm test
```

### Структура тестов

```
tests/
├── helpers.js      # In-memory БД, seed-данные
├── list.test.js    # Список, поиск, фильтрация, пагинация (29 тестов)
└── crud.test.js    # Создание, чтение, обновление, удаление (27 тестов)
```

**Итого: 56 тестов.**

---

## Деплой с Docker

### Требования

- Docker 24+
- Docker Compose v2

### Запуск одной командой

```bash
docker compose up -d --build
```

Приложение будет доступно на **http://localhost:3000**.

### Основные команды

```bash
# Сборка и запуск в фоне
docker compose up -d --build

# Просмотр логов
docker compose logs -f

# Статус контейнера
docker compose ps

# Перезапуск
docker compose restart

# Остановка (данные сохраняются)
docker compose down

# Остановка с удалением данных
docker compose down -v
```

### Как устроен образ

Используется **многоэтапная сборка** (`multi-stage build`):

```
Stage 1 (deps)    — Node 20 Alpine + python3/make/g++
                    Компилирует нативный аддон better-sqlite3
                    Устанавливает только production-зависимости

Stage 2 (runner)  — Чистый Node 20 Alpine
                    Копирует скомпилированные зависимости из Stage 1
                    Запускает приложение от непривилегированного пользователя
```

Итоговый образ не содержит build-инструментов и devDependencies.

### Постоянное хранение данных

SQLite-база хранится в Docker volume `bookshelf_data`, смонтированном как `/data` внутри контейнера. При пересборке образа данные сохраняются.

```bash
# Просмотр volume
docker volume inspect bookshelf_bookshelf_data

# Резервная копия базы данных
docker run --rm \
  -v bookshelf_bookshelf_data:/data \
  -v $(pwd):/backup \
  alpine cp /data/books.db /backup/books_backup.db
```

### Деплой на сервер

```bash
# Скопировать файлы на сервер
scp -r bookshelf/ user@server:/opt/bookshelf

# Подключиться к серверу
ssh user@server

# Запустить
cd /opt/bookshelf
docker compose up -d --build
```

Для продакшена рекомендуется поставить **Nginx** как reverse proxy перед контейнером:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## Переменные окружения

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PORT` | `3000` | Порт HTTP-сервера |
| `DB_PATH` | `./books.db` | Путь к файлу SQLite-базы |
| `NODE_ENV` | — | `production` отключает verbose-логи Express |

---

## Структура проекта

```
bookshelf/
├── app.js                  # Точка входа, Express-приложение
├── database.js             # Подключение к SQLite, схема, seed-данные
├── routes/
│   └── books.js            # CRUD-роуты (/books)
├── views/
│   ├── index.ejs           # Каталог книг
│   ├── detail.ejs          # Страница книги
│   ├── form.ejs            # Форма добавления / редактирования
│   ├── 404.ejs
│   └── partials/
│       ├── head.ejs
│       ├── nav.ejs
│       └── foot.ejs
├── public/
│   ├── css/style.css       # Стили (тёмная тема, адаптив)
│   └── js/main.js          # Клиентские скрипты
├── tests/
│   ├── helpers.js
│   ├── list.test.js
│   └── crud.test.js
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── package.json
```

---

## API-маршруты

| Метод | Путь | Действие |
|---|---|---|
| `GET` | `/books` | Список книг (поиск, фильтр, пагинация) |
| `GET` | `/books/new` | Форма добавления |
| `POST` | `/books` | Создать книгу |
| `GET` | `/books/:id` | Страница книги |
| `GET` | `/books/:id/edit` | Форма редактирования |
| `PUT` | `/books/:id` | Обновить книгу |
| `DELETE` | `/books/:id` | Удалить книгу |

> `PUT` и `DELETE` передаются через `POST` с параметром `?_method=PUT/DELETE` (метод `method-override`).

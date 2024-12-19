# README

## Описание проекта
Сайт выполняет функцию обратной связи с пользователями через Telegram-бота. Пользователи взаимодействуют с ботом в Telegram, записываются в базу данных, а администраторы могут писать или отвечать им через веб-интерфейс.

---

## Как установить?

### Требования
- Node.js версии 14 или выше.
- SQLite3 для локальной базы данных.
- Telegram Bot API (токен требуется в `.env` файле).
- Docker (опционально, для развёртывания в контейнере).

### Установка
1. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/azz1mka/feedback_.git
   cd feedback_
   ```
2. Установите зависимости:
   ```bash
   npm install
   ```
3. Создайте файл `.env` и добавьте в него токен вашего Telegram-бота:
   ```env
   TELEGRAM_TOKEN=ваш_токен
   ```
4. Запустите приложение:
   ```bash
   npm start
   ```
5. Сайт будет доступен по адресу: `http://localhost:3000`.

### Структура проекта
- `server.js`: Основной серверный файл. Реализует REST API, Telegram-бота и WebSocket.
- `public/index.html`: Интерфейс администратора для взаимодействия с пользователями.
- `public/style.css`: Стили для HTML-страницы.
- `public/`: Статические файлы.
- `Dockerfile`: Конфигурация для сборки Docker-образа.
- `docker-compose.yml`: Настройка контейнеров для развёртывания проекта.

#### Используемые модули
- `express`: Для создания HTTP-сервера.
- `sqlite3`: Для управления базой данных SQLite.
- `body-parser`: Для парсинга JSON-запросов.
- `node-telegram-bot-api`: Для работы с Telegram API.
- `ws`: Для реализации WebSocket.
- `dotenv`: Для управления переменными окружения.
- `cors`: Для настройки междоменных запросов.
- `sanitize-html`: Для защиты от XSS.

---

## Для пользователей

### Функционал сайта
1. **Выбор пользователя**: Администратор может выбрать пользователя из списка.
2. **История сообщений**: Просмотр истории переписки с выбранным пользователем.
3. **Отправка сообщений**: Возможность отправить текстовое сообщение пользователю.
4. **Реальное время**: Новые сообщения отображаются в режиме реального времени благодаря WebSocket.

### Использование интерфейса
1. Откройте сайт в браузере по адресу `http://localhost:3000`.
2. Нажмите кнопку "Выбрать пользователя". Появится список доступных пользователей.
3. Выберите пользователя из списка, чтобы открыть чат.
4. Введите текст в поле "Введите сообщение..." и нажмите "Отправить" для отправки сообщения.

---

## HTML и CSS

### HTML (`index.html`)
- Заголовок и кнопка для выбора пользователей.
- Поле для истории сообщений и текстовое поле для ввода сообщений.
- Подключение WebSocket для обновлений в реальном времени.

### CSS (`style.css`)
- **Стилизация интерфейса**: Чат, список пользователей и кнопки имеют адаптивный дизайн.
- **Цветовая палитра**: Спокойные тона (#f4f4f9, #007bff) для удобства чтения.
- **Анимации**: Эффекты появления для элементов списка пользователей.

---

## Безопасность
1. **Санитизация данных**: Используется `sanitize-html` для предотвращения XSS-атак.
2. **Ограничение по API**: Ограничение размера JSON-запросов до 10 KB.
3. **CORS**: Разрешены запросы только с домена `localhost`.

---

## Использование Docker
1. Убедитесь, что Docker и Docker Compose установлены на вашей машине.
2. Создайте файл `.env` в корневой директории и добавьте токен Telegram-бота:
   ```env
   TELEGRAM_TOKEN=ваш_токен
   ```
3. Запустите проект с помощью Docker Compose:
   ```bash
   docker-compose up --build
   ```
4. Сайт будет доступен по адресу: `http://localhost:3000`.

### Конфигурация Docker
- **Dockerfile**:
  - Используется минимальный образ Node.js.
  - Устанавливаются зависимости и копируются файлы проекта.
  - Приложение запускается с помощью `node server.js`.
- **docker-compose.yml**:
  - Поднимается контейнер с приложением.
  - Пробрасывается порт 3000.
  - Подключается база данных как том для сохранения данных между перезапусками.
  - Устанавливаются ограничения по памяти (512 MB) и процессору (0.5 CPU).

---

## Частые проблемы
1. **Ошибка: порт занят**
   Решение: Измените порт сервера в `server.js` или в `docker-compose.yml`.

2. **Telegram-бот не отвечает**
   Решение: Проверьте правильность токена в `.env`.

---

## Лицензия
MIT (если лицензия не указана в проекте, можно уточнить у владельца или добавить эту информацию в файл LICENSE).


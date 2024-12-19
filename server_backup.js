const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));

// Подключение к базе данных для хранения пользователей и сообщений
const db = new sqlite3.Database("./chat.db", (err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных:", err.message);
  } else {
    console.log("Подключение к базе данных успешно.");
  }
});

// Создание таблиц для пользователей и сообщений
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL
)`);

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  message TEXT NOT NULL,
  sender TEXT NOT NULL
)`);

// Telegram Bot
const TELEGRAM_TOKEN = "8094018408:AAGg9ICnPQlqESDhJUVZsG0nqVKbg6JwRbA";
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// 1. Сохранение username и chat_id, когда пользователь запускает бота
bot.onText(/\/start/, (msg) => {
  const username = msg.from.username || "unknown";
  const chatId = msg.chat.id;

  const query = `INSERT INTO users (username, chat_id) VALUES (?, ?)
                 ON CONFLICT(username) DO UPDATE SET chat_id = excluded.chat_id`;

  db.run(query, [username, chatId], (err) => {
    if (err) {
      console.error("Ошибка при добавлении пользователя:", err.message);
    } else {
      console.log(
        `Пользователь ${username} с chat_id ${chatId} добавлен в базу данных.`
      );
    }
  });

  bot.sendMessage(chatId, "Привет! Вы можете начать общение.");
});

// 2. Логирование сообщений пользователей
bot.on("message", (msg) => {
  const username = msg.from.username || "unknown";
  const text = msg.text;

  if (text === "/start") return; // Игнорируем команду /start

  const query = `INSERT INTO messages (username, message, sender) VALUES (?, ?, 'user')`;
  db.run(query, [username, text], (err) => {
    if (err) {
      console.error("Ошибка при логировании сообщения:", err.message);
    } else {
      console.log(`Сообщение от ${username}: ${text}`);
    }
  });
});

// 3. API для получения списка пользователей
app.get("/api/users", (req, res) => {
  const query = `SELECT username FROM users`;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("Ошибка при получении списка пользователей:", err.message);
      res.status(500).send("Ошибка сервера");
      return;
    }

    const users = rows.map((row) => row.username);
    res.json(users);
  });
});

// 4. API для получения истории сообщений с пользователем
app.get("/api/messages/:username", (req, res) => {
  const username = req.params.username;
  const query = `SELECT timestamp, message, sender FROM messages WHERE username = ? ORDER BY timestamp`;

  db.all(query, [username], (err, rows) => {
    if (err) {
      console.error("Ошибка при получении сообщений:", err.message);
      res.status(500).send("Ошибка сервера");
      return;
    }

    res.json(rows);
  });
});

// 5. API для отправки сообщения пользователю через бота
app.post("/api/messages", (req, res) => {
  const { username, message } = req.body;

  if (!username || !message) {
    res.status(400).send("Укажите username и сообщение.");
    return;
  }

  const query = `INSERT INTO messages (username, message, sender) VALUES (?, ?, 'admin')`;

  db.get(
    `SELECT chat_id FROM users WHERE username = ?`,
    [username],
    (err, row) => {
      if (err) {
        console.error("Ошибка при чтении базы данных:", err.message);
        res.status(500).send("Ошибка сервера.");
        return;
      }

      if (!row) {
        res.status(404).send("Пользователь не найден.");
        return;
      }

      const chatId = row.chat_id;

      // Логируем сообщение в базу данных
      db.run(query, [username, message], (err) => {
        if (err) {
          console.error("Ошибка при сохранении сообщения:", err.message);
          res.status(500).send("Ошибка сервера");
          return;
        }

        // Отправляем сообщение через бота
        bot
          .sendMessage(chatId, message)
          .then(() => {
            console.log(
              `Сообщение успешно отправлено пользователю ${username}: ${message}`
            );
            res.status(200).send("Сообщение успешно отправлено.");
          })
          .catch((error) => {
            console.error(
              "Ошибка отправки сообщения через Telegram:",
              error.message
            );
            res.status(500).send("Ошибка отправки сообщения.");
          });
      });
    }
  );
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

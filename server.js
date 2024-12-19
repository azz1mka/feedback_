require("dotenv").config(); // Подключение dotenv для работы с .env

const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const TelegramBot = require("node-telegram-bot-api");
const WebSocket = require("ws"); // Подключаем WebSocket
const app = express();
const PORT = 3000;
const validator = require("validator");
const cors = require("cors");
const sanitizeHtml = require("sanitize-html");
const messageLimit = new Map(); // карта для отслеживания сообщений
const TIME_FRAME = 900 * 1000; // Время, 15 минут
const MAX_MESSAGES = 100; // 100 сообщений

//cors
const corsOptions = {
  origin: "http://localhost:3000", // Разрешенный домен
  methods: ["GET", "POST"], // Разрешенные методы
};

// Middleware
app.use(bodyParser.json());
app.use(express.static("public")); // Сервируем статичные файлы
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "10kb" })); // Максимум 10 KB для загрузки

// Подключение к базе данных
const db = new sqlite3.Database("./chat.db", (err) => {
  if (err) {
    console.error("Ошибка подключения к базе данных:", err.message);
  } else {
    console.log("Подключение к базе данных успешно.");
  }
});

// Создание таблиц
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
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN; // Токен передаётся через .env файл
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// WebSocket-сервер
const wss = new WebSocket.Server({ noServer: true });

// Массив клиентов для WebSocket
const clients = new Set();

// Функция для отправки обновлений через WebSocket
function sendMessageToClients(message) {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}

// Обработчик WebSocket-соединений
wss.on("connection", (ws) => {
  clients.add(ws);

  // Обработчик сообщений от клиентов через WebSocket
  ws.on("message", (data) => {
    try {
      const parsedData = JSON.parse(data);

      if (parsedData.type === "sendMessage") {
        const { username, message } = parsedData;

        // Сохранение сообщения в базу данных
        const query = `INSERT INTO messages (username, message, sender) VALUES (?, ?, 'admin')`;

        db.run(query, [username, message], (err) => {
          if (err) {
            console.error("Ошибка сохранения сообщения в БД:", err.message);
          } else {
            console.log(`Сообщение сохранено: ${message}`);

            // Рассылка сообщения всем клиентам
            sendMessageToClients({
              username: "admin",
              message: message,
              sender: "admin",
              timestamp: new Date().toISOString(),
            });
          }
        });
      }
    } catch (error) {
      console.error("Ошибка обработки WebSocket-сообщения:", error.message);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

// Telegram Bot: Сохранение username и chat_id
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

// Telegram Bot: Логирование сообщений
bot.on("message", async (msg) => {
  const username = msg.from.username || "unknown";
  const chatId = msg.chat.id;

  // Обработка текста
  if (msg.text) {
    const cleanText = sanitizeHtml(msg.text, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: "discard",
    });

    const query = `INSERT INTO messages (username, message, sender) VALUES (?, ?, 'user')`;
    db.run(query, [username, cleanText], (err) => {
      if (err) {
        console.error("Ошибка при логировании сообщения:", err.message);
      } else {
        console.log(`Сообщение от ${username}: ${cleanText}`);
        sendMessageToClients({
          username: username,
          message: cleanText,
          sender: "user",
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
});

// API для списка пользователей
app.get("/api/users", (req, res) => {
  db.all(`SELECT username FROM users`, [], (err, rows) => {
    if (err) {
      console.error("Ошибка при получении пользователей:", err.message);
      res.status(500).send("Ошибка сервера");
      return;
    }

    const users = rows.map((row) => row.username);
    res.json(users);
  });
});

// API для истории сообщений
app.get("/api/messages/:username", (req, res) => {
  const username = req.params.username;
  db.all(
    `SELECT timestamp, message, sender FROM messages WHERE username = ? ORDER BY timestamp`,
    [username],
    (err, rows) => {
      if (err) {
        console.error("Ошибка при получении сообщений:", err.message);
        res.status(500).send("Ошибка сервера");
        return;
      }

      res.json(rows);
    }
  );
});

// API для отправки сообщения
app.post("/api/messages", (req, res) => {
  const { username, message } = req.body;

  const query = `INSERT INTO messages (username, message, sender) VALUES (?, ?, 'admin')`;

  db.get(
    `SELECT chat_id FROM users WHERE username = ?`,
    [username],
    (err, row) => {
      if (err) {
        console.error("Ошибка при чтении базы:", err.message);
        res.status(500).send("Ошибка сервера");
        return;
      }

      if (!row) {
        res.status(404).send("Пользователь не найден.");
        return;
      }

      const chatId = row.chat_id;

      db.run(query, [username, message], (err) => {
        if (err) {
          console.error("Ошибка при сохранении сообщения:", err.message);
          res.status(500).send("Ошибка сервера");
          return;
        }

        bot
          .sendMessage(chatId, message)
          .then(() => {
            sendMessageToClients({
              username: "admin",
              message: message,
              sender: "admin",
              timestamp: new Date().toISOString(),
            });

            res.status(200).send("Сообщение успешно отправлено.");
          })
          .catch((error) => {
            console.error("Ошибка отправки сообщения:", error.message);
            res.status(500).send("Ошибка отправки сообщения.");
          });
      });
    }
  );
});

// Запуск сервера
app.server = app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

app.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

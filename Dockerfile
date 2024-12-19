# Используем минимальный Node.js образ
FROM node:18-alpine

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Копируем package.json и package-lock.json для установки зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем оставшиеся файлы проекта
COPY . .

# Открываем порт для работы приложения
EXPOSE 3000

# Команда для запуска приложения
CMD ["node", "server.js"]

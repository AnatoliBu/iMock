FROM node:16-alpine

# Установка рабочей директории
WORKDIR /app

# Копирование файлов проекта
COPY tools/wiremock_viewer /app/

# Установка зависимостей
RUN npm init -y && \
    npm install express cors http-proxy-middleware

# Переменные окружения
ENV PORT=8001
ENV DOCKER_CONTAINER=true

# Экспонирование порта
EXPOSE 8001

# Запуск приложения
CMD ["node", "proxy.js"] 
FROM node:16-alpine

# Установка рабочей директории
WORKDIR /app

# Копирование файлов проекта
COPY tools/wiremock_viewer /app/

# Установка дополнительных зависимостей для работы в сети Docker
RUN npm init -y && \
    npm install express cors http-proxy-middleware

# Переменные окружения
ENV PORT=8001
ENV DOCKER_CONTAINER=true
ENV WIREMOCK_HOST=wiremock
ENV WIREMOCK_PORT=8080
ENV WIREMOCK_TOKEN=""

# Создаем файлы для логов
RUN mkdir -p /app/logs && \
    touch /app/logs/access.log && \
    touch /app/logs/error.log

# Копируем скрипт запуска с поддержкой переменных окружения
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Экспонирование порта
EXPOSE 8001

# Запуск приложения через entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"] 
#!/bin/bash

# Скрипт установки и запуска iMock для сервера, где nginx и wiremock уже запущены
# Версия без sudo-прав

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker не найден. Убедитесь, что Docker установлен и доступен в PATH.${NC}"
    exit 1
fi

# Ищем Docker Compose в различных местах или используем переданный путь
if [[ -n "$1" && -f "$1" && -x "$1" ]]; then
    DOCKER_COMPOSE_CMD="$1"
    echo -e "${GREEN}Используем Docker Compose по указанному пути: $DOCKER_COMPOSE_CMD${NC}"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo -e "${GREEN}Docker Compose найден в PATH.${NC}"
elif [ -f "/usr/local/bin/docker-compose" ]; then
    DOCKER_COMPOSE_CMD="/usr/local/bin/docker-compose"
    echo -e "${GREEN}Docker Compose найден в /usr/local/bin/docker-compose.${NC}"
elif [ -f "$HOME/.local/bin/docker-compose" ]; then
    DOCKER_COMPOSE_CMD="$HOME/.local/bin/docker-compose"
    echo -e "${GREEN}Docker Compose найден в $HOME/.local/bin/docker-compose.${NC}"
elif [ -f "/opt/bin/docker-compose" ]; then
    DOCKER_COMPOSE_CMD="/opt/bin/docker-compose"
    echo -e "${GREEN}Docker Compose найден в /opt/bin/docker-compose.${NC}"
elif [ -f "/usr/bin/docker-compose" ]; then
    DOCKER_COMPOSE_CMD="/usr/bin/docker-compose"
    echo -e "${GREEN}Docker Compose найден в /usr/bin/docker-compose.${NC}"
elif docker --help | grep -q 'compose'; then
    # Проверяем наличие подкоманды 'compose' у docker (Docker Compose V2)
    DOCKER_COMPOSE_CMD="docker compose"
    echo -e "${GREEN}Используем Docker Compose V2 через команду 'docker compose'.${NC}"
else
    echo -e "${YELLOW}Docker Compose не найден. Пожалуйста, укажите путь к Docker Compose:${NC}"
    echo -e "${YELLOW}Пример: ./install.sh /путь/к/docker-compose${NC}"
    echo -e "${YELLOW}Или установите Docker Compose и добавьте его в PATH.${NC}"
    
    # Спрашиваем пользователя, хочет ли он продолжить без Docker Compose
    read -p "Продолжить установку без Docker Compose, используя только Docker? (y/n): " continue_without_dc
    if [[ "$continue_without_dc" == "y" || "$continue_without_dc" == "Y" ]]; then
        echo -e "${YELLOW}Продолжаем установку без Docker Compose.${NC}"
        DOCKER_COMPOSE_CMD=""
    else
        exit 1
    fi
fi

# Проверяем текущие сетевые настройки Docker
echo -e "${YELLOW}Проверка сетей Docker...${NC}"
NETWORK_NAME="wiremock-network"

# Проверяем, существует ли уже сеть
if ! docker network inspect $NETWORK_NAME &> /dev/null; then
    echo -e "${YELLOW}Создание новой сети Docker '$NETWORK_NAME'...${NC}"
    docker network create $NETWORK_NAME
    
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Ошибка создания сети Docker. Используем существующую сеть docker_default...${NC}"
        NETWORK_NAME="docker_default"
    else
        echo -e "${GREEN}Сеть '$NETWORK_NAME' успешно создана.${NC}"
    fi
else
    echo -e "${GREEN}Сеть '$NETWORK_NAME' уже существует.${NC}"
fi

# Проверяем, есть ли контейнеры wiremock и nginx в сети
WIREMOCK_ID=$(docker ps -qf "name=wiremock")
NGINX_ID=$(docker ps -qf "name=nginx")

if [ -z "$WIREMOCK_ID" ]; then
    echo -e "${YELLOW}Предупреждение: Контейнер wiremock не найден. Убедитесь, что он запущен и настроен правильно.${NC}"
fi

if [ -z "$NGINX_ID" ]; then
    echo -e "${YELLOW}Предупреждение: Контейнер nginx не найден. Убедитесь, что он запущен и настроен правильно.${NC}"
fi

# Добавляем контейнеры в нужную сеть, если они еще не в ней
if [ ! -z "$WIREMOCK_ID" ]; then
    if ! docker network inspect $NETWORK_NAME | grep -q "$WIREMOCK_ID"; then
        echo -e "${YELLOW}Добавление контейнера wiremock в сеть '$NETWORK_NAME'...${NC}"
        docker network connect $NETWORK_NAME $WIREMOCK_ID
    fi
fi

if [ ! -z "$NGINX_ID" ]; then
    if ! docker network inspect $NETWORK_NAME | grep -q "$NGINX_ID"; then
        echo -e "${YELLOW}Добавление контейнера nginx в сеть '$NETWORK_NAME'...${NC}"
        docker network connect $NETWORK_NAME $NGINX_ID
    fi
fi

# Настройка токена авторизации WireMock
echo -e "${YELLOW}Настройка токена авторизации WireMock...${NC}"
read -p "Введите токен авторизации для WireMock API (оставьте пустым для генерации случайного токена): " WIREMOCK_TOKEN

if [ -z "$WIREMOCK_TOKEN" ]; then
    # Генерируем случайный токен
    WIREMOCK_TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    echo -e "${GREEN}Сгенерирован случайный токен: ${WIREMOCK_TOKEN}${NC}"
fi

# Спрашиваем учетные данные для HTTP-авторизации
read -p "Введите имя пользователя для HTTP-авторизации: " USERNAME
read -s -p "Введите пароль для HTTP-авторизации: " PASSWORD
echo

# Создаем htpasswd файл без sudo
echo -e "${YELLOW}Создание файла htpasswd...${NC}"
mkdir -p htpasswd

# Если доступен htpasswd, используем его
if command -v htpasswd &> /dev/null; then
    htpasswd -bc htpasswd/.htpasswd $USERNAME $PASSWORD
else
    # Иначе используем perl или python для генерации хеша
    if command -v perl &> /dev/null; then
        PASS_HASH=$(perl -le 'print crypt($ARGV[0], "salt")' $PASSWORD)
        echo "$USERNAME:$PASS_HASH" > htpasswd/.htpasswd
    elif command -v python3 &> /dev/null; then
        echo "$USERNAME:$(python3 -c "import crypt; print(crypt.crypt('$PASSWORD'))")" > htpasswd/.htpasswd
    else
        echo -e "${YELLOW}Не удалось создать htpasswd файл: утилиты htpasswd, perl и python3 не найдены.${NC}"
        echo -e "${YELLOW}Используйте внешний инструмент для создания htpasswd файла и поместите его в htpasswd/.htpasswd${NC}"
        exit 1
    fi
fi

# Проверяем, создан ли файл htpasswd
if [ -f "htpasswd/.htpasswd" ]; then
    echo -e "${GREEN}Файл htpasswd создан успешно.${NC}"
else
    echo -e "${YELLOW}Ошибка создания файла htpasswd.${NC}"
    exit 1
fi

# Создаем конфигурацию nginx для iMock с использованием нашего токена
echo -e "${YELLOW}Создание конфигурации Nginx для iMock...${NC}"
cat > nginx_imock.conf << EOF
server {
    listen 8001;
    
    # Базовая HTTP-авторизация
    auth_basic "WireMock Viewer Authentication";
    auth_basic_user_file /etc/nginx/htpasswd;
    
    # Настройки для прокси
    location / {
        proxy_pass http://imock:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Проксирование запросов к WireMock API
    location /proxy/wiremock {
        # Здесь авторизация также включена через общие настройки сервера
        proxy_pass http://imock:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Создаем docker-compose.yml только для imock
cat > docker-compose.yml << EOF
version: "3"

services:
  imock:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "8001:8001"
    environment:
      - PORT=8001
      - DOCKER_CONTAINER=true
      - WIREMOCK_TOKEN=${WIREMOCK_TOKEN}
    volumes:
      - ./nginx_imock.conf:/app/nginx_imock.conf:ro
      - ./htpasswd:/app/htpasswd:ro
    networks:
      - wiremock-net

networks:
  wiremock-net:
    external:
      name: ${NETWORK_NAME}
EOF

# Собираем и запускаем контейнер iMock (Docker Compose или только Docker)
echo -e "${YELLOW}Сборка и запуск iMock...${NC}"

if [ -n "$DOCKER_COMPOSE_CMD" ]; then
    # Используем Docker Compose
    $DOCKER_COMPOSE_CMD up -d --build
    RESULT=$?
else
    # Используем только Docker
    echo -e "${YELLOW}Запуск без Docker Compose. Использование прямых команд Docker...${NC}"
    
    # Собираем образ
    docker build -t imock .
    
    # Проверяем, существует ли уже контейнер imock
    if docker ps -a --format '{{.Names}}' | grep -q '^imock$'; then
        echo -e "${YELLOW}Контейнер imock уже существует. Останавливаем и удаляем...${NC}"
        docker stop imock || true
        docker rm imock || true
    fi
    
    # Запускаем контейнер
    docker run -d --name imock \
        --network=${NETWORK_NAME} \
        -p 8001:8001 \
        -e PORT=8001 \
        -e DOCKER_CONTAINER=true \
        -e WIREMOCK_TOKEN=${WIREMOCK_TOKEN} \
        -v $(pwd)/nginx_imock.conf:/app/nginx_imock.conf:ro \
        -v $(pwd)/htpasswd:/app/htpasswd:ro \
        imock
    
    RESULT=$?
fi

if [ $RESULT -eq 0 ]; then
    echo -e "${GREEN}iMock успешно запущен!${NC}"
    echo -e "${GREEN}iMock (WireMock Viewer) доступен по адресу: http://localhost:8001${NC}"
    
    # Даем рекомендации по настройке Nginx
    echo -e "${YELLOW}Для включения iMock в существующий Nginx:${NC}"
    echo -e "${YELLOW}1. Скопируйте созданный файл nginx_imock.conf в директорию конфигураций Nginx.${NC}"
    echo -e "${YELLOW}2. Скопируйте htpasswd/.htpasswd в директорию, доступную для Nginx.${NC}"
    echo -e "${YELLOW}3. Перезапустите Nginx для применения изменений.${NC}"
    
    # Создаем файл с настройками для сохранения
    echo -e "WireMock Token: Bearer ${WIREMOCK_TOKEN}\nUsername: ${USERNAME}\nPassword: ${PASSWORD}" > credentials.txt
    chmod 600 credentials.txt
    echo -e "${YELLOW}Учетные данные сохранены в файле credentials.txt (видны только текущему пользователю)${NC}"
    
    # Дополнительная информация для использования
    echo -e "${GREEN}Для использования iMock:${NC}"
    echo -e "${GREEN}1. Откройте http://адрес_сервера:8001${NC}"
    echo -e "${GREEN}2. Введите учетные данные: ${USERNAME} / ваш_пароль${NC}"
    echo -e "${GREEN}3. В поле URL сервера введите: http://wiremock:8080${NC}"
    echo -e "${GREEN}4. В поле Токен введите: Bearer ${WIREMOCK_TOKEN}${NC}"
else
    echo -e "${YELLOW}Ошибка при запуске iMock.${NC}"
fi 
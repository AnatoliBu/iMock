#!/bin/bash

# Скрипт установки и запуска iMock с WireMock и nginx

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверяем наличие Docker и Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Docker не установлен. Установка Docker...${NC}"
    
    # Обновляем списки пакетов
    sudo apt update
    
    # Устанавливаем зависимости
    sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
    
    # Добавляем официальный GPG-ключ Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    
    # Добавляем репозиторий Docker
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
    
    # Обновляем списки пакетов и устанавливаем Docker
    sudo apt update
    sudo apt install -y docker-ce
    
    # Добавляем пользователя в группу docker
    sudo usermod -aG docker ${USER}
    
    echo -e "${GREEN}Docker успешно установлен.${NC}"
    echo -e "${YELLOW}Чтобы применить изменение групп, рекомендуется перезапустить сессию (выйти и войти заново).${NC}"
    
    # Применяем изменения групп локально
    newgrp docker
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Docker Compose не установлен. Установка Docker Compose...${NC}"
    
    # Устанавливаем Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    echo -e "${GREEN}Docker Compose успешно установлен.${NC}"
fi

# Настройка токена авторизации WireMock
echo -e "${YELLOW}Настройка токена авторизации WireMock...${NC}"
read -p "Введите токен авторизации для WireMock API (оставьте пустым для генерации случайного токена): " WIREMOCK_TOKEN

if [ -z "$WIREMOCK_TOKEN" ]; then
    # Генерируем случайный токен
    WIREMOCK_TOKEN=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    echo -e "${GREEN}Сгенерирован случайный токен: ${WIREMOCK_TOKEN}${NC}"
fi

# Заменяем токен в nginx.conf
sed -i "s/Bearer WIREMOCK_AUTH_TOKEN/Bearer ${WIREMOCK_TOKEN}/g" nginx.conf

# Спрашиваем учетные данные для HTTP-авторизации
read -p "Введите имя пользователя для HTTP-авторизации: " USERNAME
read -s -p "Введите пароль для HTTP-авторизации: " PASSWORD
echo

# Создаем htpasswd файл
echo -e "${YELLOW}Создание файла htpasswd...${NC}"
chmod +x create-htpasswd.sh
./create-htpasswd.sh "$USERNAME" "$PASSWORD"

# Проверяем наличие SSL-сертификатов
if [ ! -d "nginx_ssl" ]; then
    echo -e "${YELLOW}Директория с SSL-сертификатами не существует. Создаем самоподписанные сертификаты...${NC}"
    
    mkdir -p nginx_ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx_ssl/key.key -out nginx_ssl/cert.crt \
        -subj "/C=RU/ST=Moscow/L=Moscow/O=iMock/CN=localhost"
    
    echo -e "${GREEN}Самоподписанные SSL-сертификаты созданы.${NC}"
fi

# Создаем директорию для маппингов WireMock
if [ ! -d "mappings" ]; then
    echo -e "${YELLOW}Создание директории для маппингов WireMock...${NC}"
    mkdir -p mappings
fi

# Запускаем Docker Compose
echo -e "${YELLOW}Запуск Docker Compose...${NC}"
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Установка успешно завершена!${NC}"
    echo -e "${GREEN}WireMock доступен по адресу: http://localhost:8080 и https://localhost:8443${NC}"
    echo -e "${GREEN}WireMock Admin API доступен с заголовком Authorization: Bearer ${WIREMOCK_TOKEN}${NC}"
    echo -e "${GREEN}iMock (WireMock Viewer) доступен по адресу: http://localhost:8001${NC}"
    echo -e "${GREEN}Учетные данные для iMock:${NC}"
    echo -e "${GREEN}  Пользователь: ${USERNAME}${NC}"
    echo -e "${GREEN}  Пароль: ${PASSWORD}${NC}"
    
    # Создаем файл с настройками для сохранения
    echo -e "WireMock Token: Bearer ${WIREMOCK_TOKEN}\nUsername: ${USERNAME}\nPassword: ${PASSWORD}" > credentials.txt
    chmod 600 credentials.txt
    echo -e "${YELLOW}Учетные данные сохранены в файле credentials.txt (видны только текущему пользователю)${NC}"
else
    echo -e "${YELLOW}Ошибка при запуске Docker Compose.${NC}"
fi 
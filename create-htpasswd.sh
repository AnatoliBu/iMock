#!/bin/bash

# Скрипт для создания файла htpasswd для базовой HTTP-авторизации в nginx

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ $# -ne 2 ]; then
    echo -e "${YELLOW}Использование: $0 <имя_пользователя> <пароль>${NC}"
    exit 1
fi

USERNAME=$1
PASSWORD=$2

# Проверяем наличие apache2-utils (htpasswd)
if ! command -v htpasswd &> /dev/null; then
    echo -e "${YELLOW}Установка apache2-utils для генерации htpasswd...${NC}"
    sudo apt-get update
    sudo apt-get install -y apache2-utils
fi

# Создаем директорию для htpasswd, если она не существует
mkdir -p htpasswd

# Генерируем htpasswd файл
echo -e "${YELLOW}Создание htpasswd файла с пользователем '${USERNAME}'...${NC}"
htpasswd -bc htpasswd/.htpasswd $USERNAME $PASSWORD

# Проверяем результат
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Файл htpasswd успешно создан!${NC}"
    echo -e "${GREEN}Пользователь: ${USERNAME}${NC}"
    echo -e "${GREEN}Пароль: ${PASSWORD}${NC}"
    echo -e "${YELLOW}Не забудьте запустить 'docker-compose up -d' для применения изменений${NC}"
else
    echo -e "${YELLOW}Ошибка при создании htpasswd файла${NC}"
fi 
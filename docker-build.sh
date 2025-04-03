#!/bin/bash

# Скрипт для сборки и запуска Docker-образа WireMock Viewer

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Имя образа
IMAGE_NAME="imock-wiremock-viewer"
PORT=8001

echo -e "${YELLOW}Сборка Docker-образа ${IMAGE_NAME}...${NC}"
docker build -t ${IMAGE_NAME} .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Сборка успешно завершена!${NC}"
    
    # Проверяем, запущен ли уже контейнер с таким именем
    CONTAINER_ID=$(docker ps -q -f name="${IMAGE_NAME}")
    if [ ! -z "$CONTAINER_ID" ]; then
        echo -e "${YELLOW}Останавливаем предыдущий контейнер...${NC}"
        docker stop ${IMAGE_NAME}
        docker rm ${IMAGE_NAME}
    fi
    
    echo -e "${YELLOW}Запуск контейнера на порту ${PORT}...${NC}"
    docker run -d --name ${IMAGE_NAME} -p ${PORT}:8001 ${IMAGE_NAME}
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Контейнер успешно запущен!${NC}"
        echo -e "${GREEN}WireMock Viewer доступен по адресу: http://localhost:${PORT}${NC}"
    else
        echo -e "${YELLOW}Не удалось запустить контейнер.${NC}"
    fi
else
    echo -e "${YELLOW}Не удалось собрать Docker-образ.${NC}"
fi 
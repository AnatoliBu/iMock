#!/bin/bash

# Скрипт для управления маппингами wiremock для API Iiko
# Автор: автоматически сгенерировано
# Дата: $(date +%Y-%m-%d)

WIREMOCK_HOST="rdsh2.lphub.net"
WIREMOCK_PORT="8080"
AUTH_TOKEN="Bearer test"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для получения всех маппингов
function get_all_mappings() {
  echo -e "${BLUE}Получение всех маппингов...${NC}"
  curl -s -H "Authorization: $AUTH_TOKEN" "http://$WIREMOCK_HOST:$WIREMOCK_PORT/__admin/mappings" | jq
}

# Функция для получения конкретного маппинга по ID
function get_mapping_by_id() {
  if [ -z "$1" ]; then
    echo -e "${RED}Ошибка: Необходимо указать ID маппинга${NC}"
    exit 1
  fi
  
  echo -e "${BLUE}Получение маппинга с ID $1...${NC}"
  curl -s -H "Authorization: $AUTH_TOKEN" "http://$WIREMOCK_HOST:$WIREMOCK_PORT/__admin/mappings/$1" | jq
}

# Функция для обновления маппинга
function update_mapping() {
  if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Ошибка: Необходимо указать ID маппинга и файл с JSON${NC}"
    echo "Использование: $0 update_mapping <id> <json_file>"
    exit 1
  fi
  
  echo -e "${BLUE}Обновление маппинга с ID $1...${NC}"
  curl -s -X PUT -H "Authorization: $AUTH_TOKEN" -H "Content-Type: application/json" \
    --data @"$2" "http://$WIREMOCK_HOST:$WIREMOCK_PORT/__admin/mappings/$1"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Маппинг успешно обновлен${NC}"
  else
    echo -e "${RED}Ошибка при обновлении маппинга${NC}"
  fi
}

# Функция для создания нового маппинга
function create_mapping() {
  if [ -z "$1" ]; then
    echo -e "${RED}Ошибка: Необходимо указать файл с JSON${NC}"
    echo "Использование: $0 create_mapping <json_file>"
    exit 1
  fi
  
  echo -e "${BLUE}Создание нового маппинга...${NC}"
  curl -s -X POST -H "Authorization: $AUTH_TOKEN" -H "Content-Type: application/json" \
    --data @"$1" "http://$WIREMOCK_HOST:$WIREMOCK_PORT/__admin/mappings"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Маппинг успешно создан${NC}"
  else
    echo -e "${RED}Ошибка при создании маппинга${NC}"
  fi
}

# Функция для удаления маппинга
function delete_mapping() {
  if [ -z "$1" ]; then
    echo -e "${RED}Ошибка: Необходимо указать ID маппинга${NC}"
    exit 1
  fi
  
  echo -e "${YELLOW}Удаление маппинга с ID $1...${NC}"
  read -p "Вы уверены? (y/n): " confirm
  
  if [ "$confirm" = "y" ]; then
    curl -s -X DELETE -H "Authorization: $AUTH_TOKEN" "http://$WIREMOCK_HOST:$WIREMOCK_PORT/__admin/mappings/$1"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}Маппинг успешно удален${NC}"
    else
      echo -e "${RED}Ошибка при удалении маппинга${NC}"
    fi
  else
    echo -e "${BLUE}Операция отменена${NC}"
  fi
}

# Функция для экспорта маппинга в JSON-файл
function export_mapping() {
  if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Ошибка: Необходимо указать ID маппинга и имя файла для экспорта${NC}"
    echo "Использование: $0 export_mapping <id> <output_file>"
    exit 1
  fi
  
  echo -e "${BLUE}Экспорт маппинга с ID $1 в файл $2...${NC}"
  curl -s -H "Authorization: $AUTH_TOKEN" "http://$WIREMOCK_HOST:$WIREMOCK_PORT/__admin/mappings/$1" > "$2"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Маппинг успешно экспортирован в $2${NC}"
  else
    echo -e "${RED}Ошибка при экспорте маппинга${NC}"
  fi
}

# Функция для получения токена (для тестирования)
function get_token() {
  echo -e "${BLUE}Получение токена авторизации...${NC}"
  curl -s -X POST "http://$WIREMOCK_HOST:$WIREMOCK_PORT/api/1/access_token" | jq
}

# Функция для получения стоп-листа
function get_stop_list() {
  echo -e "${BLUE}Получение стоп-листа...${NC}"
  curl -s -X POST -H "Authorization: $AUTH_TOKEN" -H "Content-Type: application/json" \
    --data '{"organizationIds":["9b7a990d-1b02-4f09-8307-47fb293ddf34"]}' \
    "http://$WIREMOCK_HOST:$WIREMOCK_PORT/api/1/stop_lists" | jq
}

# Функция для проверки статуса терминалов
function check_terminals() {
  echo -e "${BLUE}Проверка статуса терминалов...${NC}"
  curl -s -X POST "http://$WIREMOCK_HOST:$WIREMOCK_PORT/api/1/terminal_groups/is_alive" | jq
}

# Вывод справки
function show_help() {
  echo -e "${BLUE}Скрипт для управления маппингами wiremock для API Iiko${NC}"
  echo
  echo -e "Использование: $0 <команда> [аргументы]"
  echo
  echo -e "Доступные команды:"
  echo -e "  ${GREEN}all${NC}                     - Получить все маппинги"
  echo -e "  ${GREEN}get <id>${NC}                - Получить маппинг по ID"
  echo -e "  ${GREEN}update <id> <file>${NC}      - Обновить маппинг по ID, используя JSON из файла"
  echo -e "  ${GREEN}create <file>${NC}           - Создать новый маппинг из JSON-файла"
  echo -e "  ${GREEN}delete <id>${NC}             - Удалить маппинг по ID"
  echo -e "  ${GREEN}export <id> <file>${NC}      - Экспортировать маппинг в JSON-файл"
  echo -e "  ${GREEN}token${NC}                   - Получить токен авторизации (тест)"
  echo -e "  ${GREEN}stop_list${NC}               - Получить стоп-лист"
  echo -e "  ${GREEN}terminals${NC}               - Проверить статус терминалов"
  echo -e "  ${GREEN}help${NC}                    - Показать эту справку"
  echo
  echo -e "Примеры:"
  echo -e "  $0 all"
  echo -e "  $0 get 549b5a2e-31e5-4445-988a-61d2fa32199f"
  echo -e "  $0 export 549b5a2e-31e5-4445-988a-61d2fa32199f menu_mapping.json"
  echo -e "  $0 update 549b5a2e-31e5-4445-988a-61d2fa32199f updated_menu.json"
}

# Основная логика
case "$1" in
  "all")
    get_all_mappings
    ;;
  "get")
    get_mapping_by_id "$2"
    ;;
  "update")
    update_mapping "$2" "$3"
    ;;
  "create")
    create_mapping "$2"
    ;;
  "delete")
    delete_mapping "$2"
    ;;
  "export")
    export_mapping "$2" "$3"
    ;;
  "token")
    get_token
    ;;
  "stop_list")
    get_stop_list
    ;;
  "terminals")
    check_terminals
    ;;
  "help" | *)
    show_help
    ;;
esac

exit 0 
#!/bin/bash

# Скрипт для запуска прокси-сервера для WireMock Viewer

current_dir=$(dirname "$(readlink -f "$0")")
echo "Запуск WireMock Viewer из директории: $current_dir"

# Проверка наличия Node.js
if command -v node &>/dev/null; then
    echo "Запуск прокси-сервера на Node.js..."
    cd "$current_dir"
    node proxy.js
elif command -v nodejs &>/dev/null; then
    echo "Запуск прокси-сервера на Node.js (nodejs)..."
    cd "$current_dir"
    nodejs proxy.js
else
    echo "Node.js не найден. Попытка запуска Python сервера (без поддержки CORS)..."
    
    # Проверка наличия Python как запасной вариант
    if command -v python3 &>/dev/null; then
        echo "Запуск сервера на Python 3..."
        cd "$current_dir"
        python3 -m http.server 8000
    elif command -v python &>/dev/null; then
        echo "Запуск сервера на Python..."
        cd "$current_dir"
        python -m SimpleHTTPServer 8000
    else
        echo "Ни Node.js, ни Python не найдены. Установите Node.js для полноценной работы инструмента."
        exit 1
    fi
fi

# После завершения работы сервера
echo "Сервер остановлен" 
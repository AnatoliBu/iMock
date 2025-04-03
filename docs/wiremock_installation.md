# Руководство по установке и настройке WireMock

## Содержание
1. [Введение](#введение)
2. [Установка WireMock](#установка-wiremock)
   - [Варианты установки](#варианты-установки)
   - [Запуск через Docker](#запуск-через-docker)
   - [Запуск из JAR-файла](#запуск-из-jar-файла)
3. [Настройка WireMock](#настройка-wiremock)
   - [Параметры запуска](#параметры-запуска)
   - [Файлы конфигурации](#файлы-конфигурации)
   - [Настройка маппингов при запуске](#настройка-маппингов-при-запуске)
4. [Инструментарий для работы с WireMock](#инструментарий-для-работы-с-wiremock)
   - [WireMock Viewer](#wiremock-viewer)
   - [Postman](#postman)
   - [REST-клиенты](#rest-клиенты)
5. [Интеграция с Iiko API](#интеграция-с-iiko-api)
   - [Настройка прокси для Iiko API](#настройка-прокси-для-iiko-api)
   - [Маппинги для Iiko API](#маппинги-для-iiko-api)

## Введение

WireMock — это гибкий инструмент для создания моков HTTP API. Он позволяет создавать заглушки (стабы) для веб-сервисов, что полезно для тестирования и разработки приложений без необходимости обращаться к реальным API.

Основные возможности WireMock:
- Создание статических ответов на HTTP-запросы
- Проверка запросов по критериям (заголовки, параметры, тело)
- Добавление динамики через шаблоны ответов
- Имитация задержек и ошибок
- Проксирование запросов к реальным сервисам с возможностью записи и воспроизведения
- API для программного управления поведением

## Установка WireMock

### Варианты установки

Существует несколько способов установки и запуска WireMock:

1. **Запуск через Docker** - самый простой способ для быстрого старта
2. **Запуск из JAR-файла** - классический способ, требует Java
3. **Как зависимость в проекте** - для программного управления из кода
4. **Через Maven/Gradle плагины** - для интеграции с процессом сборки

Для упрощения работы в данном руководстве рассмотрим первые два способа.

### Запуск через Docker

Для запуска WireMock через Docker выполните следующие шаги:

1. Установите Docker, если он еще не установлен:
   ```bash
   # Для Ubuntu
   sudo apt-get update
   sudo apt-get install docker.io
   
   # Для macOS
   brew install docker
   ```

2. Запустите контейнер WireMock:
   ```bash
   docker run -it --rm -p 8080:8080 wiremock/wiremock:latest
   ```

3. Для запуска с дополнительными опциями:
   ```bash
   docker run -it --rm \
     -p 8080:8080 \
     -v $PWD/mappings:/home/wiremock/mappings \
     -v $PWD/files:/home/wiremock/__files \
     --name wiremock \
     wiremock/wiremock:latest \
     --verbose
   ```

### Запуск из JAR-файла

Для запуска WireMock из JAR-файла:

1. Установите Java 8 или выше, если он еще не установлен:
   ```bash
   # Для Ubuntu
   sudo apt-get update
   sudo apt-get install default-jre
   
   # Для macOS
   brew install openjdk
   ```

2. Скачайте последнюю версию WireMock:
   ```bash
   wget https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-jre8-standalone/2.33.2/wiremock-jre8-standalone-2.33.2.jar -O wiremock.jar
   ```

3. Запустите WireMock:
   ```bash
   java -jar wiremock.jar
   ```

4. Для запуска с дополнительными параметрами:
   ```bash
   java -jar wiremock.jar --port 8080 --verbose
   ```

## Настройка WireMock

### Параметры запуска

WireMock поддерживает различные параметры запуска:

| Параметр | Описание | Пример |
|----------|----------|--------|
| `--port` | Порт HTTP | `--port 8080` |
| `--https-port` | Порт HTTPS | `--https-port 8443` |
| `--bind-address` | Адрес для привязки | `--bind-address 0.0.0.0` |
| `--verbose` | Подробный вывод | `--verbose` |
| `--root-dir` | Корневая директория | `--root-dir /path/to/files` |
| `--global-response-templating` | Включить шаблоны ответов | `--global-response-templating` |

Полный список опций доступен в [официальной документации](http://wiremock.org/docs/running-standalone/).

### Файлы конфигурации

WireMock хранит данные в двух основных директориях:
- `mappings/` - содержит JSON-файлы с маппингами (определения запросов и ответов)
- `__files/` - содержит статические файлы для ответов

Структура директорий при запуске:

```
wiremock/
├── mappings/
│   ├── example-mapping.json
│   └── ...
├── __files/
│   ├── example-response.json
│   └── ...
└── wiremock.jar
```

### Настройка маппингов при запуске

Существует несколько способов предварительной настройки маппингов:

1. **Создание JSON-файлов** - разместите файлы `.json` в директории `mappings/`
2. **Использование API** - отправьте POST-запросы к `/mappings` после запуска
3. **Запись реального трафика** - настройте WireMock как прокси и запишите взаимодействие

Пример файла маппинга:

```json
{
  "id": "00001",
  "name": "Пример API-ответа",
  "request": {
    "method": "GET",
    "url": "/api/example"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "message": "Пример ответа",
      "code": 0
    }
  }
}
```

## Инструментарий для работы с WireMock

### WireMock Viewer

WireMock Viewer — это инструмент с графическим интерфейсом для удобного управления маппингами WireMock, доступный в данном проекте.

#### Установка и запуск WireMock Viewer:

1. Перейдите в директорию инструмента:
   ```bash
   cd tools/wiremock_viewer
   ```

2. Запустите инструмент:
   ```bash
   ./run.sh
   ```

3. Откройте браузер и перейдите по адресу:
   ```
   http://localhost:8000
   ```

#### Основные функции WireMock Viewer:

- Просмотр всех маппингов на сервере WireMock
- Фильтрация маппингов по типу и поисковому запросу
- Редактирование маппингов с валидацией
- Создание новых маппингов
- Удаление маппингов
- Настройка прокси-маппингов
- Редактирование JSON с подсветкой синтаксиса

### Postman

Postman — популярный инструмент для работы с API, который можно использовать для взаимодействия с WireMock:

1. Скачайте и установите Postman с [официального сайта](https://www.postman.com/downloads/)
2. Создайте коллекцию для работы с WireMock API
3. Настройте запросы для основных операций:
   - `GET /__admin/mappings` — получение всех маппингов
   - `POST /__admin/mappings` — создание нового маппинга
   - `PUT /__admin/mappings/{id}` — обновление маппинга
   - `DELETE /__admin/mappings/{id}` — удаление маппинга

### REST-клиенты

Помимо Postman, можно использовать различные REST-клиенты:

1. **cURL** — консольный инструмент:
   ```bash
   # Получение всех маппингов
   curl -X GET http://localhost:8080/__admin/mappings
   
   # Создание маппинга
   curl -X POST http://localhost:8080/__admin/mappings \
     -H "Content-Type: application/json" \
     -d '{"request": {"url": "/example", "method": "GET"}, "response": {"status": 200}}'
   ```

2. **HTTPie** — более удобная альтернатива cURL:
   ```bash
   # Установка
   pip install httpie
   
   # Использование
   http GET localhost:8080/__admin/mappings
   ```

3. **VSCode REST Client** — расширение для VSCode для отправки HTTP-запросов из файлов .http

## Интеграция с Iiko API

### Настройка прокси для Iiko API

WireMock можно использовать как прокси для Iiko API, что позволяет:
- Перехватывать и модифицировать запросы
- Кэшировать ответы для ускорения разработки
- Имитировать различные сценарии работы API

Для настройки прокси:

1. Запустите WireMock с параметрами прокси:
   ```bash
   java -jar wiremock.jar --record-mappings --proxy-all="https://api-eu.syrve.live"
   ```

2. Настройте клиентское приложение на использование WireMock в качестве прокси:
   ```
   http://localhost:8080
   ```

3. Для записи только определенных запросов:
   ```json
   {
     "request": {
       "urlPattern": "/api/.*"
     },
     "response": {
       "proxyBaseUrl": "https://api-eu.syrve.live"
     }
   }
   ```

### Маппинги для Iiko API

В проекте доступны готовые маппинги для основных методов Iiko API:

1. **Аутентификация**:
   ```json
   {
     "request": {
       "method": "POST",
       "url": "/api/1/access_token"
     },
     "response": {
       "status": 200,
       "jsonBody": {
         "token": "sample-token-for-testing",
         "validTill": "2099-12-31T23:59:59.999"
       }
     }
   }
   ```

2. **Получение организаций**:
   ```json
   {
     "request": {
       "method": "POST",
       "url": "/api/1/organizations"
     },
     "response": {
       "status": 200,
       "jsonBody": {
         "organizations": [
           {
             "id": "b8f50ab8-779d-448f-9cdc-105e65527660",
             "name": "Тестовая организация"
           }
         ]
       }
     }
   }
   ```

Полный набор готовых маппингов для Iiko API находится в директории `mappings/iiko/`.

Для использования готовых маппингов:

1. Скопируйте файлы из директории `mappings/iiko/` в директорию `mappings/` вашего экземпляра WireMock
2. Перезапустите WireMock или выполните сброс конфигурации через API:
   ```bash
   curl -X POST http://localhost:8080/__admin/mappings/reset
   ```

Дополнительную информацию о структуре маппингов для Iiko API можно найти в документе [iiko_api_mappings.md](iiko_api_mappings.md). 
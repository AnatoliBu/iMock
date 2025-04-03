# Документация по WireMock и инструментам

## Обзор

Данная документация содержит информацию о работе с WireMock и инструментами для управления его маппингами. WireMock — это инструмент для создания моков HTTP API, который позволяет имитировать работу веб-сервисов для тестирования и разработки.

## Содержание

### Основная документация

- [Установка и настройка WireMock](wiremock_installation.md) - руководство по установке, настройке и запуску WireMock
- [Структура JSON-маппингов WireMock](wiremock_json_mappings.md) - описание формата маппингов WireMock

### WireMock Viewer

- [Руководство пользователя WireMock Viewer](wiremock_viewer.md) - описание функций и использования инструмента WireMock Viewer
- [Техническая документация WireMock Viewer](wiremock_viewer_tech.md) - описание архитектуры и реализации инструмента

## Быстрый старт

### Установка WireMock

```bash
# Через Docker
docker run -it --rm -p 8080:8080 wiremock/wiremock:latest

# Через JAR-файл
wget https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-jre8-standalone/2.33.2/wiremock-jre8-standalone-2.33.2.jar -O wiremock.jar
java -jar wiremock.jar
```

### Запуск WireMock Viewer

```bash
cd tools/wiremock_viewer
./run.sh
```

После запуска откройте браузер и перейдите по адресу: `http://localhost:8001`

## Основные функции WireMock

- Создание статических ответов на HTTP-запросы
- Проверка запросов по критериям (заголовки, параметры, тело)
- Добавление динамики через шаблоны ответов
- Имитация задержек и ошибок
- Проксирование запросов к реальным сервисам с возможностью записи и воспроизведения
- API для программного управления поведением

## Структура проекта

```
project/
├── docs/                     # Документация
│   ├── README.md             # Этот файл
│   ├── wiremock_installation.md
│   ├── wiremock_json_mappings.md
│   ├── wiremock_viewer.md
│   └── wiremock_viewer_tech.md
│
├── mappings/                 # Готовые маппинги для WireMock
│   └── other/                # Другие примеры маппингов
│
└── tools/                    # Инструменты для работы с WireMock
    └── wiremock_viewer/      # Веб-интерфейс для управления маппингами
        ├── index.html        # HTML-интерфейс
        ├── style.css         # Стили
        ├── script.js         # JavaScript-логика
        ├── proxy.js          # Прокси-сервер Node.js
        ├── run.sh            # Скрипт запуска
        └── README.md         # Краткая документация
```

## Полезные ссылки

- [Официальная документация WireMock](http://wiremock.org/docs/)
- [GitHub репозиторий WireMock](https://github.com/wiremock/wiremock)
- [Справочник по API WireMock](http://wiremock.org/docs/api/)
- [WireMock Docker Image](https://hub.docker.com/r/wiremock/wiremock)

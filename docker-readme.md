# Docker для WireMock Viewer

Этот документ содержит инструкции по сборке и запуску Docker-образа для WireMock Viewer.

## Требования

- Docker

## Быстрый старт

### Использование скрипта автоматизации

Для быстрой сборки и запуска можно использовать скрипт `docker-build.sh`:

```bash
chmod +x docker-build.sh
./docker-build.sh
```

Скрипт автоматически соберет образ, остановит предыдущий контейнер (если он запущен) и запустит новый контейнер на порту 8001.

### Ручная сборка и запуск

1. Сборка образа:

```bash
docker build -t imock-wiremock-viewer .
```

2. Запуск контейнера:

```bash
docker run -d --name imock-wiremock-viewer -p 8001:8001 imock-wiremock-viewer
```

После запуска WireMock Viewer будет доступен по адресу [http://localhost:8001](http://localhost:8001)

## Настройка порта

Если вы хотите использовать другой порт, например 9000, используйте следующую команду:

```bash
docker run -d --name imock-wiremock-viewer -p 9000:8001 imock-wiremock-viewer
```

После запуска WireMock Viewer будет доступен по адресу [http://localhost:9000](http://localhost:9000)

## Подключение к WireMock

После запуска WireMock Viewer в Docker можно подключиться к WireMock, указав:

1. URL WireMock-сервера (например, http://wiremock-host:8080)
2. Токен авторизации (если требуется)

## Важные примечания

- Убедитесь, что WireMock-сервер доступен для контейнера Docker. Если WireMock запущен на той же машине, вам может потребоваться использовать IP-адрес хоста вместо `localhost`.
- В Docker-контейнере браузер не открывается автоматически, поэтому вам нужно вручную открыть URL [http://localhost:8001](http://localhost:8001) (или другой порт, если вы его изменили).

## Остановка и удаление контейнера

Для остановки контейнера:

```bash
docker stop imock-wiremock-viewer
```

Для удаления контейнера:

```bash
docker rm imock-wiremock-viewer
```

## Удаление образа

Если вы хотите удалить образ:

```bash
docker rmi imock-wiremock-viewer
``` 
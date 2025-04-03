# Установка iMock на существующий сервер с Nginx и WireMock

Эта инструкция предназначена для установки iMock (WireMock Viewer) на сервер, где уже запущены контейнеры Nginx и WireMock.

## Предварительные требования

- Доступ к серверу через SSH
- Docker установлен на сервере
- Docker Compose установлен или опционально (скрипт может работать только с Docker)
- Уже запущенные контейнеры nginx и wiremock
- Docker должен быть доступен без sudo прав

## Шаги установки

### 1. Подключитесь к серверу через SSH
```bash
ssh имя_пользователя@адрес_сервера
```

### 2. Клонируйте репозиторий
```bash
git clone https://github.com/AnatoliBu/iMock.git
cd iMock
```

### 3. Запустите скрипт установки
```bash
chmod +x install.sh
./install.sh
```

Если Docker Compose установлен, но не находится в PATH, вы можете явно указать путь:
```bash
./install.sh /путь/к/docker-compose
```

Также вы можете продолжить установку без Docker Compose, если выберете соответствующую опцию в скрипте.

Скрипт проведет вас через следующие шаги:
1. Найдет Docker Compose или предложит использовать только Docker
2. Создаст или подключится к существующей Docker-сети
3. Проверит наличие контейнеров nginx и wiremock и добавит их в общую сеть
4. Предложит настроить токен авторизации для WireMock API
5. Попросит указать учетные данные для HTTP-авторизации
6. Создаст конфигурацию nginx для iMock
7. Соберет и запустит контейнер iMock

### 4. Настройка Nginx для проксирования iMock

После запуска скрипта будет создан файл `nginx_imock.conf`. Вам нужно добавить его содержимое в конфигурацию вашего Nginx.

1. Скопируйте файл конфигурации в директорию, доступную Nginx:
```bash
# Если ваш Nginx работает в Docker, найдите путь к папке конфигурации:
docker inspect nginx | grep -A20 Mounts

# Копируем файл (подставьте свой путь):
cp nginx_imock.conf /путь/к/nginx/conf.d/
```

2. Скопируйте htpasswd файл:
```bash
# Копируем htpasswd файл (подставьте свой путь):
cp htpasswd/.htpasswd /путь/к/nginx/htpasswd/
```

3. Перезагрузите Nginx:
```bash
# Если Nginx запущен в Docker:
docker exec nginx nginx -s reload

# Или перезапустите контейнер:
docker restart nginx
```

## Проверка работоспособности

1. Откройте браузер и перейдите по адресу `http://адрес_сервера:8001`.
2. Введите учетные данные, которые вы указали при установке.
3. В поле URL сервера введите `http://wiremock:8080`.
4. В поле Токен введите `Bearer ВАШ_ТОКЕН`.

## Устранение неполадок

### Проблема с Docker Compose

Если Docker Compose не найден или вызывает ошибки:

```bash
# Проверьте наличие Docker Compose
which docker-compose

# Если Docker Compose установлен, но не найден в PATH, укажите полный путь:
./install.sh /полный/путь/к/docker-compose

# Вы также можете запустить скрипт без Docker Compose, выбрав опцию 'y',
# когда скрипт спросит "Продолжить установку без Docker Compose?"
```

### Проблема с Docker-сетью

Если контейнеры не могут взаимодействовать друг с другом:

```bash
# Проверьте существующие сети Docker
docker network ls

# Проверьте, какие контейнеры подключены к сети
docker network inspect wiremock-network

# Вручную подключите контейнеры к сети
docker network connect wiremock-network nginx
docker network connect wiremock-network wiremock
docker network connect wiremock-network imock
```

### Проблемы с доступом к WireMock API

Если iMock не может подключиться к WireMock:

1. Проверьте имя хоста WireMock:
```bash
# Имя контейнера WireMock должно совпадать с тем, что указано в переменной окружения WIREMOCK_HOST
docker ps --format "{{.Names}}"
```

2. Проверьте токен авторизации:
```bash
# Посмотрите, какой токен сохранен:
cat credentials.txt

# Или найдите его в конфигурации Nginx:
grep Bearer nginx_imock.conf
```

3. Остановите и перезапустите контейнер iMock с правильными переменными окружения:
```bash
# Если использовался Docker Compose:
$DOCKER_COMPOSE_CMD down
WIREMOCK_HOST=имя_контейнера_wiremock WIREMOCK_TOKEN="Bearer ВАШ_ТОКЕН" $DOCKER_COMPOSE_CMD up -d

# Если использовался только Docker:
docker stop imock
docker rm imock
docker run -d --name imock \
  --network=wiremock-network \
  -p 8001:8001 \
  -e WIREMOCK_HOST=имя_контейнера_wiremock \
  -e WIREMOCK_PORT=8080 \
  -e WIREMOCK_TOKEN="Bearer ВАШ_ТОКЕН" \
  -v $(pwd)/nginx_imock.conf:/app/nginx_imock.conf:ro \
  -v $(pwd)/htpasswd:/app/htpasswd:ro \
  imock
```

## Альтернативный метод настройки

Если у вас возникают сложности с интеграцией в существующую инфраструктуру, можно настроить iMock вручную:

1. Соберите Docker-образ:
```bash
docker build -t imock .
```

2. Запустите контейнер, явно указав все переменные окружения:
```bash
docker run -d \
  --name imock \
  --network=имя_вашей_сети \
  -p 8001:8001 \
  -e WIREMOCK_HOST=имя_контейнера_wiremock \
  -e WIREMOCK_PORT=8080 \
  -e WIREMOCK_TOKEN="Bearer ВАШ_ТОКЕН" \
  imock
```

3. Добавьте правило проксирования в конфигурацию Nginx:
```
location /imock/ {
    proxy_pass http://imock:8001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    auth_basic "WireMock Viewer Authentication";
    auth_basic_user_file /etc/nginx/htpasswd;
}
```

## Проверка журналов

Если что-то не работает, посмотрите журналы контейнера:
```bash
docker logs imock

# Или в режиме реального времени:
docker logs -f imock
``` 
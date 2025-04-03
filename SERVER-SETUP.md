# Инструкция по установке iMock на Ubuntu-сервер

Эта инструкция описывает процесс установки iMock (WireMock Viewer), WireMock и Nginx с базовой HTTP-авторизацией на Ubuntu-сервер.

## Требования

- Ubuntu-сервер (16.04 / 18.04 / 20.04 / 22.04)
- Доступ к серверу через SSH
- Привилегии sudo

## Быстрая установка (автоматический способ)

1. Подключитесь к серверу через SSH:
   ```bash
   ssh имя_пользователя@адрес_сервера
   ```

2. Клонируйте репозиторий:
   ```bash
   git clone https://github.com/AnatoliBu/iMock.git
   cd iMock
   ```

3. **Важно!** Перед запуском установки, замените токен авторизации в файле `nginx.conf`:
   ```bash
   # Откройте файл nginx.conf
   nano nginx.conf
   
   # Найдите строку
   if ($http_authorization != "Bearer WIREMOCK_AUTH_TOKEN") {
   
   # Замените WIREMOCK_AUTH_TOKEN на ваш собственный безопасный токен, например:
   if ($http_authorization != "Bearer ваш_секретный_токен") {
   ```

4. Запустите скрипт установки:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

5. Следуйте инструкциям скрипта, укажите имя пользователя и пароль для HTTP-авторизации.

6. После завершения установки WireMock будет доступен по адресам:
   - http://адрес_сервера:8080
   - https://адрес_сервера:8443 (с самоподписанным SSL-сертификатом)

7. iMock (WireMock Viewer) будет доступен по адресу:
   - http://адрес_сервера:8001 (защищен базовой HTTP-авторизацией)

## Ручная установка (если автоматический способ не подходит)

### Шаг 1: Установка Docker и Docker Compose

```bash
# Обновление системы
sudo apt update
sudo apt upgrade -y

# Установка необходимых пакетов
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Добавление Docker репозитория
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Установка Docker
sudo apt update
sudo apt install -y docker-ce

# Добавление пользователя в группу docker
sudo usermod -aG docker ${USER}
newgrp docker

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Шаг 2: Клонирование репозитория и настройка

```bash
# Клонируем репозиторий
git clone https://github.com/AnatoliBu/iMock.git
cd iMock

# Изменяем токен авторизации (ОБЯЗАТЕЛЬНО!)
nano nginx.conf
# Найдите строку с "Bearer WIREMOCK_AUTH_TOKEN" и замените на ваш собственный токен
```

### Шаг 3: Создание SSL-сертификатов (если нужны)

```bash
mkdir -p nginx_ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx_ssl/key.key -out nginx_ssl/cert.crt \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=iMock/CN=localhost"
```

### Шаг 4: Создание файла htpasswd для базовой авторизации

```bash
# Установка apache2-utils, если не установлен
sudo apt install -y apache2-utils

# Создание директории для файла htpasswd
mkdir -p htpasswd

# Генерация файла htpasswd (измените имя пользователя и пароль!)
htpasswd -bc htpasswd/.htpasswd ваше_имя_пользователя ваш_пароль
```

### Шаг 5: Запуск Docker Compose

```bash
docker-compose up -d
```

## Настройка

### Изменение учетных данных HTTP-авторизации

Чтобы изменить имя пользователя и пароль:

```bash
chmod +x create-htpasswd.sh
./create-htpasswd.sh новое_имя_пользователя новый_пароль
docker-compose restart nginx
```

### Изменение токена авторизации для WireMock Admin API

Отредактируйте файл `nginx.conf` и замените строку:
```
if ($http_authorization != "Bearer WIREMOCK_AUTH_TOKEN") {
```

на новый токен:
```
if ($http_authorization != "Bearer ваш_новый_токен") {
```

Затем перезапустите Nginx:
```bash
docker-compose restart nginx
```

## Использование

### WireMock Admin API

Для доступа к WireMock Admin API используйте заголовок авторизации:
```
Authorization: Bearer ваш_токен
```

Пример CURL-запроса:
```bash
curl -H "Authorization: Bearer ваш_токен" http://адрес_сервера:8080/__admin/mappings
```

### iMock (WireMock Viewer)

1. Откройте в браузере: http://адрес_сервера:8001
2. Введите учетные данные, указанные при установке
3. В поле "URL сервера" введите: http://wiremock:8080
4. В поле "Токен" введите: Bearer ваш_токен (тот же токен, что установлен в nginx.conf)
5. Нажмите "Загрузить маппинги"

## Устранение проблем

### Проверка статуса контейнеров

```bash
docker-compose ps
```

### Просмотр логов контейнеров

```bash
# Логи всех контейнеров
docker-compose logs

# Логи конкретного контейнера
docker-compose logs nginx
docker-compose logs wiremock
docker-compose logs imock
```

### Перезапуск контейнеров

```bash
docker-compose restart
```

### Остановка и удаление контейнеров

```bash
docker-compose down
``` 
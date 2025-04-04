# Решение проблемы авторизации в iMock с помощью Nginx

Чтобы решить проблему с постоянными запросами авторизации в iMock при работе через Nginx, можно использовать специальный заголовок `X-Original-Authorization`.

## Подход

1. В вашем Nginx-конфиге для `/proxy/wiremock` маршрута **автоматически** добавляйте заголовок авторизации с вашими учетными данными.
2. Для оригинального Bearer-токена WireMock API используйте заголовок `X-Original-Authorization`.

## Пример конфигурации Nginx

```nginx
location /proxy/wiremock {
    # Автоматически добавляем Basic авторизацию 
    # Замените Basic YWRtaW46cGFzc3dvcmQ= на ваши закодированные учетные данные
    # Для генерации: echo -n "username:password" | base64
    proxy_set_header Authorization "Basic YWRtaW46cGFzc3dvcmQ=";
    
    # Передаем оригинальный токен WireMock через специальный заголовок
    proxy_set_header X-Original-Authorization $http_authorization;
    
    # Обычные настройки проксирования
    proxy_pass http://imock:8001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Как это работает

1. Когда пользователь открывает интерфейс iMock, он проходит обычную HTTP Basic Authentication.
2. Когда iMock отправляет API-запросы к WireMock через `/proxy/wiremock`, Nginx автоматически добавляет заголовок `Authorization` с предустановленными учетными данными.
3. Одновременно, Nginx сохраняет оригинальный токен WireMock API (Bearer токен) в заголовке `X-Original-Authorization`.
4. Контейнер iMock получает оба заголовка и использует `X-Original-Authorization` для запросов к WireMock API.

Таким образом, пользователю потребуется ввести учетные данные всего один раз при открытии интерфейса, а не для каждого API-запроса. 
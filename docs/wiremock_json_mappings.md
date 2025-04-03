# Структура JSON-маппингов WireMock

## Содержание
1. [Введение](#введение)
2. [Базовая структура маппинга](#базовая-структура-маппинга)
3. [Конфигурация запроса](#конфигурация-запроса)
4. [Конфигурация ответа](#конфигурация-ответа)
5. [Прокси-маппинги](#прокси-маппинги)
6. [Метаданные](#метаданные)
7. [Примеры маппингов](#примеры-маппингов)

## Введение

Маппинги в WireMock — это JSON-объекты, которые определяют соответствие между запросами и ответами. Каждый маппинг описывает, какие запросы должны быть обработаны и какие ответы должны быть возвращены. Этот документ описывает структуру маппингов, используемых в WireMock и отображаемых в WireMock Viewer.

## Базовая структура маппинга

Каждый маппинг имеет следующую базовую структуру:

```json
{
  "id": "12345678-1234-1234-1234-123456789abc",
  "name": "Название маппинга",
  "request": {
    // Конфигурация запроса
  },
  "response": {
    // Конфигурация ответа
  },
  "priority": 1,
  "persistent": true
}
```

### Обязательные поля

- `id` — уникальный идентификатор маппинга (UUID)
- `request` — объект, описывающий условия запроса
- `response` — объект, описывающий ответ

### Необязательные поля

- `name` — название маппинга (для удобства чтения)
- `priority` — приоритет маппинга (чем выше значение, тем выше приоритет)
- `persistent` — флаг, указывающий, должен ли маппинг сохраняться при перезапуске WireMock

## Конфигурация запроса

Объект `request` описывает условия, при которых будет срабатывать маппинг. Он может содержать следующие поля:

### Методы HTTP-запроса

- `method` — метод HTTP-запроса (GET, POST, PUT, DELETE и т.д.)
  - Если не указан, соответствует любому методу
  - Пример: `"method": "GET"`

### URL-адреса и паттерны

WireMock поддерживает несколько способов определения URL:

- `url` — точное соответствие URL
  - Пример: `"url": "/api/resource"`

- `urlPattern` — соответствие URL по регулярному выражению
  - Пример: `"urlPattern": "/api/resource/[0-9]+"` 

- `urlPath` — точное соответствие пути URL (без параметров запроса)
  - Пример: `"urlPath": "/api/resource"`

- `urlPathPattern` — соответствие пути URL по регулярному выражению
  - Пример: `"urlPathPattern": "/api/resource/[a-z]+"` 

### Заголовки запроса

```json
"headers": {
  "Content-Type": {
    "equalTo": "application/json"
  },
  "Authorization": {
    "contains": "Bearer"
  }
}
```

### Параметры запроса

```json
"queryParameters": {
  "param1": {
    "equalTo": "value1"
  },
  "param2": {
    "matches": "value[0-9]+"
  }
}
```

### Шаблоны тела запроса

```json
"bodyPatterns": [
  {
    "equalToJson": {
      "key": "value"
    }
  },
  {
    "matchesJsonPath": "$.items[?(@.id == 1)]"
  }
]
```

### Операторы сравнения

WireMock поддерживает следующие операторы для сравнения:

- `equalTo` — точное соответствие
- `contains` — содержит подстроку
- `matches` — соответствует регулярному выражению
- `doesNotMatch` — не соответствует регулярному выражению
- `equalToJson` — соответствует JSON-объекту
- `matchesJsonPath` — соответствует JSONPath-выражению
- `absent` — заголовок/параметр отсутствует

## Конфигурация ответа

Объект `response` описывает ответ, который будет возвращен при срабатывании маппинга:

### Статус код

```json
"status": 200
```

### Заголовки ответа

```json
"headers": {
  "Content-Type": "application/json",
  "Cache-Control": "no-cache"
}
```

### Тело ответа

Тело ответа может быть задано несколькими способами:

- Строка (для текстовых данных)
  ```json
  "body": "Текстовый ответ"
  ```

- JSON-объект
  ```json
  "jsonBody": {
    "key": "value",
    "array": [1, 2, 3]
  }
  ```

- Бинарные данные (Base64)
  ```json
  "base64Body": "SGVsbG8gV29ybGQ="
  ```

### Задержка ответа

```json
"fixedDelayMilliseconds": 1000
```

### Трансформация ответа

```json
"transformers": ["response-template"],
"transformerParameters": {
  "parameter1": "value1"
}
```

## Прокси-маппинги

Прокси-маппинги позволяют перенаправлять запросы на другие серверы:

```json
{
  "request": {
    "urlPattern": "/proxy/.*"
  },
  "response": {
    "proxyBaseUrl": "https://api.example.com",
    "additionalProxyRequestHeaders": {
      "X-Forwarded-For": "wiremock"
    }
  }
}
```

### Основные поля прокси-маппингов

- `proxyBaseUrl` — базовый URL для проксирования запросов
- `additionalProxyRequestHeaders` — дополнительные заголовки, добавляемые к проксируемому запросу

## Метаданные

Метаданные позволяют добавлять дополнительную информацию к маппингам:

```json
"metadata": {
  "category": "api",
  "version": "1.0",
  "author": "John Doe"
}
```

## Примеры маппингов

### Пример 1: Простой GET-запрос

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "name": "Получение списка пользователей",
  "request": {
    "method": "GET",
    "url": "/api/users"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "users": [
        {"id": 1, "name": "John Doe"},
        {"id": 2, "name": "Jane Smith"}
      ]
    }
  }
}
```

### Пример 2: POST-запрос с проверкой тела

```json
{
  "id": "00000000-0000-0000-0000-000000000002",
  "name": "Создание пользователя",
  "request": {
    "method": "POST",
    "url": "/api/users",
    "headers": {
      "Content-Type": {
        "equalTo": "application/json"
      }
    },
    "bodyPatterns": [
      {
        "matchesJsonPath": "$.name"
      }
    ]
  },
  "response": {
    "status": 201,
    "headers": {
      "Content-Type": "application/json",
      "Location": "/api/users/3"
    },
    "jsonBody": {
      "id": 3,
      "name": "{{jsonPath request.body '$.name'}}"
    },
    "transformers": ["response-template"]
  }
}
```

### Пример 3: Прокси-маппинг

```json
{
  "id": "00000000-0000-0000-0000-000000000003",
  "name": "Прокси к внешнему API",
  "request": {
    "urlPathPattern": "/api/external/.*"
  },
  "response": {
    "proxyBaseUrl": "https://api.external-service.com",
    "additionalProxyRequestHeaders": {
      "Authorization": "Bearer token123"
    }
  },
  "priority": 10,
  "persistent": true
}
```

### Пример 4: Маппинг с задержкой

```json
{
  "id": "00000000-0000-0000-0000-000000000004",
  "name": "Медленный ответ",
  "request": {
    "method": "GET",
    "url": "/api/slow-response"
  },
  "response": {
    "status": 200,
    "headers": {
      "Content-Type": "application/json"
    },
    "jsonBody": {
      "message": "Этот ответ был задержан на 2 секунды"
    },
    "fixedDelayMilliseconds": 2000
  }
}
``` 
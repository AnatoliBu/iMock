# Техническая документация WireMock Viewer

## Содержание
1. [Структура проекта](#структура-проекта)
2. [Клиентская часть](#клиентская-часть)
   - [HTML](#html)
   - [CSS](#css)
   - [JavaScript](#javascript)
3. [Серверная часть](#серверная-часть)
   - [Прокси-сервер](#прокси-сервер)
   - [Скрипт запуска](#скрипт-запуска)
4. [Описание основных функций](#описание-основных-функций)
5. [Механизм работы JSON-редактора](#механизм-работы-json-редактора)
6. [Взаимодействие с WireMock API](#взаимодействие-с-wiremock-api)

## Структура проекта

WireMock Viewer состоит из следующих файлов и директорий:

```
tools/wiremock_viewer/
├── index.html            # Основной HTML-файл интерфейса
├── style.css             # CSS-стили для интерфейса
├── script.js             # JavaScript-код приложения
├── proxy.js              # Node.js прокси-сервер для обхода CORS
├── run.sh                # Скрипт для запуска приложения
└── README.md             # Документация по использованию
```

## Клиентская часть

### HTML

Файл `index.html` содержит структуру пользовательского интерфейса WireMock Viewer и подключает необходимые стили и скрипты.

#### Основные блоки HTML:

1. **Заголовок и мета-информация**
   ```html
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>WireMock Mappings Viewer</title>
     <link rel="stylesheet" href="style.css">
     <link href="https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.10.0/jsoneditor.min.css" rel="stylesheet" type="text/css">
   </head>
   ```

2. **Панель настроек и фильтров**
   ```html
   <details open class="collapsible-section" id="settings-section">
     <summary class="collapsible-header">Настройки и фильтры</summary>
     <div class="collapsible-content">
       <!-- Настройки сервера и фильтры -->
     </div>
   </details>
   ```

3. **Контейнер списка маппингов**
   ```html
   <div id="mappings-container">
     <div class="loading" id="loading">Загрузка маппингов...</div>
     <div id="mappings-list"></div>
   </div>
   ```

4. **Редактор маппингов**
   ```html
   <div id="editor-container" class="hidden">
     <h2>Редактор маппинга</h2>
     <!-- Вкладки и формы редактирования -->
   </div>
   ```

5. **Полноэкранный JSON-редактор**
   ```html
   <div id="fullscreen-editor-container" class="hidden">
     <div class="fullscreen-header">
       <span id="fullscreen-editor-title">JSON Editor</span>
       <button id="fullscreen-close" class="btn">Закрыть [Esc]</button>
     </div>
     <div id="fullscreen-editor"></div>
   </div>
   ```

### CSS

Файл `style.css` содержит стили для всех элементов пользовательского интерфейса.

#### Основные группы стилей:

1. **Переменные CSS**
   ```css
   :root {
     --dark-bg: #1e1e1e;
     --lighter-bg: #333;
     --highlight-bg: #404040;
     --text-color: #e0e0e0;
     /* и другие переменные */
   }
   ```

2. **Базовые стили**
   ```css
   body {
     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
     background-color: var(--dark-bg);
     color: var(--text-color);
     line-height: 1.6;
   }
   ```

3. **Стили для маппингов**
   ```css
   .mapping {
     margin-bottom: 15px;
     border: 1px solid var(--border-color);
     border-radius: var(--border-radius);
     background-color: var(--light-bg);
   }
   ```

4. **Стили для JSON-редактора**
   ```css
   .json-editor {
     height: 300px;
     border: 1px solid var(--border-color);
     border-radius: var(--border-radius);
   }
   ```

5. **Стили для полноэкранного режима**
   ```css
   #fullscreen-editor-container {
     position: fixed;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     background-color: var(--darker-bg);
     z-index: 1100;
     display: flex;
     flex-direction: column;
   }
   ```

### JavaScript

Файл `script.js` содержит всю логику клиентской части приложения.

#### Глобальные переменные

```javascript
let mappings = [];                // Массив маппингов
let currentMapping = null;        // Текущий редактируемый маппинг
let jsonEditors = {};             // Экземпляры JSON-редакторов
let currentFullscreenEditor = null; // Текущий полноэкранный редактор
```

#### Основные модули JavaScript:

1. **Инициализация**
   ```javascript
   function init() {
     // Настройка обработчиков событий и инициализация компонентов
   }
   ```

2. **Загрузка маппингов**
   ```javascript
   async function loadMappings() {
     // Загрузка маппингов с сервера
   }
   ```

3. **Фильтрация и отображение маппингов**
   ```javascript
   function filterMappings() {
     // Фильтрация маппингов по тексту и типу
   }
   
   function renderMappings(mappingsToRender) {
     // Отображение маппингов в интерфейсе
   }
   ```

4. **Редактирование маппингов**
   ```javascript
   function openEditor(mapping) {
     // Открытие редактора для выбранного маппинга
   }
   
   function updateEditorFields() {
     // Обновление полей редактора из текущего маппинга
   }
   
   function updateMappingFromForm() {
     // Обновление объекта маппинга из полей формы
   }
   
   async function saveMapping() {
     // Сохранение маппинга на сервере
   }
   ```

5. **Работа с JSON-редактором**
   ```javascript
   function initJSONEditors() {
     // Инициализация JSON-редакторов
   }
   
   function updateEditorsContent() {
     // Обновление содержимого редакторов
   }
   
   function expandEditor(editorId) {
     // Разворачивание редактора на весь экран
   }
   
   function closeFullscreen() {
     // Закрытие полноэкранного режима
   }
   ```

## Серверная часть

### Прокси-сервер

Файл `proxy.js` содержит реализацию Node.js-сервера для обхода CORS-ограничений и проксирования запросов к WireMock API.

#### Основные функции прокси-сервера:

1. **Настройки сервера**
   ```javascript
   const PORT = 8000; // Порт для локального сервера
   const STATIC_DIR = __dirname; // Директория с статическими файлами
   ```

2. **Обработка запросов**
   ```javascript
   const server = http.createServer((req, res) => {
     // Обработка запросов к серверу
   });
   ```

3. **Проксирование запросов**
   ```javascript
   // Извлекаем реальный путь wiremock
   const wiremockPath = pathname.replace('/proxy/wiremock', '');
   
   // Получаем параметры из URL запроса
   const wiremockHost = parsedUrl.query.host || 'localhost';
   const wiremockPort = parsedUrl.query.port || '8080';
   ```

4. **Установка CORS-заголовков**
   ```javascript
   // Устанавливаем заголовки CORS
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
   ```

### Скрипт запуска

Файл `run.sh` содержит скрипт для запуска прокси-сервера и открытия приложения в браузере.

#### Основные функции скрипта:

1. **Определение текущей директории**
   ```bash
   current_dir=$(dirname "$(readlink -f "$0")")
   ```

2. **Проверка наличия Node.js**
   ```bash
   if command -v node &>/dev/null; then
     echo "Запуск прокси-сервера на Node.js..."
     cd "$current_dir"
     node proxy.js
   ```

3. **Запасной вариант с Python**
   ```bash
   elif command -v python3 &>/dev/null; then
     echo "Запуск сервера на Python 3..."
     cd "$current_dir"
     python3 -m http.server 8000
   ```

## Описание основных функций

### Загрузка и отображение маппингов

1. **loadMappings()**
   - Получает URL сервера и токен авторизации из полей ввода
   - Создает прокси URL для обхода CORS
   - Выполняет запрос к WireMock API для получения маппингов
   - Сохраняет полученные маппинги в глобальную переменную
   - Вызывает функцию отображения маппингов

2. **renderMappings(mappingsToRender)**
   - Очищает контейнер списка маппингов
   - Для каждого маппинга создает элемент в интерфейсе
   - Отображает основную информацию о маппинге (метод, URL, статус)
   - Добавляет индикатор для прокси-маппингов
   - Устанавливает обработчики событий для клика по маппингу

3. **renderMappingDetails(mapping, container)**
   - Отображает детальную информацию о маппинге
   - Показывает параметры запроса и ответа
   - Отображает дополнительную информацию о прокси, если маппинг является прокси-маппингом

### Редактирование маппингов

1. **openEditor(mapping)**
   - Копирует выбранный маппинг в глобальную переменную currentMapping
   - Заполняет поля формы редактирования значениями из маппинга
   - Обновляет содержимое JSON-редакторов
   - Отображает редактор маппинга

2. **updateEditorFields()**
   - Заполняет поля формы значениями из текущего маппинга
   - Создает элементы для заголовков запроса и ответа
   - Обновляет содержимое JSON-редакторов
   - Обновляет видимость вкладок в зависимости от типа маппинга

3. **updateMappingFromForm()**
   - Собирает данные из полей формы
   - Получает данные из JSON-редакторов
   - Обновляет объект маппинга
   - Удаляет пустые поля из объекта маппинга

4. **saveMapping()**
   - Обновляет маппинг из полей формы
   - Проверяет корректность маппинга
   - Отправляет запрос на обновление маппинга на сервер
   - Обновляет список маппингов после успешного сохранения

5. **deleteMapping()**
   - Запрашивает подтверждение удаления
   - Отправляет запрос на удаление маппинга на сервер
   - Удаляет маппинг из списка после успешного удаления

### JSON-редактор

1. **initJSONEditors()**
   - Создает экземпляры JSONEditor для разных частей маппинга
   - Настраивает параметры редакторов
   - Устанавливает обработчики событий для кнопок разворачивания

2. **updateEditorsContent()**
   - Обновляет содержимое JSON-редакторов из текущего маппинга
   - Обрабатывает различные форматы данных (JSON, текст)

3. **expandEditor(editorId)**
   - Определяет, какой редактор разворачивается
   - Копирует данные из исходного редактора
   - Создает полноэкранный редактор с теми же данными
   - Отображает полноэкранный контейнер

4. **closeFullscreen()**
   - Получает данные из полноэкранного редактора
   - Обновляет исходный редактор этими данными
   - Уничтожает полноэкранный редактор
   - Скрывает полноэкранный контейнер

## Механизм работы JSON-редактора

WireMock Viewer использует библиотеку JSONEditor для работы с JSON-данными. В приложении реализованы следующие экземпляры редактора:

1. **Raw JSON Editor (jsonEditors.raw)**
   - Отображает полное JSON-представление маппинга
   - Изменения в этом редакторе обновляют все остальные поля и редакторы

2. **Response Body Editor (jsonEditors.responseBody)**
   - Отображает тело ответа
   - Поддерживает как обычный текст, так и JSON-данные

3. **Fullscreen Editor (currentFullscreenEditor.fullscreenEditor)**
   - Временный редактор для полноэкранного режима
   - Синхронизируется с исходным редактором при открытии и закрытии

### Редактирование шаблонов тела запроса (Body Patterns)

В текущей версии редактор шаблонов тела запроса реализован как набор полей с ключом, оператором и значением:
- **Ключ**: тип оператора сравнения (например, equalToJson)
- **Оператор**: устанавливается автоматически на equalTo
- **Значение**: шаблон для сравнения с телом запроса

Пользователь может добавлять, удалять и редактировать шаблоны с помощью соответствующих кнопок.

### Конфигурация редакторов

```javascript
const jsonEditorOptions = {
  mode: 'code',
  modes: ['code', 'tree'],
  search: true,
  navigationBar: true,
  statusBar: true,
  mainMenuBar: true,
  theme: 'ace/theme/monokai',
  onChange: function() {
    // Обработчик изменений
  }
};
```

## Взаимодействие с WireMock API

WireMock Viewer взаимодействует с WireMock API через следующие функции:

1. **Создание прокси URL**
   ```javascript
   function createProxyUrl(serverUrl, path) {
     // Создает URL для проксирования запроса
     return `/proxy/wiremock${path}?host=${hostname}&port=${port}`;
   }
   ```

2. **Загрузка маппингов**
   ```javascript
   const proxyUrl = createProxyUrl(serverUrl, '/__admin/mappings');
   const response = await fetch(proxyUrl, {
     method: 'GET',
     headers: headers
   });
   ```

3. **Сохранение маппинга**
   ```javascript
   const proxyUrl = createProxyUrl(serverUrl, `/__admin/mappings/${currentMapping.id}`);
   const response = await fetch(proxyUrl, {
     method: 'PUT',
     headers: headers,
     body: JSON.stringify(currentMapping)
   });
   ```

4. **Удаление маппинга**
   ```javascript
   const proxyUrl = createProxyUrl(serverUrl, `/__admin/mappings/${currentMapping.id}`);
   const response = await fetch(proxyUrl, {
     method: 'DELETE',
     headers: headers
   });
   ```

Все запросы к WireMock API проходят через прокси-сервер для обхода CORS-ограничений. Прокси-сервер добавляет необходимые заголовки CORS к ответам. 
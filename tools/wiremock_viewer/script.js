// Глобальные переменные
let mappings = [];
let currentMapping = null;
let jsonEditors = {}; // Объект для хранения экземпляров редакторов
let currentFullscreenEditor = null; // Текущий редактор в полноэкранном режиме

// DOM элементы
const elements = {
    serverUrl: document.getElementById('server-url'),
    authToken: document.getElementById('auth-token'),
    loadButton: document.getElementById('load-mappings'),
    filterText: document.getElementById('filter-text'),
    filterType: document.getElementById('filter-type'),
    filterTags: document.getElementById('filter-tags'),
    mappingsList: document.getElementById('mappings-list'),
    loading: document.getElementById('loading'),
    editorContainer: document.getElementById('editor-container'),
    saveButton: document.getElementById('save-mapping'),
    cancelButton: document.getElementById('cancel-edit'),
    deleteButton: document.getElementById('delete-mapping'),
    rawJson: document.getElementById('edit-raw-json'),
    method: document.getElementById('edit-method'),
    url: document.getElementById('edit-url'),
    bodyPattern: document.getElementById('edit-body-pattern'),
    status: document.getElementById('edit-status'),
    responseBody: document.getElementById('edit-response-body'),
    delay: document.getElementById('edit-delay'),
    name: document.getElementById('edit-name'),
    priority: document.getElementById('edit-priority'),
    persistent: document.getElementById('edit-persistent'),
    requestHeaders: document.getElementById('request-headers'),
    responseHeaders: document.getElementById('response-headers'),
    addRequestHeader: document.getElementById('add-request-header'),
    addResponseHeader: document.getElementById('add-response-header'),
    toast: document.getElementById('toast'),
    proxyHeaders: document.getElementById('proxy-headers'),
    proxyBaseUrl: document.getElementById('proxy-base-url'),
    fullscreenContainer: document.getElementById('fullscreen-editor-container'),
    fullscreenEditor: document.getElementById('fullscreen-editor'),
    fullscreenTitle: document.getElementById('fullscreen-editor-title'),
    fullscreenClose: document.getElementById('fullscreen-close'),
    addProxyHeader: document.getElementById('add-proxy-header'),
    addBodyPattern: document.getElementById('add-body-pattern'),
    bodyPatterns: document.getElementById('body-patterns'),
    duplicateButton: document.getElementById('duplicate-mapping'),
};

// Настройки JSON редактора
const jsonEditorOptions = {
    mode: 'code',           // Режим редактирования кода
    modes: ['code', 'tree'], // Доступные режимы
    search: true,           // Включить поиск
    navigationBar: true,    // Включить навигационную панель
    statusBar: true,        // Включить строку статуса
    mainMenuBar: true,      // Включить основное меню
    theme: 'ace/theme/monokai', // Тема для редактора
    onChange: function() {  // Обработчик изменений
        try {
            const editorId = this.options.editorId;
            if (editorId === 'raw') {
                currentMapping = this.get();
                updateEditorsFromRaw();
            }
        } catch (e) {
            // Игнорируем ошибки парсинга во время редактирования
        }
    }
};

// Функция для создания прокси URL для обхода CORS
function createProxyUrl(serverUrl, path) {
    if (!serverUrl) return null;
    
    try {
        // Разбираем URL сервера
        const parsedUrl = new URL(serverUrl);
        const hostname = parsedUrl.hostname;
        const port = parsedUrl.port;
        
        // Создаем прокси URL
        return `/proxy/wiremock${path}?host=${hostname}&port=${port}`;
    } catch (e) {
        console.error("Ошибка разбора URL:", e);
        return null;
    }
}

// Инициализация
function init() {
    // Добавляем обработчики событий
    elements.loadButton.addEventListener('click', loadMappings);
    elements.filterText.addEventListener('input', filterMappings);
    elements.filterType.addEventListener('change', filterMappings);
    elements.filterTags.addEventListener('input', filterMappings);
    elements.saveButton.addEventListener('click', saveMapping);
    elements.cancelButton.addEventListener('click', cancelEdit);
    elements.deleteButton.addEventListener('click', deleteMapping);
    elements.duplicateButton.addEventListener('click', duplicateMapping);
    elements.addRequestHeader.addEventListener('click', () => addHeaderField('request', '', 'equalTo', ''));
    elements.addResponseHeader.addEventListener('click', () => addHeaderField('response', '', 'equalTo', ''));
    elements.addProxyHeader.addEventListener('click', () => addHeaderField('proxy', '', 'equalTo', ''));
    elements.addBodyPattern.addEventListener('click', () => addBodyPattern('equalToJson', ''));
    
    // Инициализируем JSON редакторы
    jsonEditors = {};
    initJSONEditors();

    // Загружаем маппинги при загрузке страницы
    loadMappings();
}

// Загрузка маппингов с сервера
async function loadMappings() {
    const serverUrl = elements.serverUrl.value.trim();
    const authToken = elements.authToken.value.trim();
    
    if (!serverUrl) {
        showToast('Укажите URL сервера', true);
        return;
    }
    
    // Сохраняем настройки
    localStorage.setItem('wiremock_server_url', serverUrl);
    localStorage.setItem('wiremock_auth_token', authToken);
    
    elements.loading.style.display = 'block';
    elements.mappingsList.innerHTML = '';
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = authToken;
        }
        
        // Создаем прокси URL
        const proxyUrl = createProxyUrl(serverUrl, '/__admin/mappings');
        if (!proxyUrl) {
            throw new Error('Неверный формат URL сервера');
        }
        
        console.log('Отправка запроса через прокси:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        const data = await response.json();
        mappings = data.mappings || [];
        
        showToast(`Загружено ${mappings.length} маппингов`);
        renderMappings(mappings);
    } catch (error) {
        console.error('Error loading mappings:', error);
        showToast(`Ошибка загрузки: ${error.message}`, true);
    } finally {
        elements.loading.style.display = 'none';
    }
}

// Классификация маппингов по типу
function classifyMapping(mapping) {
    // Проверка на проксирующий маппинг
    if (mapping.response && mapping.response.proxyBaseUrl) {
        return 'proxy';
    }
    
    // Проверка на наличие тегов в метаданных
    if (mapping.metadata && mapping.metadata.tags && mapping.metadata.tags.length > 0) {
        // Возвращаем тип с префиксом "tag:" и первым тегом
        return `tag:${mapping.metadata.tags[0]}`;
    }
    
    // Для всех остальных маппингов
    return 'other';
}

// Проверка наличия тега в маппинге
function hasTag(mapping, tagName) {
    if (!mapping.metadata || !mapping.metadata.tags || !mapping.metadata.tags.length) {
        return false;
    }
    
    return mapping.metadata.tags.includes(tagName);
}

// Фильтрация маппингов
function filterMappings() {
    const filterText = elements.filterText.value.toLowerCase();
    const filterType = elements.filterType.value;
    const filterTagText = elements.filterTags.value.toLowerCase();
    
    const filtered = mappings.filter(mapping => {
        const url = mapping.request.url || 
                    mapping.request.urlPattern || 
                    mapping.request.urlPath || 
                    mapping.request.urlPathPattern || '';
        const method = mapping.request.method || 'ANY';
        const id = mapping.id || mapping.uuid || '';
        const name = mapping.name || '';
        
        // Текстовый фильтр
        const textMatch = !filterText || 
                          url.toLowerCase().includes(filterText) || 
                          method.toLowerCase().includes(filterText) ||
                          id.toLowerCase().includes(filterText) ||
                          name.toLowerCase().includes(filterText);
        
        // Фильтр по типу
        let typeMatch = true;
        
        if (filterType !== 'all') {
            if (filterType === 'proxy') {
                // Проверка на прокси
                typeMatch = mapping.response && mapping.response.proxyBaseUrl;
            } else if (filterType.startsWith('tag:')) {
                // Проверка на конкретный тег
                const tag = filterType.substring(4); // Убираем префикс "tag:"
                if (tag === 'other') {
                    // Проверка на наличие любых тегов, кроме "test"
                    typeMatch = mapping.metadata && 
                               mapping.metadata.tags && 
                               mapping.metadata.tags.length > 0 &&
                               !mapping.metadata.tags.includes('test');
                } else {
                    // Проверка на наличие конкретного тега
                    typeMatch = hasTag(mapping, tag);
                }
            }
        }
        
        // Фильтр по дополнительному тегу
        let tagMatch = !filterTagText;
        
        if (filterTagText && mapping.metadata && mapping.metadata.tags) {
            tagMatch = mapping.metadata.tags.some(tag => 
                tag.toLowerCase().includes(filterTagText));
        }
        
        return textMatch && typeMatch && tagMatch;
    });
    
    renderMappings(filtered);
}

// Отрисовка списка маппингов
function renderMappings(mappingsToRender) {
    elements.mappingsList.innerHTML = '';
    
    if (mappingsToRender.length === 0) {
        elements.mappingsList.innerHTML = '<div class="loading">Нет маппингов для отображения</div>';
        return;
    }
    
    mappingsToRender.forEach(mapping => {
        const method = mapping.request.method || 'ANY';
        const methodClass = method.toLowerCase().replace(/[^a-z]/g, '');
        const status = mapping.response.status;
        const statusClass = status ? `status-${Math.floor(status/100)}xx` : '';
        const urlDisplay = mapping.request.url || 
                           mapping.request.urlPattern || 
                           mapping.request.urlPath || 
                           mapping.request.urlPathPattern || 'N/A';
        const urlType = mapping.request.url ? 'Exact' : 
                      (mapping.request.urlPattern ? 'Pattern' : 'Path');
        
        // Проверяем, является ли маппинг прокси
        const isProxy = mapping.response && mapping.response.proxyBaseUrl;
        const proxyUrl = isProxy ? mapping.response.proxyBaseUrl : '';
        
        const mappingDiv = document.createElement('div');
        mappingDiv.className = 'mapping';
        mappingDiv.dataset.id = mapping.id;
        mappingDiv.dataset.type = classifyMapping(mapping);
        
        mappingDiv.innerHTML = `
            <div class="summary">
                <span style="flex-grow:1">
                    <span class="method method-${methodClass}">${method}</span> 
                    <span class="url-type">${urlType}</span> ${urlDisplay}
                    ${isProxy ? `<span class="proxy-label">Прокси ➜ ${proxyUrl}</span>` : ''}
                    <br>
                    <small>
                        ID: ${mapping.id} | 
                        Имя: ${mapping.name || 'N/A'} |
                        Статус: <span class="status ${statusClass}">${status}</span>
                    </small>
                </span>
                <button class="btn btn-small btn-primary edit-btn">Редактировать</button>
            </div>
            <div class="details"></div>
        `;
        
        elements.mappingsList.appendChild(mappingDiv);
        
        // Добавляем обработчики событий для отображения деталей и редактирования
        const summaryEl = mappingDiv.querySelector('.summary');
        const detailsEl = mappingDiv.querySelector('.details');
        const editBtn = mappingDiv.querySelector('.edit-btn');
        
        summaryEl.addEventListener('click', (e) => {
            if (e.target !== editBtn) {
                // Если детали уже отображаются, скрываем их
                if (detailsEl.style.display === 'block') {
                    detailsEl.style.display = 'none';
                    return;
                }
                
                // Иначе загружаем и отображаем детали
                renderMappingDetails(mapping, detailsEl);
                detailsEl.style.display = 'block';
            }
        });
        
        editBtn.addEventListener('click', () => {
            openEditor(mapping);
        });
    });
}

// Отображение деталей маппинга
function renderMappingDetails(mapping, container) {
    // Общая информация
    let html = `
        <h3>Запрос</h3>
        <ul>
            <li><span class="param-title">Метод:</span> ${mapping.request.method || 'ANY'}</li>
            <li><span class="param-title">URL:</span> ${
                mapping.request.url || 
                mapping.request.urlPattern || 
                mapping.request.urlPath || 
                mapping.request.urlPathPattern || 'N/A'
            }</li>
    `;
    
    // Заголовки запроса
    if (mapping.request.headers) {
        html += `<li><span class="param-title">Headers:</span><ul>`;
        for (const [key, value] of Object.entries(mapping.request.headers)) {
            if (typeof value === 'object') {
                const operator = Object.keys(value)[0];
                const operatorValue = value[operator];
                
                // Русские названия операторов для лучшего понимания
                const operatorNames = {
                    'equalTo': 'равно',
                    'contains': 'содержит',
                    'matches': 'соответствует regex',
                    'doesNotMatch': 'не соответствует regex',
                    'absent': 'отсутствует'
                };
                
                const operatorName = operatorNames[operator] || operator;
                
                if (operator === 'absent') {
                    html += `<li>${key}: <span class="tag">${operatorName}</span></li>`;
                } else {
                    html += `<li>${key}: <span class="tag">${operatorName}</span> ${JSON.stringify(operatorValue)}</li>`;
                }
            } else {
                // Обратная совместимость
                html += `<li>${key}: ${JSON.stringify(value)}</li>`;
            }
        }
        html += `</ul></li>`;
    }
    
    // Шаблоны тела запроса
    if (mapping.request.bodyPatterns) {
        html += `<li><span class="param-title">Body Patterns:</span><ul>`;
        mapping.request.bodyPatterns.forEach(pattern => {
            const patternType = Object.keys(pattern)[0];
            const patternValue = pattern[patternType];
            
            // Русские названия операторов для шаблонов тела
            const bodyPatternNames = {
                'equalToJson': 'Равно JSON',
                'matchesJsonPath': 'JSONPath',
                'equalToXml': 'Равно XML',
                'matchesXPath': 'XPath',
                'equalTo': 'Равно (текст)',
                'contains': 'Содержит',
                'matches': 'Regex',
                'doesNotMatch': 'Не соотв. Regex'
            };
            
            const patternName = bodyPatternNames[patternType] || patternType;
            
            html += `<li><span class="tag">${patternName}</span>: `;
            if (typeof patternValue === 'object') {
                html += `<pre>${JSON.stringify(patternValue, null, 2)}</pre>`;
            } else {
                html += `<code>${patternValue}</code>`;
            }
            html += `</li>`;
        });
        html += `</ul></li>`;
    }
    
    // Информация об ответе
    html += `
        </ul>
        <h3>Ответ</h3>
        <ul>
            <li><span class="param-title">Статус:</span> ${mapping.response.status || 'N/A'}</li>
    `;
    
    // Проверяем, является ли это прокси-маппингом
    if (mapping.response.proxyBaseUrl) {
        html += `<li><span class="param-title">Тип:</span> <span class="tag">Прокси</span></li>`;
        html += `<li><span class="param-title">Proxy URL:</span> ${mapping.response.proxyBaseUrl}</li>`;
        
        // Дополнительные заголовки прокси
        if (mapping.response.additionalProxyRequestHeaders) {
            html += `<li><span class="param-title">Доп. заголовки прокси:</span><ul>`;
            for (const [key, value] of Object.entries(mapping.response.additionalProxyRequestHeaders)) {
                html += `<li>${key}: ${value}</li>`;
            }
            html += `</ul></li>`;
        }
    }
    
    // Тело ответа
    if (mapping.response.body) {
        html += `<li><span class="param-title">Body:</span> <pre>${mapping.response.body}</pre></li>`;
    } else if (mapping.response.jsonBody) {
        html += `<li><span class="param-title">JSON Body:</span> <pre>${JSON.stringify(mapping.response.jsonBody, null, 2)}</pre></li>`;
    }
    
    // Задержка
    if (mapping.response.fixedDelayMilliseconds) {
        html += `<li><span class="param-title">Задержка:</span> ${mapping.response.fixedDelayMilliseconds} мс</li>`;
    }
    
    // Метаданные
    html += `</ul>`;
    
    if (mapping.metadata || mapping.priority !== undefined || mapping.persistent !== undefined) {
        html += `<h3>Метаданные</h3><ul>`;
        
        if (mapping.name) {
            html += `<li><span class="param-title">Название:</span> ${mapping.name}</li>`;
        }
        
        if (mapping.priority !== undefined) {
            html += `<li><span class="param-title">Приоритет:</span> ${mapping.priority}</li>`;
        }
        
        if (mapping.persistent !== undefined) {
            html += `<li><span class="param-title">Постоянный:</span> ${mapping.persistent ? 'Да' : 'Нет'}</li>`;
        }
        
        // Отображение тегов
        if (mapping.metadata && mapping.metadata.tags && mapping.metadata.tags.length > 0) {
            html += `<li><span class="param-title">Теги:</span> `;
            mapping.metadata.tags.forEach(tag => {
                html += `<span class="tag">${tag}</span> `;
            });
            html += `</li>`;
        }
        
        // Отображение других метаданных
        if (mapping.metadata) {
            const otherMetadata = { ...mapping.metadata };
            // Исключаем tags, так как они уже отображены
            delete otherMetadata.tags;
            
            if (Object.keys(otherMetadata).length > 0) {
                html += `<li><span class="param-title">Другие метаданные:</span> <pre>${JSON.stringify(otherMetadata, null, 2)}</pre></li>`;
            }
        }
        
        html += `</ul>`;
    }
    
    // Кнопка редактирования
    html += `<button class="btn btn-primary edit-detail-btn">Редактировать</button>`;
    
    container.innerHTML = html;
    
    // Добавляем обработчик для кнопки редактирования
    const editBtn = container.querySelector('.edit-detail-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            openEditor(mapping);
        });
    }
}

// Открытие редактора для маппинга
function openEditor(mapping) {
    currentMapping = JSON.parse(JSON.stringify(mapping)); // Глубокое копирование
    
    // Заполняем поля формы
    updateEditorFields();
    
    // Показываем редактор
    elements.editorContainer.classList.remove('hidden');
    window.scrollTo(0, 0);
}

// Обновление полей редактора из текущего маппинга
function updateEditorFields() {
    // Основные поля
    elements.method.value = currentMapping.request.method || 'ANY';
    elements.url.value = currentMapping.request.url || 
                         currentMapping.request.urlPattern || 
                         currentMapping.request.urlPath || 
                         currentMapping.request.urlPathPattern || '';
    
    elements.status.value = currentMapping.response.status || '';
    elements.delay.value = currentMapping.response.fixedDelayMilliseconds || '';
    elements.name.value = currentMapping.name || '';
    elements.priority.value = currentMapping.priority || '';
    elements.persistent.checked = currentMapping.persistent || false;
    
    // Заголовки запроса
    elements.requestHeaders.innerHTML = '';
    if (currentMapping.request.headers) {
        for (const [key, value] of Object.entries(currentMapping.request.headers)) {
            if (typeof value === 'object') {
                // Определяем оператор сравнения и значение
                const operator = Object.keys(value)[0];
                const operatorValue = value[operator];
                
                if (operator === 'absent') {
                    // Для оператора absent не нужно значение
                    addHeaderField('request', key, 'absent', '');
                } else {
                    // Для других операторов добавляем все три поля
                    addHeaderField('request', key, operator, operatorValue);
                }
            } else {
                // Обратная совместимость для старого формата (просто значение)
                addHeaderField('request', key, 'equalTo', value);
            }
        }
    }
    
    // Заголовки ответа
    elements.responseHeaders.innerHTML = '';
    if (currentMapping.response.headers) {
        for (const [key, value] of Object.entries(currentMapping.response.headers)) {
            addHeaderField('response', key, 'equalTo', value);
        }
    }
    
    // Заголовки прокси (если есть)
    if (elements.proxyHeaders) {
        elements.proxyHeaders.innerHTML = '';
        
        if (currentMapping.response.additionalProxyRequestHeaders) {
            for (const [key, value] of Object.entries(currentMapping.response.additionalProxyRequestHeaders)) {
                addHeaderField('proxy', key, 'equalTo', value);
            }
        }
    }
    
    // URL прокси (если есть)
    if (elements.proxyBaseUrl) {
        elements.proxyBaseUrl.value = currentMapping.response.proxyBaseUrl || '';
    }
    
    // Очищаем и заполняем поля шаблонов тела
    elements.bodyPatterns.innerHTML = '';
    if (currentMapping.request.bodyPatterns && Array.isArray(currentMapping.request.bodyPatterns)) {
        currentMapping.request.bodyPatterns.forEach(pattern => {
            const operator = Object.keys(pattern)[0];
            const value = pattern[operator];
            let valueStr = '';
            
            if (typeof value === 'object') {
                valueStr = JSON.stringify(value);
            } else {
                valueStr = value;
            }
            
            addBodyPattern(operator, valueStr);
        });
    }
    
    // Обновляем содержимое JSON редакторов
    updateEditorsContent();
    
    // Обновляем видимость элементов в зависимости от типа маппинга
    updateTabsVisibility();
}

// Функция для обновления видимости вкладок в зависимости от типа маппинга
function updateTabsVisibility() {
    const isProxy = currentMapping.response && currentMapping.response.proxyBaseUrl;
    
    // Включаем/отключаем поля ввода в зависимости от типа маппинга
    if (elements.responseBody) {
        elements.responseBody.disabled = isProxy;
        if (isProxy) {
            elements.responseBody.value = '[Недоступно для маппингов типа прокси]';
        }
    }
    
    // Показываем/скрываем вкладку прокси
    const proxyTab = document.querySelector('[data-tab="proxy"]');
    if (proxyTab) {
        if (isProxy) {
            proxyTab.style.display = 'block';
        } else {
            proxyTab.style.display = 'none';
        }
    }
}

// Добавление поля для заголовка
function addHeaderField(type, key = '', operator = 'equalTo', value = '') {
    let container;
    if (type === 'request') {
        container = elements.requestHeaders;
    } else if (type === 'response') {
        container = elements.responseHeaders;
    } else if (type === 'proxy') {
        container = elements.proxyHeaders;
    } else {
        console.error('Неизвестный тип заголовка:', type);
        return;
    }
    
    if (!container) {
        console.error(`Контейнер для заголовков типа ${type} не найден`);
        return;
    }
    
    if (type === 'request') {
        // Для заголовков запроса используем три поля
        const headerDiv = document.createElement('div');
        headerDiv.className = 'key-value-operator-pair';
        
        headerDiv.innerHTML = `
            <input type="text" class="header-key" placeholder="Имя" value="${key}">
            <select class="header-operator">
                <option value="equalTo" ${operator === 'equalTo' ? 'selected' : ''}>равно</option>
                <option value="contains" ${operator === 'contains' ? 'selected' : ''}>содержит</option>
                <option value="matches" ${operator === 'matches' ? 'selected' : ''}>regex</option>
                <option value="doesNotMatch" ${operator === 'doesNotMatch' ? 'selected' : ''}>не regex</option>
                <option value="absent" ${operator === 'absent' ? 'selected' : ''}>отсутствует</option>
            </select>
            <input type="text" class="header-value" placeholder="Значение" value="${value}" ${operator === 'absent' ? 'disabled' : ''}>
            <button class="remove-header">×</button>
        `;
        
        container.appendChild(headerDiv);
        
        // Обработчик для оператора absent (отключаем поле значения)
        const operatorSelect = headerDiv.querySelector('.header-operator');
        const valueInput = headerDiv.querySelector('.header-value');
        
        operatorSelect.addEventListener('change', () => {
            if (operatorSelect.value === 'absent') {
                valueInput.disabled = true;
                valueInput.value = '';
            } else {
                valueInput.disabled = false;
            }
        });
        
        // Обработчик для удаления заголовка
        headerDiv.querySelector('.remove-header').addEventListener('click', () => {
            container.removeChild(headerDiv);
        });
    } else {
        // Для заголовков ответа и прокси используем старую структуру с двумя полями
    const headerDiv = document.createElement('div');
    headerDiv.className = 'key-value-pair';
    
    headerDiv.innerHTML = `
        <input type="text" class="header-key" placeholder="Имя" value="${key}">
        <input type="text" class="header-value" placeholder="Значение" value="${value}">
        <button class="remove-header">×</button>
    `;
    
    container.appendChild(headerDiv);
    
    // Обработчик для удаления заголовка
    headerDiv.querySelector('.remove-header').addEventListener('click', () => {
        container.removeChild(headerDiv);
    });
    }
}

// Обновление объекта маппинга из полей формы
function updateMappingFromForm() {
    try {
        // Проверяем, есть ли изменения в JSON редакторе
        const rawJson = jsonEditors.raw.get();
        if (JSON.stringify(rawJson) !== JSON.stringify(currentMapping)) {
            currentMapping = rawJson;
            return;
        }
    } catch (e) {
        console.error("Ошибка получения данных из raw JSON редактора:", e);
    }
    
    // Обновляем из полей формы
    
    // Метод и URL
    const method = elements.method.value;
    const url = elements.url.value;
    
    if (method !== 'ANY') {
        currentMapping.request.method = method;
    } else {
        delete currentMapping.request.method;
    }
    
    // Определяем, какой тип URL использовать
    if (url.includes('*') || url.includes('(') || url.includes('[')) {
        // Вероятно, это шаблон
        delete currentMapping.request.url;
        delete currentMapping.request.urlPath;
        currentMapping.request.urlPattern = url;
    } else if (url.startsWith('/')) {
        // Вероятно, точный путь
        delete currentMapping.request.urlPattern;
        currentMapping.request.url = url;
    }
    
    // Заголовки запроса
    currentMapping.request.headers = {};
    elements.requestHeaders.querySelectorAll('.key-value-operator-pair, .key-value-pair').forEach(pair => {
        const key = pair.querySelector('.header-key').value;
        
        if (key) {
            if (pair.classList.contains('key-value-operator-pair')) {
                // Новый формат с тремя полями
                const operator = pair.querySelector('.header-operator').value;
        const value = pair.querySelector('.header-value').value;
        
                if (operator === 'absent') {
                    currentMapping.request.headers[key] = { "absent": true };
                } else if (operator && (operator !== 'absent' || value)) {
                    currentMapping.request.headers[key] = { [operator]: value };
                }
            } else {
                // Старый формат с двумя полями (обратная совместимость)
                const value = pair.querySelector('.header-value').value;
                
                if (value) {
            try {
                // Проверяем, является ли значение уже объектом с оператором сравнения
                const parsedValue = JSON.parse(value);
                if (typeof parsedValue === 'object' && 
                    (parsedValue.equalTo || parsedValue.contains || parsedValue.matches || 
                     parsedValue.doesNotMatch || parsedValue.equalToJson || 
                     parsedValue.matchesJsonPath || parsedValue.absent)) {
                    // Если это уже правильный объект с оператором сравнения, используем его
                    currentMapping.request.headers[key] = parsedValue;
                } else {
                    // Иначе создаем объект с оператором equalTo
                    currentMapping.request.headers[key] = { "equalTo": parsedValue };
                }
            } catch (e) {
                // Если значение не JSON, используем его как строку с оператором equalTo
                currentMapping.request.headers[key] = { "equalTo": value };
                    }
                }
            }
        }
    });
    
    if (Object.keys(currentMapping.request.headers).length === 0) {
        delete currentMapping.request.headers;
    }
    
    // Обрабатываем данные из формы шаблона тела
    currentMapping.request.bodyPatterns = [];
    elements.bodyPatterns.querySelectorAll('.key-value-operator-pair').forEach(pair => {
        const operator = pair.querySelector('.body-pattern-operator').value;
        const value = pair.querySelector('.body-pattern-value').value;
        
        if (value.trim()) {
            let patternObj = {};
            
            // Обработка разных типов операторов
            if (operator === 'equalToJson' || operator === 'equalToXml') {
                try {
                    // Пытаемся распарсить JSON
                    patternObj[operator] = JSON.parse(value);
                } catch (e) {
                    // Если не удалось распарсить, используем как строку
                    patternObj[operator] = value;
                }
            } else {
                patternObj[operator] = value;
            }
            
            currentMapping.request.bodyPatterns.push(patternObj);
        }
    });
    
    if (currentMapping.request.bodyPatterns.length === 0) {
        delete currentMapping.request.bodyPatterns;
    }
    
    // Статус ответа
    const status = elements.status.value;
    if (status) {
        currentMapping.response.status = parseInt(status, 10);
    } else {
        delete currentMapping.response.status;
    }
    
    // Заголовки ответа
    currentMapping.response.headers = {};
    elements.responseHeaders.querySelectorAll('.key-value-pair').forEach(pair => {
        const key = pair.querySelector('.header-key').value;
        const value = pair.querySelector('.header-value').value;
        
        if (key && value) {
            currentMapping.response.headers[key] = value;
        }
    });
    
    if (Object.keys(currentMapping.response.headers).length === 0) {
        delete currentMapping.response.headers;
    }
    
    // Обработка полей прокси
    if (elements.proxyBaseUrl) {
        const proxyBaseUrl = elements.proxyBaseUrl.value.trim();
        if (proxyBaseUrl) {
            currentMapping.response.proxyBaseUrl = proxyBaseUrl;
            
            // Заголовки прокси-запроса
            if (elements.proxyHeaders) {
                currentMapping.response.additionalProxyRequestHeaders = {};
                elements.proxyHeaders.querySelectorAll('.key-value-pair').forEach(pair => {
                    const key = pair.querySelector('.header-key').value;
                    const value = pair.querySelector('.header-value').value;
                    
                    if (key && value) {
                        currentMapping.response.additionalProxyRequestHeaders[key] = value;
                    }
                });
                
                if (Object.keys(currentMapping.response.additionalProxyRequestHeaders).length === 0) {
                    delete currentMapping.response.additionalProxyRequestHeaders;
                }
            }
            
            // Если это прокси-маппинг, удаляем тело ответа
            delete currentMapping.response.body;
            delete currentMapping.response.jsonBody;
        } else {
            // Если URL прокси пустой, удаляем поля прокси
            delete currentMapping.response.proxyBaseUrl;
            delete currentMapping.response.additionalProxyRequestHeaders;
        }
    }
    
    // Тело ответа (только если не прокси)
    if (!currentMapping.response.proxyBaseUrl) {
        try {
            const responseBody = jsonEditors.responseBody.get();
            if (responseBody && typeof responseBody === 'object' && Object.keys(responseBody).length > 0) {
                delete currentMapping.response.body;
                currentMapping.response.jsonBody = responseBody;
            } else {
                try {
                    // Проверяем, есть ли текст (для случаев, когда тело не является JSON)
                    const responseText = jsonEditors.responseBody.getText();
                    if (responseText && responseText.trim()) {
                        delete currentMapping.response.jsonBody;
                        currentMapping.response.body = responseText;
                    } else {
                        delete currentMapping.response.body;
                        delete currentMapping.response.jsonBody;
                    }
                } catch (e) {
                    delete currentMapping.response.body;
                    delete currentMapping.response.jsonBody;
                }
            }
        } catch (e) {
            console.error("Ошибка обработки тела ответа:", e);
            delete currentMapping.response.body;
            delete currentMapping.response.jsonBody;
        }
    }
    
    // Задержка
    const delay = elements.delay.value;
    if (delay) {
        currentMapping.response.fixedDelayMilliseconds = parseInt(delay, 10);
    } else {
        delete currentMapping.response.fixedDelayMilliseconds;
    }
    
    // Метаданные
    const name = elements.name.value;
    const priority = elements.priority.value;
    const persistent = elements.persistent.checked;
    
    if (name) {
        currentMapping.name = name;
    } else {
        delete currentMapping.name;
    }
    
    if (priority) {
        currentMapping.priority = parseInt(priority, 10);
    } else {
        delete currentMapping.priority;
    }
    
    currentMapping.persistent = persistent;
}

// Сохранение маппинга
async function saveMapping() {
    // Обновляем объект маппинга из полей формы
    updateMappingFromForm();
    
    // Валидация маппинга
    if (!validateMapping()) {
        return;
    }
    
    const serverUrl = elements.serverUrl.value.trim();
    const authToken = elements.authToken.value.trim();
    
    if (!serverUrl) {
        showToast('Укажите URL сервера', true);
        return;
    }
    
    try {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (authToken) {
            headers['Authorization'] = authToken;
        }
        
        // Создаем прокси URL
        const proxyUrl = createProxyUrl(serverUrl, `/__admin/mappings/${currentMapping.id}`);
        if (!proxyUrl) {
            throw new Error('Неверный формат URL сервера');
        }
        
        console.log('Отправка запроса через прокси:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(currentMapping)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        showToast('Маппинг успешно сохранен');
        
        // Обновляем маппинг в списке
        const index = mappings.findIndex(m => m.id === currentMapping.id);
        if (index !== -1) {
            mappings[index] = JSON.parse(JSON.stringify(currentMapping));
        }
        
        // Обновляем отображение
        filterMappings();
        elements.editorContainer.classList.add('hidden');
        currentMapping = null;
    } catch (error) {
        console.error('Error saving mapping:', error);
        showToast(`Ошибка сохранения: ${error.message}`, true);
    }
}

// Функция для валидации маппинга перед отправкой
function validateMapping() {
    // Проверка наличия обязательных полей
    if (!currentMapping.id) {
        showToast('Ошибка: Отсутствует ID маппинга', true);
        return false;
    }
    
    if (!currentMapping.request) {
        showToast('Ошибка: Отсутствует секция request', true);
        return false;
    }
    
    if (!currentMapping.response) {
        showToast('Ошибка: Отсутствует секция response', true);
        return false;
    }
    
    // Проверка URL
    const hasUrl = currentMapping.request.url || 
                  currentMapping.request.urlPattern || 
                  currentMapping.request.urlPath || 
                  currentMapping.request.urlPathPattern;
    
    if (!hasUrl) {
        showToast('Ошибка: Не указан URL в запросе', true);
        return false;
    }
    
    // Проверка статуса ответа
    if (!currentMapping.response.status) {
        showToast('Предупреждение: Не указан статус ответа, установлен по умолчанию 200', false);
        currentMapping.response.status = 200;
    }
    
    // Проверка тела ответа на корректный формат JSON (если не прокси)
    if (!currentMapping.response.proxyBaseUrl && currentMapping.response.jsonBody) {
        try {
            // Если jsonBody уже объект, преобразуем его в строку и обратно, чтобы убедиться в корректности
            if (typeof currentMapping.response.jsonBody === 'string') {
                currentMapping.response.jsonBody = JSON.parse(currentMapping.response.jsonBody);
            }
        } catch (e) {
            showToast('Ошибка: Некорректный формат JSON в теле ответа', true);
            return false;
        }
    }
    
    // Проверка одновременного использования body и jsonBody (если не прокси)
    if (!currentMapping.response.proxyBaseUrl && 
        currentMapping.response.body && 
        currentMapping.response.jsonBody) {
        showToast('Ошибка: Нельзя одновременно использовать body и jsonBody', true);
        return false;
    }
    
    // Проверка URL прокси (если это прокси-маппинг)
    if (currentMapping.response.proxyBaseUrl) {
        try {
            new URL(currentMapping.response.proxyBaseUrl);
        } catch (e) {
            showToast('Ошибка: Некорректный URL прокси', true);
            return false;
        }
    }
    
    // Очистка маппинга от пустых и дублирующих полей
    cleanupMapping(currentMapping);
    
    return true;
}

// Функция для очистки маппинга от пустых и ненужных полей
function cleanupMapping(mapping) {
    // Очистка URL полей - убеждаемся, что используется только один тип URL
    const url = mapping.request.url || 
                mapping.request.urlPattern || 
                mapping.request.urlPath || 
                mapping.request.urlPathPattern;
    
    if (url) {
        // Удаляем все поля URL
        delete mapping.request.url;
        delete mapping.request.urlPattern;
        delete mapping.request.urlPath;
        delete mapping.request.urlPathPattern;
        
        // Добавляем только одно нужное поле
        if (url.includes('*') || url.includes('(') || url.includes('[') || url.includes('?') || url.includes('+')) {
            // Если путь содержит спецсимволы регулярных выражений
            if (url.startsWith('/') && !url.includes('?')) {
                mapping.request.urlPathPattern = url;
            } else {
                mapping.request.urlPattern = url;
            }
        } else {
            // Точное совпадение
            if (url.startsWith('/') && !url.includes('?')) {
                mapping.request.urlPath = url;
            } else {
                mapping.request.url = url;
            }
        }
    }
    
    // Проверка и исправление формата ID
    if (mapping.id) {
        // Проверяем, соответствует ли ID формату UUID
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(mapping.id)) {
            console.warn('ID не соответствует формату UUID:', mapping.id);
        }
    }
    
    // Проверка и фиксация проблем с методом
    if (mapping.request.method) {
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'ANY'];
        mapping.request.method = mapping.request.method.toUpperCase();
        
        if (!validMethods.includes(mapping.request.method)) {
            console.warn('Неизвестный HTTP метод:', mapping.request.method);
            mapping.request.method = 'ANY';
        }
    }
    
    // Исправление проблем с bodyPatterns
    if (mapping.request.bodyPatterns) {
        // Убедимся, что bodyPatterns это массив
        if (!Array.isArray(mapping.request.bodyPatterns)) {
            mapping.request.bodyPatterns = [mapping.request.bodyPatterns];
        }
        
        // Проверка каждого паттерна
        mapping.request.bodyPatterns = mapping.request.bodyPatterns.filter(pattern => {
            if (typeof pattern === 'object' && Object.keys(pattern).length > 0) {
                return true; // Оставляем валидные паттерны
            }
            return false; // Удаляем пустые паттерны
        });
        
        // Если массив пустой, удаляем его
        if (mapping.request.bodyPatterns.length === 0) {
            delete mapping.request.bodyPatterns;
        }
    }
    
    // Очистка пустых заголовков
    if (mapping.request.headers && Object.keys(mapping.request.headers).length === 0) {
        delete mapping.request.headers;
    }
    
    if (mapping.response.headers && Object.keys(mapping.response.headers).length === 0) {
        delete mapping.response.headers;
    }
    
    // Очистка дополнительных заголовков прокси
    if (mapping.response.additionalProxyRequestHeaders && 
        Object.keys(mapping.response.additionalProxyRequestHeaders).length === 0) {
        delete mapping.response.additionalProxyRequestHeaders;
    }
    
    // Проверка url прокси
    if (mapping.response.proxyBaseUrl && mapping.response.proxyBaseUrl.trim() === '') {
        delete mapping.response.proxyBaseUrl;
        delete mapping.response.additionalProxyRequestHeaders;
    }
    
    // Очистка пустых полей в ответе
    if (mapping.response.body === '') {
        delete mapping.response.body;
    }
    
    if (mapping.response.jsonBody && 
        (typeof mapping.response.jsonBody === 'object' && 
         Object.keys(mapping.response.jsonBody).length === 0)) {
        delete mapping.response.jsonBody;
    }
    
    // Удаление пустых полей метаданных
    if (mapping.metadata && Object.keys(mapping.metadata).length === 0) {
        delete mapping.metadata;
    }
    
    // Проверка целочисленных полей
    if (mapping.priority !== undefined && mapping.priority !== null) {
        mapping.priority = parseInt(mapping.priority, 10);
        
        // Если не удалось преобразовать в число, удаляем поле
        if (isNaN(mapping.priority)) {
            delete mapping.priority;
        }
    }
    
    if (mapping.response.status !== undefined && mapping.response.status !== null) {
        mapping.response.status = parseInt(mapping.response.status, 10);
        
        // Если не удалось преобразовать в число или статус некорректный, устанавливаем 200
        if (isNaN(mapping.response.status) || mapping.response.status < 100 || mapping.response.status > 599) {
            mapping.response.status = 200;
        }
    }
    
    // Если маппинг является прокси, удаляем тело ответа
    if (mapping.response.proxyBaseUrl) {
        delete mapping.response.body;
        delete mapping.response.jsonBody;
    }
    
    // Удаление дублирующего поля uuid (если оно есть и совпадает с id)
    if (mapping.uuid && mapping.id && mapping.uuid === mapping.id) {
        delete mapping.uuid;
    }
    
    // Очистка других пустых полей
    for (const key in mapping) {
        if (mapping[key] === null || 
            mapping[key] === undefined || 
            (typeof mapping[key] === 'string' && mapping[key].trim() === '')) {
            delete mapping[key];
        }
    }
    
    return mapping;
}

// Отмена редактирования
function cancelEdit() {
    elements.editorContainer.classList.add('hidden');
    currentMapping = null;
}

// Удаление маппинга
async function deleteMapping() {
    if (!currentMapping || !currentMapping.id) {
        showToast('Нет выбранного маппинга', true);
        return;
    }
    
    if (!confirm(`Вы уверены, что хотите удалить маппинг "${currentMapping.name || currentMapping.id}"?`)) {
        return;
    }
    
    const serverUrl = elements.serverUrl.value.trim();
    const authToken = elements.authToken.value.trim();
    
    if (!serverUrl) {
        showToast('Укажите URL сервера', true);
        return;
    }
    
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = authToken;
        }
        
        // Создаем прокси URL
        const proxyUrl = createProxyUrl(serverUrl, `/__admin/mappings/${currentMapping.id}`);
        if (!proxyUrl) {
            throw new Error('Неверный формат URL сервера');
        }
        
        console.log('Отправка запроса через прокси:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
            method: 'DELETE',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        showToast('Маппинг успешно удален');
        
        // Удаляем маппинг из списка
        mappings = mappings.filter(m => m.id !== currentMapping.id);
        
        // Обновляем отображение
        filterMappings();
        elements.editorContainer.classList.add('hidden');
        currentMapping = null;
    } catch (error) {
        console.error('Error deleting mapping:', error);
        showToast(`Ошибка удаления: ${error.message}`, true);
    }
}

// Отображение уведомления
function showToast(message, isError = false) {
    const toast = elements.toast;
    toast.textContent = message;
    toast.className = isError ? 'toast error' : 'toast';
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Инициализация JSON редакторов
function initJSONEditors() {
    // Создаем редактор для raw-json
    const rawContainer = document.getElementById('edit-raw-json-editor');
    const rawOptions = {...jsonEditorOptions, editorId: 'raw'};
    jsonEditors.raw = new JSONEditor(rawContainer, rawOptions, {});
    
    // Создаем редактор для response-body
    const responseBodyContainer = document.getElementById('edit-response-body-editor');
    const responseBodyOptions = {...jsonEditorOptions, editorId: 'responseBody'};
    jsonEditors.responseBody = new JSONEditor(responseBodyContainer, responseBodyOptions, {});
    
    // Настраиваем обработчики для кнопок разворачивания
    document.querySelectorAll('.btn-expand').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            expandEditor(targetId);
        });
    });
    
    // Настройка вкладок
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            const previousTabId = document.querySelector('.tab-button.active').getAttribute('data-tab');
            
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            const tabId = tab.getAttribute('data-tab');
            tab.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Обновление состояния редактора JSON, если выбрана вкладка JSON
            if (tabId === 'raw' && currentMapping) {
                // Обновляем текущий маппинг из полей формы
                updateMappingFromForm();
                // Обновляем raw JSON редактор
                jsonEditors.raw.set(currentMapping);
            }
            // Обновление формы, если переключились с вкладки raw
            else if (previousTabId === 'raw' && currentMapping) {
                try {
                    // Получаем данные из JSON редактора
                    const updatedMapping = jsonEditors.raw.get();
                    // Обновляем текущий маппинг
                    Object.assign(currentMapping, updatedMapping);
                    // Обновляем поля формы
                    updateEditorFields();
                    // Обновляем другие редакторы
                    updateEditorsContent();
                } catch (e) {
                    console.error('Ошибка при обновлении из JSON редактора:', e);
                }
            }
        });
    });
    
    // Обработчик закрытия полноэкранного режима
    elements.fullscreenClose.addEventListener('click', closeFullscreen);
    
    // Обработчик клавиши ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentFullscreenEditor) {
            closeFullscreen();
        }
    });
}

// Обновление содержимого редакторов из полей формы
function updateEditorsContent() {
    // Обновляем raw JSON редактор
    if (currentMapping) {
        jsonEditors.raw.set(currentMapping);
    } else {
        jsonEditors.raw.set({});
    }
    
    // Обновляем response body редактор
    if (currentMapping && currentMapping.response) {
        if (currentMapping.response.jsonBody) {
            jsonEditors.responseBody.set(currentMapping.response.jsonBody);
        } else if (currentMapping.response.body) {
            try {
                // Пытаемся распарсить как JSON
                const jsonBody = JSON.parse(currentMapping.response.body);
                jsonEditors.responseBody.set(jsonBody);
            } catch (e) {
                // Если не JSON, отображаем как текст
                jsonEditors.responseBody.setText(currentMapping.response.body);
            }
        } else {
            jsonEditors.responseBody.set({});
        }
    } else {
        jsonEditors.responseBody.set({});
    }
}

// Обновление содержимого редакторов из raw JSON
function updateEditorsFromRaw() {
    if (!currentMapping) return;
    
    // Обновляем response body редактор
    if (currentMapping.response) {
        if (currentMapping.response.jsonBody) {
            jsonEditors.responseBody.set(currentMapping.response.jsonBody);
        } else if (currentMapping.response.body) {
            try {
                // Пытаемся распарсить как JSON
                const jsonBody = JSON.parse(currentMapping.response.body);
                jsonEditors.responseBody.set(jsonBody);
            } catch (e) {
                // Если не JSON, отображаем как текст
                jsonEditors.responseBody.setText(currentMapping.response.body);
            }
        } else {
            jsonEditors.responseBody.set({});
        }
    }
    
    // Обновляем другие поля формы
    updateEditorFields();
}

// Получение данных из JSON редакторов
function getDataFromEditors() {
    // Получаем данные из response body редактора
    if (!currentMapping.response.proxyBaseUrl) {
        try {
            const responseBody = jsonEditors.responseBody.get();
            if (responseBody && typeof responseBody === 'object' && Object.keys(responseBody).length > 0) {
                delete currentMapping.response.body;
                currentMapping.response.jsonBody = responseBody;
            } else {
                try {
                    // Проверяем, есть ли текст
                    const responseText = jsonEditors.responseBody.getText();
                    if (responseText && responseText.trim()) {
                        delete currentMapping.response.jsonBody;
                        currentMapping.response.body = responseText;
                    } else {
                        delete currentMapping.response.body;
                        delete currentMapping.response.jsonBody;
                    }
                } catch (e) {
                    delete currentMapping.response.body;
                    delete currentMapping.response.jsonBody;
                }
            }
        } catch (e) {
            console.error('Ошибка получения данных из редактора тела ответа:', e);
        }
    }
    
    return currentMapping;
}

// Разворачивание редактора на весь экран
function expandEditor(editorId) {
    const editorType = editorId.replace('-editor', '');
    let sourceEditor;
    let title;
    
    // Определяем, какой редактор разворачивается
    if (editorId === 'edit-raw-json-editor') {
        sourceEditor = jsonEditors.raw;
        title = 'Редактирование JSON маппинга';
    } else if (editorId === 'edit-response-body-editor') {
        sourceEditor = jsonEditors.responseBody;
        title = 'Редактирование тела ответа';
    } else {
        return;
    }
    
    // Сохраняем ссылку на исходный редактор
    currentFullscreenEditor = {
        sourceId: editorId,
        sourceEditor: sourceEditor
    };
    
    // Устанавливаем заголовок
    elements.fullscreenTitle.textContent = title;
    
    // Копируем данные из редактора
    let content;
    try {
        content = sourceEditor.get();
    } catch (e) {
        try {
            content = sourceEditor.getText();
        } catch (e) {
            content = {};
        }
    }
    
    // Показываем полноэкранный контейнер
    elements.fullscreenContainer.classList.remove('hidden');
    
    // Создаем новый редактор в полноэкранном режиме
    const fullscreenOptions = {...jsonEditorOptions, editorId: 'fullscreen'};
    const fullscreenJSONEditor = new JSONEditor(elements.fullscreenEditor, fullscreenOptions, content);
    
    // Сохраняем ссылку на полноэкранный редактор
    currentFullscreenEditor.fullscreenEditor = fullscreenJSONEditor;
}

// Закрытие полноэкранного режима
function closeFullscreen() {
    if (!currentFullscreenEditor) return;
    
    // Получаем данные из полноэкранного редактора
    try {
        let content;
        try {
            content = currentFullscreenEditor.fullscreenEditor.get();
        } catch (e) {
            try {
                content = currentFullscreenEditor.fullscreenEditor.getText();
            } catch (e) {
                content = {};
            }
        }
        
        // Обновляем исходный редактор
        if (typeof content === 'object') {
            currentFullscreenEditor.sourceEditor.set(content);
        } else {
            currentFullscreenEditor.sourceEditor.setText(content);
        }
        
        // Если это был raw редактор, обновляем currentMapping и другие редакторы
        if (currentFullscreenEditor.sourceId === 'edit-raw-json-editor') {
            currentMapping = content;
            updateEditorsFromRaw();
        }
    } catch (e) {
        console.error('Ошибка при передаче данных из полноэкранного редактора:', e);
    }
    
    // Уничтожаем полноэкранный редактор
    if (currentFullscreenEditor.fullscreenEditor) {
        currentFullscreenEditor.fullscreenEditor.destroy();
    }
    
    // Скрываем полноэкранный контейнер
    elements.fullscreenContainer.classList.add('hidden');
    
    // Очищаем ссылку на текущий полноэкранный редактор
    currentFullscreenEditor = null;
}

// Функция для добавления нового поля шаблона тела
function addBodyPattern(operator = 'equalToJson', value = '') {
    const container = document.getElementById('body-patterns');
    const pair = document.createElement('div');
    pair.className = 'key-value-operator-pair';
    
    // Создаем селект для оператора
    const operatorSelect = document.createElement('select');
    operatorSelect.className = 'body-pattern-operator';
    
    // Добавляем опции для оператора
    const operators = [
        { value: 'equalToJson', text: 'Равно JSON' },
        { value: 'matchesJsonPath', text: 'JSONPath' },
        { value: 'equalToXml', text: 'Равно XML' },
        { value: 'matchesXPath', text: 'XPath' },
        { value: 'equalTo', text: 'Равно (текст)' },
        { value: 'contains', text: 'Содержит' },
        { value: 'matches', text: 'Regex' },
        { value: 'doesNotMatch', text: 'Не соотв. Regex' }
    ];
    
    operators.forEach(op => {
        const option = document.createElement('option');
        option.value = op.value;
        option.textContent = op.text;
        operatorSelect.appendChild(option);
    });
    
    // Выбираем переданное значение оператора
    operatorSelect.value = operator;
    
    // Создаем поле для значения
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'body-pattern-value';
    valueInput.value = value;
    
    // Создаем кнопку удаления
    const removeButton = document.createElement('button');
    removeButton.textContent = '×';
    removeButton.addEventListener('click', function() {
        container.removeChild(pair);
    });
    
    // Добавляем все элементы в контейнер
    pair.appendChild(operatorSelect);
    pair.appendChild(valueInput);
    pair.appendChild(removeButton);
    container.appendChild(pair);
}

// Дублирование маппинга
async function duplicateMapping() {
    // Обновляем объект маппинга из полей формы
    updateMappingFromForm();
    
    // Валидация маппинга
    if (!validateMapping()) {
        return;
    }
    
    const serverUrl = elements.serverUrl.value.trim();
    const authToken = elements.authToken.value.trim();
    
    if (!serverUrl) {
        showToast('Укажите URL сервера', true);
        return;
    }
    
    try {
        // Создаем копию текущего маппинга
        const mappingCopy = JSON.parse(JSON.stringify(currentMapping));
        
        // Генерируем новый UUID для копии
        mappingCopy.id = generateUUID();
        
        // Если есть имя, добавляем к нему "(копия)"
        if (mappingCopy.name) {
            mappingCopy.name = `${mappingCopy.name} (копия)`;
        } else {
            mappingCopy.name = "Копия маппинга";
        }
        
        const headers = {
            'Content-Type': 'application/json'
        };
        if (authToken) {
            headers['Authorization'] = authToken;
        }
        
        // Создаем прокси URL для создания нового маппинга
        const proxyUrl = createProxyUrl(serverUrl, '/__admin/mappings');
        if (!proxyUrl) {
            throw new Error('Неверный формат URL сервера');
        }
        
        console.log('Отправка запроса через прокси для создания копии:', proxyUrl);
        
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(mappingCopy)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status}`);
        }
        
        showToast('Маппинг успешно дублирован');
        
        // Добавляем новый маппинг в список
        mappings.push(mappingCopy);
        
        // Обновляем отображение
        filterMappings();
        
        // Открываем новый маппинг для редактирования
        openEditor(mappingCopy);
    } catch (error) {
        console.error('Error duplicating mapping:', error);
        showToast(`Ошибка дублирования: ${error.message}`, true);
    }
}

// Генерирование UUID v4
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Вызываем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', init); 
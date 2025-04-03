const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Настройки
const PORT = 8001; // порт для локального сервера
const STATIC_DIR = __dirname; // директория с статическими файлами

// Типы MIME
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;
    
    // Проверяем, является ли это запросом к wiremock API
    if (pathname.startsWith('/proxy/wiremock')) {
        // Извлекаем реальный путь wiremock
        const wiremockPath = pathname.replace('/proxy/wiremock', '');
        
        // Получаем параметры из URL запроса
        const wiremockHost = parsedUrl.query.host || 'localhost';
        const wiremockPort = parsedUrl.query.port || '8080';
        
        // Копируем заголовки запроса
        const headers = { ...req.headers };
        
        // Удаляем заголовки, которые могут вызвать проблемы
        delete headers.host;
        delete headers.origin;
        delete headers.referer;
        
        // Настройки для запроса к wiremock
        const options = {
            hostname: wiremockHost,
            port: wiremockPort,
            path: wiremockPath,
            method: req.method,
            headers: headers
        };
        
        console.log(`Проксирование запроса к ${wiremockHost}:${wiremockPort}${wiremockPath}`);
        
        // Создаем запрос к wiremock
        const proxyReq = http.request(options, (proxyRes) => {
            // Устанавливаем заголовки CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            // Копируем статус и заголовки из ответа wiremock
            res.statusCode = proxyRes.statusCode;
            Object.keys(proxyRes.headers).forEach(key => {
                res.setHeader(key, proxyRes.headers[key]);
            });
            
            // Передаем тело ответа
            proxyRes.pipe(res);
        });
        
        // Обработка ошибок
        proxyReq.on('error', (e) => {
            console.error(`Ошибка при проксировании запроса: ${e.message}`);
            res.statusCode = 500;
            res.end(`Ошибка прокси: ${e.message}`);
        });
        
        // Передаем тело запроса, если оно есть
        if (['POST', 'PUT'].includes(req.method)) {
            req.pipe(proxyReq);
        } else {
            proxyReq.end();
        }
        
        return;
    }
    
    // Обработка OPTIONS запроса для CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.statusCode = 204; // No Content
        res.end();
        return;
    }
    
    // Для остальных запросов обслуживаем статические файлы
    
    // Если путь заканчивается на '/', добавляем 'index.html'
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Составляем путь к файлу
    const filePath = path.join(STATIC_DIR, pathname);
    
    // Проверяем существование файла
    fs.access(filePath, fs.constants.R_OK, (err) => {
        if (err) {
            // Файл не найден
            res.statusCode = 404;
            res.end('404 Not Found');
            return;
        }
        
        // Определяем тип MIME
        const ext = path.extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        // Устанавливаем заголовки и читаем файл
        res.setHeader('Content-Type', contentType);
        fs.createReadStream(filePath).pipe(res);
    });
});

// Запускаем сервер
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Откройте в браузере: http://localhost:${PORT}`);
    
    // Пытаемся автоматически открыть браузер
    let command;
    switch (process.platform) {
        case 'darwin': // macOS
            command = `open http://localhost:${PORT}`;
            break;
        case 'win32': // Windows
            command = `start http://localhost:${PORT}`;
            break;
        default: // Linux
            command = `xdg-open http://localhost:${PORT}`;
    }
    
    exec(command, (error) => {
        if (error) {
            console.log('Не удалось автоматически открыть браузер.');
        }
    });
}); 
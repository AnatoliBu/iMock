#!/bin/sh

echo "Starting iMock (WireMock Viewer) in Docker container..."

# Проверяем переменные окружения и устанавливаем значения по умолчанию
if [ -z "$PORT" ]; then
    export PORT=8001
    echo "PORT not set, defaulting to 8001"
fi

if [ -z "$WIREMOCK_HOST" ]; then
    export WIREMOCK_HOST=wiremock
    echo "WIREMOCK_HOST not set, defaulting to 'wiremock'"
fi

if [ -z "$WIREMOCK_PORT" ]; then
    export WIREMOCK_PORT=8080
    echo "WIREMOCK_PORT not set, defaulting to 8080"
fi

if [ -z "$WIREMOCK_TOKEN" ]; then
    echo "Warning: WIREMOCK_TOKEN not set, authorization might not work properly"
else
    echo "WIREMOCK_TOKEN is configured"
fi

# Создаем или обновляем файл с прокси конфигурацией
cat > /app/proxy.js << EOF
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const port = process.env.PORT || 8001;
const wiremockHost = process.env.WIREMOCK_HOST || 'wiremock';
const wiremockPort = process.env.WIREMOCK_PORT || 8080;
const wiremockToken = process.env.WIREMOCK_TOKEN || '';

// Настройка логирования
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs/access.log'), { flags: 'a' });
const errorLogStream = fs.createWriteStream(path.join(__dirname, 'logs/error.log'), { flags: 'a' });

function logRequest(req, res, next) {
    const date = new Date().toISOString();
    const log = \`[\${date}] \${req.method} \${req.url}\n\`;
    accessLogStream.write(log);
    next();
}

app.use(logRequest);
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Настройка прокси для WireMock API
const wiremockProxy = createProxyMiddleware({
    target: \`http://\${wiremockHost}:\${wiremockPort}\`,
    changeOrigin: true,
    pathRewrite: {
        '^/proxy/wiremock': '',
    },
    onProxyReq: (proxyReq, req, res) => {
        if (wiremockToken) {
            proxyReq.setHeader('Authorization', wiremockToken);
        }
        
        console.log(\`Proxying \${req.method} \${req.url} to \${wiremockHost}:\${wiremockPort}\`);
    },
    onError: (err, req, res) => {
        const errMsg = \`Proxy error: \${err.message}\`;
        errorLogStream.write(\`[\${new Date().toISOString()}] \${errMsg}\n\`);
        res.status(500).json({ error: errMsg });
    }
});

app.use('/proxy/wiremock', wiremockProxy);

// Обработка ошибок
app.use((err, req, res, next) => {
    const errMsg = \`Error processing request: \${err.message}\`;
    errorLogStream.write(\`[\${new Date().toISOString()}] \${errMsg}\n\`);
    res.status(500).json({ error: errMsg });
});

// Запуск сервера
const server = http.createServer(app);
server.listen(port, () => {
    console.log(\`iMock (WireMock Viewer) running on port \${port}\`);
    console.log(\`Proxying requests to WireMock at \${wiremockHost}:\${wiremockPort}\`);
    if (wiremockToken) {
        console.log('Using authorization token for WireMock API');
    }
});

// Обработка сигналов для корректного завершения
process.on('SIGINT', () => {
    console.log('Gracefully shutting down...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
EOF

# Запускаем Node.js приложение
echo "Starting proxy server..."
exec node /app/proxy.js 
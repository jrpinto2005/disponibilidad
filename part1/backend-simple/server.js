const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_NAME = process.env.SERVER_NAME || 'Backend-Simple';

// Middleware
app.use(cors());
app.use(express.json());

// Request counter and stats
let requestCount = 0;
const startTime = Date.now();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: SERVER_NAME,
        uptime: Math.round((Date.now() - startTime) / 1000),
        timestamp: new Date().toISOString()
    });
});

// Main API endpoint for the experiment
app.get('/api/test', (req, res) => {
    requestCount++;
    
    // Simulate some processing time (optional)
    const processingTime = Math.random() * 100; // 0-100ms
    
    setTimeout(() => {
        res.json({
            message: `Hola desde ${SERVER_NAME}! Esta es la respuesta #${requestCount}`,
            server: SERVER_NAME,
            requestId: requestCount,
            timestamp: new Date().toISOString(),
            processingTime: Math.round(processingTime)
        });
    }, processingTime);
});

// Get server stats
app.get('/api/stats', (req, res) => {
    res.json({
        server: SERVER_NAME,
        requestCount: requestCount,
        uptime: Math.round((Date.now() - startTime) / 1000),
        startTime: new Date(startTime).toISOString(),
        currentTime: new Date().toISOString()
    });
});

// Endpoint to simulate server failure (for testing)
app.post('/api/crash', (req, res) => {
    res.json({
        message: 'Servidor se apagará en 3 segundos...',
        server: SERVER_NAME
    });
    
    setTimeout(() => {
        console.log('💥 Simulando crash del servidor...');
        process.exit(1);
    }, 3000);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Error interno del servidor',
        server: SERVER_NAME,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint no encontrado',
        server: SERVER_NAME,
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 ${SERVER_NAME} ejecutándose en puerto ${PORT}`);
    console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    console.log(`🧪 API test: http://localhost:${PORT}/api/test`);
    console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
});

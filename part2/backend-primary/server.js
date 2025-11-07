const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4001;
const SERVER_NAME = process.env.SERVER_NAME || 'Backend-Primary';

// Middleware
app.use(cors());
app.use(express.json());

// State management
let requestCount = 0;
let isHealthy = true;
let simulateFailure = false;
const startTime = Date.now();

// Health check endpoint
app.get('/health', (req, res) => {
    if (!isHealthy || simulateFailure) {
        return res.status(503).json({
            status: 'unhealthy',
            server: SERVER_NAME,
            error: 'Server is simulating failure',
            timestamp: new Date().toISOString()
        });
    }

    res.json({
        status: 'healthy',
        server: SERVER_NAME,
        uptime: Math.round((Date.now() - startTime) / 1000),
        requestCount: requestCount,
        timestamp: new Date().toISOString()
    });
});

// Main API endpoint
app.get('/api/test', (req, res) => {
    if (!isHealthy || simulateFailure) {
        return res.status(503).json({
            error: 'Servidor no disponible - simulando falla',
            server: SERVER_NAME,
            timestamp: new Date().toISOString()
        });
    }

    requestCount++;
    
    // Simulate processing time
    const processingTime = Math.random() * 150; // 0-150ms
    
    setTimeout(() => {
        res.json({
            message: `Respuesta del ${SERVER_NAME} - Request #${requestCount}`,
            server: SERVER_NAME,
            requestId: requestCount,
            timestamp: new Date().toISOString(),
            processingTime: Math.round(processingTime),
            uptime: Math.round((Date.now() - startTime) / 1000)
        });
    }, processingTime);
});

// Get server stats
app.get('/api/stats', (req, res) => {
    res.json({
        server: SERVER_NAME,
        requestCount: requestCount,
        uptime: Math.round((Date.now() - startTime) / 1000),
        isHealthy: isHealthy,
        simulateFailure: simulateFailure,
        startTime: new Date(startTime).toISOString(),
        currentTime: new Date().toISOString()
    });
});

// Simulate failure endpoint
app.post('/api/simulate-failure', (req, res) => {
    const duration = req.body.duration || 30000; // 30 seconds default
    
    simulateFailure = true;
    console.log(`💥 Simulando falla por ${duration}ms`);
    
    res.json({
        message: `Simulando falla por ${duration}ms`,
        server: SERVER_NAME,
        duration: duration
    });
    
    setTimeout(() => {
        simulateFailure = false;
        console.log(`✅ Restaurando servicio`);
    }, duration);
});

// Toggle health status
app.post('/api/toggle-health', (req, res) => {
    isHealthy = !isHealthy;
    
    res.json({
        message: `Estado cambiado a: ${isHealthy ? 'healthy' : 'unhealthy'}`,
        server: SERVER_NAME,
        isHealthy: isHealthy
    });
    
    console.log(`🔄 Estado cambiado a: ${isHealthy ? 'healthy' : 'unhealthy'}`);
});

// Endpoint to crash server (for testing)
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
    console.log(`💥 Simulate failure: POST http://localhost:${PORT}/api/simulate-failure`);
    console.log(`🔄 Toggle health: POST http://localhost:${PORT}/api/toggle-health`);
});

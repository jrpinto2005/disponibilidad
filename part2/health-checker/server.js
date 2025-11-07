const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 4003;
const SERVER_NAME = process.env.SERVER_NAME || 'Health-Checker';

// Configuration
const PRIMARY_BACKEND_URL = process.env.PRIMARY_BACKEND_URL || 'http://localhost:4001';
const BACKUP_BACKEND_URL = process.env.BACKUP_BACKEND_URL || 'http://localhost:4002';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL) || 2000; // 5 seconds

// Middleware
app.use(cors());
app.use(express.json());

// Health status tracking
let healthStatus = {
    primary: {
        isHealthy: false,
        lastCheck: null,
        consecutiveFailures: 0,
        uptime: 0,
        responseTime: 0,
        error: null
    },
    backup: {
        isHealthy: false,
        lastCheck: null,
        consecutiveFailures: 0,
        uptime: 0,
        responseTime: 0,
        error: null
    }
};

let checkCount = 0;
let recommendation = 'primary'; // 'primary' or 'backup'
const startTime = Date.now();

// Start health checking immediately
startHealthChecking();

// Health check function
async function checkServiceHealth(type, url) {
    const startTime = Date.now();
    
    try {
        const response = await fetch(`${url}/health`, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Health-Checker/1.0'
            }
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
            const data = await response.json();
            
            healthStatus[type] = {
                isHealthy: true,
                lastCheck: new Date().toISOString(),
                consecutiveFailures: 0,
                uptime: data.uptime || 0,
                responseTime: responseTime,
                error: null,
                serverData: data
            };
            
            console.log(`✅ ${type.toUpperCase()} healthy (${responseTime}ms)`);
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        healthStatus[type].consecutiveFailures++;
        healthStatus[type].isHealthy = false;
        healthStatus[type].lastCheck = new Date().toISOString();
        healthStatus[type].error = error.message;
        healthStatus[type].responseTime = Date.now() - startTime;
        
        console.log(`❌ ${type.toUpperCase()} unhealthy: ${error.message} (${healthStatus[type].consecutiveFailures} failures)`);
    }
}

// Main health checking loop
async function performHealthCheck() {
    checkCount++;
    console.log(`\n🔍 Health check #${checkCount} at ${new Date().toLocaleTimeString()}`);
    
    await Promise.all([
        checkServiceHealth('primary', PRIMARY_BACKEND_URL),
        checkServiceHealth('backup', BACKUP_BACKEND_URL)
    ]);
    
    // Update recommendation based on health status
    updateRecommendation();
}

function updateRecommendation() {
    const primaryHealthy = healthStatus.primary.isHealthy;
    const backupHealthy = healthStatus.backup.isHealthy;
    
    let newRecommendation = recommendation;
    
    // Logic for failover recommendation
    if (!primaryHealthy && backupHealthy) {
        newRecommendation = 'backup';
        if (recommendation !== 'backup') {
            console.log('🔄 Recommending failover to BACKUP');
        }
    } else if (primaryHealthy) {
        newRecommendation = 'primary';
        if (recommendation !== 'primary') {
            console.log('🔄 Recommending failback to PRIMARY');
        }
    } else if (!primaryHealthy && !backupHealthy) {
        console.log('⚠️  Both services are unhealthy!');
    }
    
    recommendation = newRecommendation;
}

function startHealthChecking() {
    console.log(`🚀 Starting health checker...`);
    console.log(`📍 Primary: ${PRIMARY_BACKEND_URL}`);
    console.log(`📍 Backup: ${BACKUP_BACKEND_URL}`);
    console.log(`⏱️  Check interval: ${CHECK_INTERVAL}ms`);
    
    // Initial check
    performHealthCheck();
    
    // Schedule regular checks
    setInterval(performHealthCheck, CHECK_INTERVAL);
}

// API Endpoints

// Main status endpoint for frontend
app.get('/api/status', (req, res) => {
    res.json({
        recommendation: recommendation,
        shouldUseBackup: recommendation === 'backup',
        timestamp: new Date().toISOString(),
        healthChecker: {
            server: SERVER_NAME,
            uptime: Math.round((Date.now() - startTime) / 1000),
            checkCount: checkCount
        },
        services: {
            primary: {
                ...healthStatus.primary,
                url: PRIMARY_BACKEND_URL
            },
            backup: {
                ...healthStatus.backup,
                url: BACKUP_BACKEND_URL
            }
        }
    });
});

// Detailed health report
app.get('/api/health-report', (req, res) => {
    res.json({
        healthChecker: {
            status: 'healthy',
            server: SERVER_NAME,
            uptime: Math.round((Date.now() - startTime) / 1000),
            checkCount: checkCount,
            checkInterval: CHECK_INTERVAL,
            startTime: new Date(startTime).toISOString()
        },
        currentRecommendation: recommendation,
        services: healthStatus,
        urls: {
            primary: PRIMARY_BACKEND_URL,
            backup: BACKUP_BACKEND_URL
        }
    });
});

// Force a health check
app.post('/api/force-check', async (req, res) => {
    console.log('🔄 Forcing health check...');
    await performHealthCheck();
    
    res.json({
        message: 'Health check forced',
        checkCount: checkCount,
        currentRecommendation: recommendation,
        timestamp: new Date().toISOString()
    });
});

// Change recommendation manually (for testing)
app.post('/api/set-recommendation', (req, res) => {
    const newRecommendation = req.body.recommendation;
    
    if (newRecommendation !== 'primary' && newRecommendation !== 'backup') {
        return res.status(400).json({
            error: 'Recommendation must be "primary" or "backup"'
        });
    }
    
    const oldRecommendation = recommendation;
    recommendation = newRecommendation;
    
    res.json({
        message: `Recommendation changed from ${oldRecommendation} to ${newRecommendation}`,
        oldRecommendation: oldRecommendation,
        newRecommendation: newRecommendation,
        timestamp: new Date().toISOString()
    });
    
    console.log(`🔄 Manual recommendation change: ${oldRecommendation} → ${newRecommendation}`);
});

// Health check for the health checker itself
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        server: SERVER_NAME,
        uptime: Math.round((Date.now() - startTime) / 1000),
        role: 'health-checker',
        checkCount: checkCount,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({
        error: 'Error interno del health checker',
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
        availableEndpoints: [
            '/api/status',
            '/api/health-report',
            '/api/force-check',
            '/api/set-recommendation',
            '/health'
        ],
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🏥 ${SERVER_NAME} ejecutándose en puerto ${PORT}`);
    console.log(`📊 Status API: http://localhost:${PORT}/api/status`);
    console.log(`📋 Health report: http://localhost:${PORT}/api/health-report`);
    console.log(`🔄 Force check: POST http://localhost:${PORT}/api/force-check`);
    console.log(`⚙️  Set recommendation: POST http://localhost:${PORT}/api/set-recommendation`);
});

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Configuration from environment variables
const BACKEND_PRIMARY_URL = process.env.BACKEND_PRIMARY_URL || 'http://localhost:4001';
const BACKEND_BACKUP_URL = process.env.BACKEND_BACKUP_URL || 'http://localhost:4002';
const HEALTH_CHECKER_URL = process.env.HEALTH_CHECKER_URL || 'http://localhost:4003';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to provide configuration to frontend
app.get('/api/config', (req, res) => {
    res.json({
        backendPrimaryUrl: BACKEND_PRIMARY_URL,
        backendBackupUrl: BACKEND_BACKUP_URL,
        healthCheckerUrl: HEALTH_CHECKER_URL
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Frontend Advanced running on port ${PORT}`);
    console.log(`🔧 Configuration:`);
    console.log(`   Primary Backend: ${BACKEND_PRIMARY_URL}`);
    console.log(`   Backup Backend: ${BACKEND_BACKUP_URL}`);
    console.log(`   Health Checker: ${HEALTH_CHECKER_URL}`);
});

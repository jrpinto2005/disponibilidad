const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to provide backend URL to frontend
app.get('/api/config', (req, res) => {
    res.json({
        backendUrl: BACKEND_URL
    });
});

app.listen(PORT, () => {
    console.log(`Frontend simple running on port ${PORT}`);
    console.log(`Backend URL configured: ${BACKEND_URL}`);
});

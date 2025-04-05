const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { spawn, exec } = require('child_process');
require('dotenv').config();

const app = express();
const port = 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());    

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'recordings/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir);
}

// Function to transcribe a recording
function transcribeRecording(filename) {
    console.log(`Starting transcription for: ${filename}`);
    const pythonProcess = spawn('python3', ['transcribe.py', filename]);
    
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Transcription output: ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`Transcription error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Transcription process exited with code ${code}`);
    });
}

// Watch for new files in recordings directory
fs.watch(recordingsDir, (eventType, filename) => {
    if (eventType === 'rename' && filename && filename.endsWith('.webm')) {
        console.log(`New recording detected: ${filename}`);
        transcribeRecording(filename);
    }
});

// API Routes
// Test endpoint
app.get('/api/test', (req, res) => {
    console.log('Received request to /api/test endpoint');
    res.json({ 
        success: true,
        message: "Server is running correctly!"
    });
});

// Print string endpoint
app.get('/api/print-string', (req, res) => {    
    console.log('Received request to /api/print-string endpoint');
    console.log('Request headers:', req.headers);
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    
    res.json({ 
        success: true,
        message: "Hello! This is a test string from the server!"
    });
});

// Run TTS script endpoint
app.get('/api/runtts', (req, res) => {
    console.log('Received request to /api/runtts endpoint');
    console.log('Current directory:', __dirname);
    console.log('Starting TTS script...');
    
    exec('python3 tts.py', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error running TTS script: ${error}`);
            return res.status(500).json({ error: 'Error running TTS script' });
        }
        if (stderr) {
            console.error(`TTS script stderr: ${stderr}`);
            return res.status(500).json({ error: 'Error running TTS script' });
        }
        console.log(`TTS script output: ${stdout}`);
        res.json({ success: true });
    });
});

// File upload endpoint
app.post('/api/upload', upload.single('audio'), (req, res) => {
    console.log('Received request to /api/upload endpoint');
    if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.filename;
    console.log(`File uploaded successfully: ${filename}`);

    res.json({ 
        success: true,
        message: 'File uploaded successfully',
        filename: filename
    });
});

// Get recordings list endpoint
app.get('/api/recordings', (req, res) => {
    console.log('Received request to /api/recordings endpoint');
    fs.readdir(recordingsDir, (err, files) => {
        if (err) {
            console.error('Error reading recordings directory:', err);
            return res.status(500).json({ error: 'Error reading recordings directory' });
        }
        
        const recordings = files
            .filter(file => file.endsWith('.webm'))
            .map(file => ({
                filename: file,
                url: `/recordings/${file}`,
                timestamp: file.split('-')[1].replace('.webm', '')
            }));
            
        console.log(`Found ${recordings.length} recordings`);
        res.json(recordings);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    console.log(`404 - Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        success: false,
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found` 
    });
});

// Serve static files from recordings directory - moved to the end
app.use('/recordings', express.static(recordingsDir));

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API endpoints available at http://localhost:${port}/api/`);
});
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { spawn } = require('child_process');
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

// Function to run TTS script
function tts() {
    console.log("Starting TTS script...");
    
    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python3', ['tts.py']);

        pythonProcess.stdout.on('data', (data) => {
            console.log(`TTS output: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`TTS error: ${data}`);
            reject(new Error(`TTS error: ${data}`));
        });

        pythonProcess.on('close', (code) => {
            console.log(`TTS process exited with code ${code}`);
            if (code === 0) {
                resolve({ success: true, message: 'TTS script completed successfully' });
            } else {
                reject(new Error(`TTS process exited with code ${code}`));
            }
        });
    });
}

// Watch for new files in recordings directory
fs.watch(recordingsDir, (eventType, filename) => {
    if (eventType === 'rename' && filename && filename.endsWith('.webm')) {
        console.log(`New recording detected: ${filename}`);
        transcribeRecording(filename);
    }
});

// Serve static files from recordings directory
app.use('/recordings', express.static(recordingsDir));

// Handle file uploads
app.post('/upload', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.filename;
    console.log(`File uploaded: ${filename}`);

    res.json({ 
        message: 'File uploaded successfully',
        filename: filename
    });
});

// Get list of recordings
app.get('/recordings', (req, res) => {
    fs.readdir(recordingsDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error reading recordings directory' });
        }
        
        const recordings = files
            .filter(file => file.endsWith('.webm'))
            .map(file => ({
                filename: file,
                url: `/recordings/${file}`,
                timestamp: file.split('-')[1].replace('.webm', '')
            }));
            
        res.json(recordings);
    });
});

// Add TTS endpoint
app.post('/run-tts', async (req, res) => {
    try {
        const result = await tts();
        res.json(result);
    } catch (error) {
        console.error('Error running TTS:', error);
        res.status(500).json({ 
            error: 'Failed to run TTS script',
            details: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3001;

// Enable CORS
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'recordings');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `interview-${timestamp}.webm`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'audio/webm') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio/webm files are allowed.'));
        }
    }
});

// Serve static files from the recordings directory
app.use('/recordings', express.static(path.join(__dirname, 'recordings')));

// Handle file uploads
app.post('/api/upload', upload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.filename;
    console.log('New recording detected:', filename);

    // Start transcription process
    const transcribeScript = path.join(__dirname, 'transcribe.py');
    if (fs.existsSync(transcribeScript)) {
        console.log('Starting transcription for:', filename);
        const pythonProcess = spawn('python', [transcribeScript, req.file.path]);
        
        let output = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Transcription output:', data.toString());
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
            console.error('Transcription error:', data.toString());
        });

        pythonProcess.on('close', (code) => {
            console.log('Transcription process exited with code', code);
            if (code !== 0) {
                console.error('Transcription failed:', error);
            }
        });
    }

    res.json({ success: true, filename });
});

// Get list of recordings
app.get('/api/recordings', (req, res) => {
    try {
        const recordingsDir = path.join(__dirname, 'recordings');
        if (!fs.existsSync(recordingsDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(recordingsDir)
            .filter(file => file.endsWith('.webm'))
            .map(file => ({
                filename: file,
                url: `/recordings/${file}`,
                timestamp: new Date(file.split('-')[1].replace('.webm', '')).toISOString()
            }));

        res.json(files);
    } catch (error) {
        console.error('Error getting recordings:', error);
        res.status(500).json({ error: 'Failed to get recordings' });
    }
});

// Run TTS script
app.get('/runtts', (req, res) => {
    const ttsScript = path.join(__dirname, 'tts.py');
    if (!fs.existsSync(ttsScript)) {
        return res.status(404).json({ error: 'TTS script not found' });
    }

    const pythonProcess = spawn('python', [ttsScript]);
    
    let output = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('TTS output:', data.toString());
    });

    pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error('TTS error:', data.toString());
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: 'TTS script failed', details: error });
        }

        const outputFile = path.join(__dirname, 'output.wav');
        if (!fs.existsSync(outputFile)) {
            return res.status(404).json({ error: 'TTS output file not found' });
        }

        res.json({ success: true, message: 'TTS script completed successfully' });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
}); 
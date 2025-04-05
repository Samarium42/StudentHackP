const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3001;

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Ensure recordings directory exists
const recordingsDir = path.join(__dirname, 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, recordingsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Serve static files from recordings directory
app.use('/recordings', express.static(recordingsDir));

// Handle file upload
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ 
    message: 'File uploaded successfully',
    filename: req.file.filename
  });
});

// Save transcript
app.post('/transcript', (req, res) => {
  const { filename, transcript } = req.body;
  if (!filename || !transcript) {
    console.error('Missing filename or transcript:', { filename, transcript });
    return res.status(400).json({ error: 'Missing filename or transcript' });
  }

  const transcriptPath = path.join(recordingsDir, `${filename}.txt`);
  try {
    fs.writeFileSync(transcriptPath, transcript);
    console.log('Transcript saved successfully:', transcriptPath);
    res.json({ message: 'Transcript saved successfully' });
  } catch (error) {
    console.error('Error saving transcript:', error);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Get list of recordings with transcripts
app.get('/recordings', (req, res) => {
  fs.readdir(recordingsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error reading recordings directory' });
    }
    
    // Filter out transcript files and create response with both recordings and transcripts
    const recordings = files.filter(file => file.endsWith('.webm'));
    const response = recordings.map(recording => {
      const transcriptFile = `${recording}.txt`;
      let transcript = null;
      
      if (files.includes(transcriptFile)) {
        transcript = fs.readFileSync(path.join(recordingsDir, transcriptFile), 'utf8');
      }
      
      return {
        filename: recording,
        transcript
      };
    });
    
    res.json(response);
  });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 
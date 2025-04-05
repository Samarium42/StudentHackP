from flask import Flask, request, jsonify, send_from_directory, render_template
import os
import subprocess
from datetime import datetime
import json

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'recordings'
ALLOWED_EXTENSIONS = {'webm'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs('transcripts', exist_ok=True)
os.makedirs('tts_output', exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'audio' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['audio']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Start transcription process
        try:
            subprocess.Popen(['python', 'transcribe.py', filepath])
            return jsonify({'message': 'File uploaded successfully'}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/api/recordings')
def get_recordings():
    try:
        recordings = []
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            if allowed_file(filename):
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                timestamp = datetime.fromtimestamp(os.path.getctime(filepath))
                recordings.append({
                    'filename': filename,
                    'url': f'/api/recordings/{filename}',
                    'timestamp': timestamp.isoformat()
                })
        return jsonify(recordings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recordings/<filename>')
def serve_recording(filename):
    if allowed_file(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/runtts')
def run_tts():
    try:
        result = subprocess.run(['python', 'tts.py'], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({'success': True, 'output': result.stdout})
        else:
            return jsonify({'success': False, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    app.run(debug=True, port=3003) 
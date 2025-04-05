from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import speech_recognition as sr
from pydub import AudioSegment
import numpy as np
import librosa
import tempfile
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def analyze_audio(audio_path):
    """Analyze audio file and return metrics"""
    try:
        # Load audio file
        y, sr = librosa.load(audio_path)
        
        # Calculate speech rate (words per minute)
        # This is a simplified version - in production, you'd want to use a more sophisticated method
        duration = librosa.get_duration(y=y, sr=sr)
        words_per_minute = len(librosa.effects.split(y, top_db=30)) * 2  # Approximate
        
        # Calculate clarity (based on signal-to-noise ratio)
        clarity = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))
        
        # Convert to WAV for speech recognition
        audio = AudioSegment.from_file(audio_path)
        wav_path = os.path.join(tempfile.gettempdir(), 'temp.wav')
        audio.export(wav_path, format='wav')
        
        # Perform speech recognition
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            try:
                text = recognizer.recognize_google(audio_data)
                # Count filler words
                filler_words = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually']
                filler_count = sum(text.lower().count(word) for word in filler_words)
                
                # Calculate pauses
                pauses = len(librosa.effects.split(y, top_db=30)) - 1
                
                return {
                    'success': True,
                    'metrics': {
                        'wordsPerMinute': words_per_minute,
                        'fillerWords': filler_count,
                        'confidence': 0.8,  # Placeholder
                        'sentiment': 'neutral',  # Placeholder
                        'clarity': float(clarity),
                        'pauses': pauses,
                        'transcript': text
                    }
                }
            except sr.UnknownValueError:
                return {'success': False, 'error': 'Could not understand audio'}
            except sr.RequestError as e:
                return {'success': False, 'error': f'Speech recognition service error: {str(e)}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

@app.route('/api/analyze-audio', methods=['POST'])
def analyze_audio_endpoint():
    if 'audio' not in request.files:
        return jsonify({'success': False, 'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    
    # Save the uploaded file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'audio_{timestamp}_{audio_file.filename}'
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    audio_file.save(filepath)
    
    # Analyze the audio
    result = analyze_audio(filepath)
    
    # Clean up
    try:
        os.remove(filepath)
    except:
        pass
    
    return jsonify(result)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000) 
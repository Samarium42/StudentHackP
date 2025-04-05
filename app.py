from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from analyzer import ResponseAnalyzer
import tempfile
from datetime import datetime
import logging
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Initialize the analyzer
analyzer = ResponseAnalyzer()

# Create uploads directory if it doesn't exist
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Configure allowed file extensions
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'ogg', 'm4a', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/analyze-text', methods=['POST'])
def analyze_text():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'No text provided'
            }), 400
            
        text = data['text'].strip()
        if not text:
            return jsonify({
                'success': False,
                'error': 'Empty text provided'
            }), 400
            
        result = analyzer.analyze_text(text)
        return jsonify({
            'success': True,
            **result
        })
        
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze_response():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        # Check if audio file is provided
        if 'audio' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No audio file provided'
            }), 400
        
        # Get the audio file and text
        audio_file = request.files['audio']
        text = request.form.get('text', '').strip()
        
        if audio_file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No selected file'
            }), 400
            
        if not allowed_file(audio_file.filename):
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
        
        # Save the uploaded file temporarily
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, secure_filename('audio.webm'))
        
        try:
            # Save and analyze the audio file
            audio_file.save(temp_path)
            logger.info(f"Saved audio file: {temp_path}")
            
            # Analyze both audio and text
            audio_analysis = analyzer.analyze_audio(temp_path)
            text_analysis = analyzer.analyze_text(text) if text else None
            
            # Calculate overall score
            if text_analysis and audio_analysis:
                overall_score = (audio_analysis['audio_quality_score'] + text_analysis['quality_score']) / 2
            elif text_analysis:
                overall_score = text_analysis['quality_score']
            else:
                overall_score = audio_analysis['audio_quality_score']
            
            result = {
                'success': True,
                'audio_analysis': audio_analysis,
                'text_analysis': text_analysis,
                'overall_score': overall_score
            }
            
            return jsonify(result)
            
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Error processing audio: {str(e)}'
            }), 500
            
        finally:
            # Clean up the temporary file
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                os.rmdir(temp_dir)
                logger.info(f"Cleaned up temporary files")
            except Exception as e:
                logger.error(f"Error cleaning up temporary files: {str(e)}")
                
    except Exception as e:
        logger.error(f"General error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'analyzer': 'initialized',
        'upload_directory': os.path.exists(UPLOAD_FOLDER)
    })

if __name__ == '__main__':
    app.run(debug=True, port=5001) 
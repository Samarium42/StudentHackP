from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz  # PyMuPDF
import re
from google import genai
from google.genai import types

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

client = genai.Client(api_key="AIzaSyDl5FwX8vgtCyrXGgWTIHXchOLARwYeGB0")

def extract_text_from_pdf_file(file_storage):
    doc = fitz.open(stream=file_storage.read(), filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def clean_text(text):
    text = re.sub(r'\n{2,}', '\n\n', text)
    text = re.sub(r'[ ]{2,}', ' ', text)
    return text.strip()

def generate_questions_from_text(text):
    prompt = f"Generate 5 interview questions based on the following CV:\n\n{text}. Put square brackets around each question and do not include numbers anywhere in your response. Questions can be more broad as there will be the option to ask more technicalfollow up questions."
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    questions = extract_questions_from_response(response)
    return questions

def extract_questions_from_response(response):

    try:
        questions_text = response.text
        #print("Questions text: ", questions_text)
        questions_list = re.findall(r'\[(.*?)\]', questions_text)
        questions_list = [q.strip() for q in questions_list if q.strip()]
        return questions_list

    except Exception as e:
        print(f"Error parsing response: {e}")
        return []

@app.route('/upload-cv', methods=['POST'])
def upload_cv():
    print("Upload CV called")
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    job_description = request.form.get('job_description', '')  # Keep collecting job description but don't use it yet

    if file.filename == '' or not file.filename.endswith('.pdf'):
        return jsonify({'error': 'Invalid file type'}), 400

    try:
        raw_text = extract_text_from_pdf_file(file)
        cleaned_text = clean_text(raw_text)
        questions = generate_questions_from_text(cleaned_text)
        with open('mainquestions.txt', 'w') as f:
            for item in questions:
                f.write(item + "\n")
            
        #print("Questions: ", questions)
        return jsonify({'message': 'CV processed successfully','filename': file.filename,'questions': questions}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5050, debug=True)

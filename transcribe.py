import os
from pathlib import Path
import time
import requests
import base64
import subprocess
import tempfile

# Your Google Cloud API key
API_KEY = "AIzaSyCbv66adaLDsnUb8_1R_gKdAwqXPiQrWLA"

def split_audio(audio_path, chunk_duration=15):
    """
    Split audio file into chunks of specified duration (in seconds) using ffmpeg
    """
    try:
        # Create a temporary directory for chunks
        with tempfile.TemporaryDirectory() as temp_dir:
            # Use ffmpeg to split the audio file
            output_pattern = os.path.join(temp_dir, "chunk_%03d.webm")
            cmd = [
                "ffmpeg", "-i", str(audio_path),
                "-f", "segment",
                "-segment_time", str(chunk_duration),
                "-c", "copy",
                output_pattern
            ]
            
            # Run ffmpeg command
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Error splitting audio: {result.stderr}")
                return None
            
            # Read all chunks
            chunks = []
            chunk_files = sorted(Path(temp_dir).glob("chunk_*.webm"))
            for chunk_file in chunk_files:
                with open(chunk_file, "rb") as f:
                    chunks.append(f.read())
            
            return chunks
    except Exception as e:
        print(f"Error splitting audio: {str(e)}")
        return None

def transcribe_chunk(audio_chunk):
    """
    Transcribe a single audio chunk using Google Cloud Speech-to-Text API
    """
    try:
        # Convert chunk to base64
        audio_content = base64.b64encode(audio_chunk).decode('utf-8')
        
        # Prepare the request
        url = f"https://speech.googleapis.com/v1/speech:recognize?key={API_KEY}"
        headers = {
            "Content-Type": "application/json"
        }
        data = {
            "config": {
                "encoding": "WEBM_OPUS",
                "sampleRateHertz": 48000,
                "languageCode": "en-US",
                "enableAutomaticPunctuation": True
            },
            "audio": {
                "content": audio_content
            }
        }
        
        # Make the request
        response = requests.post(url, headers=headers, json=data)
        
        if not response.ok:
            print(f"Error response: {response.text}")
            response.raise_for_status()
            
        result = response.json()
        
        # Extract the transcript
        transcript = ""
        if "results" in result:
            for res in result["results"]:
                transcript += res["alternatives"][0]["transcript"] + " "
        
        return transcript.strip()
    except Exception as e:
        print(f"Error transcribing chunk: {str(e)}")
        return None

def transcribe_audio(audio_path):
    """
    Transcribe an audio file by splitting it into chunks and combining the transcripts
    """
    try:
        print(f"Splitting {audio_path} into chunks...")
        chunks = split_audio(audio_path)
        
        if not chunks:
            return None
            
        print(f"Processing {len(chunks)} chunks...")
        transcripts = []
        
        for i, chunk in enumerate(chunks, 1):
            print(f"Transcribing chunk {i}/{len(chunks)}...")
            transcript = transcribe_chunk(chunk)
            if transcript:
                transcripts.append(transcript)
            else:
                print(f"Failed to transcribe chunk {i}")
        
        # Combine all transcripts
        full_transcript = " ".join(transcripts)
        return full_transcript.strip()
    except Exception as e:
        print(f"Error transcribing {audio_path}: {str(e)}")
        return None

def process_recordings():
    """
    Process all recordings in the recordings directory
    """
    recordings_dir = Path(__file__).parent / "recordings"
    recordings_dir.mkdir(exist_ok=True)
    
    print(f"Looking for recordings in: {recordings_dir}")
    
    for audio_file in recordings_dir.glob("*.webm"):
        transcript_file = audio_file.with_suffix(".txt")
        
        if transcript_file.exists():
            continue
            
        print(f"Processing {audio_file.name}...")
        transcript = transcribe_audio(audio_file)
        
        if transcript:
            with open(transcript_file, "w") as f:
                f.write(transcript)
            print(f"Saved transcript to {transcript_file.name}")
        else:
            print(f"Failed to transcribe {audio_file.name}")

def main():
    print("Starting transcription service...")
    while True:
        process_recordings()
        time.sleep(60)

if __name__ == "__main__":
    main() 
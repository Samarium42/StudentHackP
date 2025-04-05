import os
import sys
import whisper
import torch
import numpy as np
from pydub import AudioSegment
import time

def split_audio(input_path, chunk_duration_ms=60000):
    """Split audio file into chunks of specified duration."""
    print(f"Splitting {input_path} into chunks...")
    audio = AudioSegment.from_file(input_path, format="webm")
    chunks = []
    
    # Split audio into chunks
    for i in range(0, len(audio), chunk_duration_ms):
        chunk = audio[i:i + chunk_duration_ms]
        chunks.append(chunk)
    
    print(f"Processing {len(chunks)} chunks...")
    return chunks

def transcribe_chunk(chunk, model, chunk_number, total_chunks):
    """Transcribe a single audio chunk."""
    print(f"Transcribing chunk {chunk_number}/{total_chunks}...")
    
    # Convert chunk to numpy array
    samples = np.array(chunk.get_array_of_samples())
    if chunk.channels == 2:
        samples = samples.reshape((-1, 2))
    
    # Normalize audio
    samples = samples.astype(np.float32) / 32768.0
    
    # Transcribe
    result = model.transcribe(samples)
    return result["text"].strip()

def main():
    if len(sys.argv) != 2:
        print("Usage: python transcribe.py <filename>")
        sys.exit(1)
    
    filename = sys.argv[1]
    input_path = os.path.join('recordings', filename)
    
    if not os.path.exists(input_path):
        print(f"File not found: {filename}")
        sys.exit(1)
    
    print(f"Processing {filename}...")
    
    # Load Whisper model
    print("Loading Whisper model...")
    model = whisper.load_model("base")
    
    # Split audio into chunks
    chunks = split_audio(input_path)
    
    # Transcribe each chunk
    transcriptions = []
    for i, chunk in enumerate(chunks, 1):
        transcription = transcribe_chunk(chunk, model, i, len(chunks))
        transcriptions.append(transcription)
    
    # Combine transcriptions
    full_transcript = " ".join(transcriptions)
    
    # Save transcript
    output_filename = os.path.splitext(filename)[0] + ".txt"
    output_path = os.path.join('transcripts', output_filename)
    
    os.makedirs('transcripts', exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(full_transcript)
    
    print(f"Saved transcript to {output_filename}")

if __name__ == "__main__":
    main() 
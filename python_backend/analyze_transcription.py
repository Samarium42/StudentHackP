import os
from audio_analyzer import AudioAnalyzer
import json
from datetime import datetime

def analyze_latest_transcription():
    """
    Analyze the most recent transcription in the recordings directory
    """
    # Initialize analyzer
    analyzer = AudioAnalyzer()
    
    # Find the most recent webm file
    recordings_dir = "recordings"
    webm_files = [f for f in os.listdir(recordings_dir) if f.endswith('.webm')]
    if not webm_files:
        print("No webm files found in recordings directory")
        return
    
    # Sort by modification time
    webm_files.sort(key=lambda x: os.path.getmtime(os.path.join(recordings_dir, x)), reverse=True)
    latest_webm = webm_files[0]
    base_name = os.path.splitext(latest_webm)[0]
    
    # Check if transcript exists
    transcript_path = os.path.join(recordings_dir, f"{base_name}.txt")
    if not os.path.exists(transcript_path):
        print(f"No transcript found for {latest_webm}")
        return
    
    # Read transcript
    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript = f.read()
    
    audio_path = os.path.join(recordings_dir, latest_webm)
    analysis = analyzer.get_comprehensive_feedback(audio_path, transcript)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(recordings_dir, f"{base_name}_analysis_{timestamp}.json")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2)
    
    print(f"Analysis saved to {output_path}")
    print("\n=== Analysis Summary ===")
    print("\nAudio Analysis:")
    for feedback in analysis['audio_analysis'].get('feedback', []):
        print(f"- {feedback}")
    
    print("\nTranscript Analysis:")
    for feedback in analysis['transcript_analysis'].get('feedback', []):
        print(f"- {feedback}")

if __name__ == "__main__":
    analyze_latest_transcription() 
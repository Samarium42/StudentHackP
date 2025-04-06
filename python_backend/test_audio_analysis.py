from audio_analyzer import AudioAnalyzer
import os
from datetime import datetime

def get_latest_recording():
    """Get the most recent recording and its transcript"""
    # Go up one directory to find the recordings folder
    recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "recordings")
    print(f"Looking for recordings in: {recordings_dir}")
    
    if not os.path.exists(recordings_dir):
        print(f"Recordings directory not found at: {recordings_dir}")
        return None, None
        
    webm_files = [f for f in os.listdir(recordings_dir) if f.endswith('.webm')]
    if not webm_files:
        print("No webm files found in recordings directory")
        return None, None
    
    # Sort by modification time
    webm_files.sort(key=lambda x: os.path.getmtime(os.path.join(recordings_dir, x)), reverse=True)
    latest_webm = webm_files[0]
    base_name = os.path.splitext(latest_webm)[0]
    
    # Check if transcript exists
    transcript_path = os.path.join(recordings_dir, f"{base_name}.txt")
    if not os.path.exists(transcript_path):
        return latest_webm, None
    
    return latest_webm, transcript_path

def test_audio_analysis():
    # Initialize analyzer
    analyzer = AudioAnalyzer()
    
    # Get latest recording
    latest_webm, transcript_path = get_latest_recording()
    
    if not latest_webm:
        print("No webm files found in recordings directory")
        return
    
    # Go up one directory to find the recordings folder
    recordings_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "recordings")
    test_audio = os.path.join(recordings_dir, latest_webm)
    
    # Test audio analysis
    print("\nTesting audio analysis...")
    print(f"Using audio file: {test_audio}")
    audio_analysis = analyzer.analyze_audio(test_audio)
    print("\nAudio Analysis Results:")
    for key, value in audio_analysis.items():
        if key != "feedback":
            print(f"{key}: {value}")
    print("\nAudio Feedback:")
    for feedback in audio_analysis.get("feedback", []):
        print(f"- {feedback}")
    
    if not transcript_path:
        print("\nNo transcript file found for the latest recording")
        return
    
    # Read transcript
    with open(transcript_path, 'r', encoding='utf-8') as f:
        transcript = f.read()
    
    # Test transcript analysis
    print("\nTesting transcript analysis...")
    print(f"Using transcript file: {transcript_path}")
    transcript_analysis = analyzer.analyze_transcript(transcript)
    print("\nTranscript Analysis Results:")
    for key, value in transcript_analysis.items():
        if key != "feedback":
            print(f"{key}: {value}")
    print("\nTranscript Feedback:")
    for feedback in transcript_analysis.get("feedback", []):
        print(f"- {feedback}")
    
    # Test comprehensive analysis
    print("\nTesting comprehensive analysis...")
    comprehensive = analyzer.get_comprehensive_feedback(test_audio, transcript)
    print("\nCombined Feedback:")
    for feedback in comprehensive.get("combined_feedback", []):
        print(f"- {feedback}")

if __name__ == "__main__":
    test_audio_analysis() 
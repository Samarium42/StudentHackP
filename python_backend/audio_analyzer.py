import librosa
import numpy as np
from textblob import TextBlob
import os
from typing import Dict, Any, Optional

class AudioAnalyzer:
    def __init__(self):
        self.sample_rate = 22050  # librosa's default sample rate

    def analyze_audio(self, audio_path: str) -> Dict[str, Any]:
        """
        Analyze audio file using librosa and provide feedback on:
        - Duration
        - Audio quality (based on signal-to-noise ratio)
        - Speech clarity
        - Volume consistency
        """
        try:
            # Load audio file
            y, sr = librosa.load(audio_path, sr=self.sample_rate)
            
            # Calculate basic audio features
            duration = librosa.get_duration(y=y, sr=sr)
            
            # Calculate signal-to-noise ratio (SNR)
            # This is a simplified version - in practice, you'd need a more sophisticated approach
            rms = librosa.feature.rms(y=y)[0]
            noise_floor = np.percentile(rms, 10)
            signal_level = np.percentile(rms, 90)
            snr = 20 * np.log10(signal_level / noise_floor) if noise_floor > 0 else 0
            
            # Calculate volume consistency
            volume_std = np.std(rms)
            
            # Calculate speech clarity (using spectral centroid as a proxy)
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            clarity_score = np.mean(spectral_centroid) / 1000  # Normalize to 0-1 range
            
            # Generate feedback based on metrics
            feedback = []
            
            # Duration feedback
            if duration < 10:
                feedback.append("The recording is quite short. Consider speaking for at least 10-15 seconds.")
            elif duration > 120:
                feedback.append("The recording is quite long. Consider keeping responses under 2 minutes.")
            else:
                feedback.append(f"Good duration: {duration:.1f} seconds")
            
            # Audio quality feedback
            if snr < 10:
                feedback.append("Audio quality is poor. There might be too much background noise.")
            elif snr < 20:
                feedback.append("Audio quality is acceptable but could be improved.")
            else:
                feedback.append("Good audio quality with clear speech.")
            
            # Volume consistency feedback
            if volume_std > 0.3:
                feedback.append("Volume varies significantly. Try to maintain consistent speaking volume.")
            else:
                feedback.append("Good volume consistency throughout the recording.")
            
            # Speech clarity feedback
            if clarity_score < 0.3:
                feedback.append("Speech clarity could be improved. Consider speaking more clearly.")
            elif clarity_score < 0.6:
                feedback.append("Speech clarity is acceptable.")
            else:
                feedback.append("Excellent speech clarity.")
            
            return {
                "duration": duration,
                "snr": snr,
                "volume_consistency": volume_std,
                "clarity_score": clarity_score,
                "feedback": feedback
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "feedback": ["Could not analyze audio quality"]
            }

    def analyze_transcript(self, transcript: str) -> Dict[str, Any]:
        """
        Analyze the transcript for:
        - Word count
        - Sentiment
        - Reading time
        - Language complexity
        """
        try:
            blob = TextBlob(transcript)
            
            # Basic metrics
            word_count = len(transcript.split())
            reading_time = word_count / 150  # Assuming 150 words per minute reading speed
            
            # Sentiment analysis
            sentiment = blob.sentiment.polarity
            subjectivity = blob.sentiment.subjectivity
            
            # Generate feedback
            feedback = []
            
            # Word count feedback
            if word_count < 50:
                feedback.append("Response is quite brief. Consider providing more detail.")
            elif word_count > 500:
                feedback.append("Response is quite long. Consider being more concise.")
            else:
                feedback.append(f"Good response length: {word_count} words")
            
            # Sentiment feedback
            if sentiment > 0.5:
                feedback.append("Very positive and enthusiastic tone")
            elif sentiment > 0:
                feedback.append("Generally positive tone")
            elif sentiment < -0.5:
                feedback.append("Quite negative tone")
            elif sentiment < 0:
                feedback.append("Somewhat negative tone")
            else:
                feedback.append("Neutral tone")
            
            # Subjectivity feedback
            if subjectivity > 0.7:
                feedback.append("Highly subjective response with personal opinions")
            elif subjectivity > 0.4:
                feedback.append("Balanced mix of facts and opinions")
            else:
                feedback.append("Objective and factual response")
            
            return {
                "word_count": word_count,
                "reading_time": reading_time,
                "sentiment": sentiment,
                "subjectivity": subjectivity,
                "feedback": feedback
            }
            
        except Exception as e:
            return {
                "error": str(e),
                "feedback": ["Could not analyze transcript"]
            }

    def get_comprehensive_feedback(self, audio_path: str, transcript: str) -> Dict[str, Any]:
        """
        Combine audio and transcript analysis for comprehensive feedback
        """
        audio_analysis = self.analyze_audio(audio_path)
        transcript_analysis = self.analyze_transcript(transcript)
        
        # Combine feedback
        all_feedback = []
        if "feedback" in audio_analysis:
            all_feedback.extend(audio_analysis["feedback"])
        if "feedback" in transcript_analysis:
            all_feedback.extend(transcript_analysis["feedback"])
        
        return {
            "audio_analysis": audio_analysis,
            "transcript_analysis": transcript_analysis,
            "combined_feedback": all_feedback
        } 
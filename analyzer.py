import numpy as np
import librosa
import re
from typing import Dict, List, Tuple, Any
from textblob import TextBlob
import soundfile as sf

class ResponseAnalyzer:
    def __init__(self):
        # Keywords indicating good responses
        self.positive_indicators = [
            'specifically', 'example', 'experience', 'implemented', 'achieved',
            'developed', 'managed', 'led', 'improved', 'solved', 'created',
            'designed', 'analyzed', 'collaborated', 'successfully'
        ]
        
        # Keywords indicating weak responses
        self.negative_indicators = [
            'maybe', 'probably', 'kind of', 'sort of', 'like', 'you know',
            'basically', 'actually', 'honestly', 'pretty much'
        ]
        
        # Professional terminology
        self.professional_terms = [
            'methodology', 'strategy', 'implementation', 'analysis',
            'development', 'management', 'coordination', 'leadership',
            'optimization', 'innovation', 'solution', 'framework'
        ]
        
        # Filler words to track
        self.filler_words = [
            'um', 'uh', 'like', 'you know', 'so', 'basically', 'actually',
            'literally', 'pretty much', 'kind of', 'sort of'
        ]

    def analyze_text(self, text: str) -> Dict[str, Any]:
        """Analyze the text content of the response"""
        # Clean the text
        text = text.lower().strip()
        
        # Basic text metrics
        word_count = len(text.split())
        avg_word_length = np.mean([len(word) for word in text.split()])
        
        # Count indicators
        positive_count = sum(1 for word in self.positive_indicators if word in text)
        negative_count = sum(1 for word in self.negative_indicators if word in text)
        professional_terms_count = sum(1 for term in self.professional_terms if term in text)
        filler_count = sum(1 for filler in self.filler_words if filler in text)
        
        # Sentiment analysis using TextBlob
        sentiment = TextBlob(text).sentiment
        
        # Calculate response quality score (0-100)
        quality_score = self._calculate_quality_score(
            positive_count, negative_count, 
            professional_terms_count, filler_count,
            word_count, sentiment.polarity
        )
        
        return {
            'quality_score': quality_score,
            'metrics': {
                'word_count': word_count,
                'avg_word_length': avg_word_length,
                'positive_indicators': positive_count,
                'negative_indicators': negative_count,
                'professional_terms': professional_terms_count,
                'filler_words': filler_count,
                'sentiment_polarity': sentiment.polarity,
                'sentiment_subjectivity': sentiment.subjectivity
            },
            'feedback': self._generate_text_feedback(
                quality_score, filler_count, professional_terms_count,
                word_count, sentiment.polarity
            )
        }

    def analyze_audio(self, audio_path: str) -> Dict[str, Any]:
        """Analyze the audio characteristics of the response"""
        try:
            # Try loading with soundfile first (more robust for different formats)
            try:
                audio_data, sample_rate = sf.read(audio_path)
                if len(audio_data.shape) > 1:
                    # Convert stereo to mono by averaging channels
                    audio_data = np.mean(audio_data, axis=1)
            except:
                # Fallback to librosa if soundfile fails
                audio_data, sample_rate = librosa.load(audio_path)

            # Ensure we have valid audio data
            if len(audio_data) == 0:
                raise ValueError("Empty audio file")

            # Calculate audio metrics
            rms = librosa.feature.rms(y=audio_data)[0]
            if len(rms) == 0:
                raise ValueError("Could not analyze audio volume")

            # Improved tempo detection with error handling
            try:
                tempo, _ = librosa.beat.beat_track(y=audio_data, sr=sample_rate)
            except:
                # Fallback to a default tempo if beat detection fails
                tempo = 120

            zero_crossings = librosa.zero_crossings(audio_data)
            spectral_centroids = librosa.feature.spectral_centroid(y=audio_data, sr=sample_rate)[0]
            
            # Volume analysis with validation
            volume_stats = {
                'mean': float(np.mean(rms)) if len(rms) > 0 else 0.0,
                'std': float(np.std(rms)) if len(rms) > 0 else 0.0,
                'max': float(np.max(rms)) if len(rms) > 0 else 0.0,
                'min': float(np.min(rms)) if len(rms) > 0 else 0.0
            }
            
            # More accurate speaking pace calculation
            estimated_wpm = self._estimate_speaking_pace(audio_data, sample_rate, tempo)
            
            # Enhanced clarity score calculation
            clarity_score = self._calculate_clarity_score(audio_data, sample_rate, spectral_centroids)
            
            # Calculate overall audio quality score
            audio_quality_score = self._calculate_audio_quality_score(
                volume_stats, estimated_wpm, clarity_score
            )
            
            return {
                'audio_quality_score': audio_quality_score,
                'metrics': {
                    'volume_stats': volume_stats,
                    'speaking_pace': estimated_wpm,
                    'clarity_score': clarity_score,
                    'zero_crossing_rate': float(np.mean(zero_crossings))
                },
                'feedback': self._generate_audio_feedback(
                    volume_stats, estimated_wpm, clarity_score
                )
            }
        except Exception as e:
            raise ValueError(f"Audio analysis failed: {str(e)}")

    def _estimate_speaking_pace(self, audio_data: np.ndarray, sample_rate: int, tempo: float) -> float:
        """More accurate estimation of speaking pace"""
        # Detect speech segments
        speech_segments = librosa.effects.split(audio_data, top_db=20)
        total_speech_duration = sum(end - start for start, end in speech_segments) / sample_rate
        
        # Estimate word count from tempo and speech duration
        estimated_words = (tempo / 60.0) * total_speech_duration * 1.2  # Adjustment factor
        if total_speech_duration > 0:
            return estimated_words / (total_speech_duration / 60.0)  # Words per minute
        return 0.0

    def _calculate_clarity_score(self, audio_data: np.ndarray, sample_rate: int, spectral_centroids: np.ndarray) -> float:
        """Enhanced clarity score calculation"""
        # Combine multiple factors for clarity assessment
        
        # 1. Spectral centroid (brightness/clarity)
        centroid_score = np.mean(spectral_centroids) / 1000  # Normalized
        
        # 2. Signal-to-noise ratio estimation
        noise_floor = np.percentile(np.abs(audio_data), 10)
        signal_level = np.percentile(np.abs(audio_data), 90)
        snr_score = min(1.0, max(0.0, (signal_level - noise_floor) / signal_level if signal_level > 0 else 0))
        
        # 3. Speech energy variation
        energy = librosa.feature.rms(y=audio_data)[0]
        energy_var_score = min(1.0, np.std(energy) * 10)
        
        # Combine scores with weights
        clarity_score = (
            0.4 * centroid_score +
            0.4 * snr_score +
            0.2 * energy_var_score
        )
        
        return min(1.0, max(0.0, clarity_score))

    def _calculate_quality_score(
        self, positive_count: int, negative_count: int,
        professional_count: int, filler_count: int,
        word_count: int, sentiment_polarity: float
    ) -> float:
        """Calculate overall response quality score"""
        # Base score
        score = 70.0
        
        # Adjust based on indicators
        score += (positive_count * 2)
        score -= (negative_count * 2)
        score += (professional_count * 2)
        score -= (filler_count * 3)
        
        # Adjust for response length (penalize if too short or too long)
        if word_count < 50:
            score -= (50 - word_count) * 0.5
        elif word_count > 300:
            score -= (word_count - 300) * 0.2
        
        # Adjust for sentiment (slight boost for positive but professional tone)
        score += sentiment_polarity * 5
        
        # Ensure score is between 0 and 100
        return max(0, min(100, score))

    def _calculate_audio_quality_score(
        self, volume_stats: Dict[str, float],
        speaking_pace: float,
        clarity_score: float
    ) -> float:
        """Calculate overall audio quality score"""
        score = 70.0
        
        # Volume consistency
        if volume_stats['std'] < 0.1:
            score += 10
        elif volume_stats['std'] > 0.3:
            score -= 10
        
        # Speaking pace (ideal range: 120-160 WPM)
        if 120 <= speaking_pace <= 160:
            score += 15
        else:
            score -= abs(speaking_pace - 140) * 0.1
        
        # Voice clarity
        score += clarity_score * 20
        
        return max(0, min(100, score))

    def _generate_text_feedback(
        self, quality_score: float,
        filler_count: int,
        professional_terms: int,
        word_count: int,
        sentiment: float
    ) -> List[Dict[str, str]]:
        """Generate specific feedback based on text analysis"""
        feedback = []
        
        # Quality score feedback
        if quality_score >= 80:
            feedback.append({
                'type': 'positive',
                'message': 'Excellent response! Your answer is well-structured and professional.'
            })
        elif quality_score >= 60:
            feedback.append({
                'type': 'neutral',
                'message': 'Good response, but there\'s room for improvement.'
            })
        else:
            feedback.append({
                'type': 'negative',
                'message': 'Your response needs significant improvement.'
            })
        
        # Filler words feedback
        if filler_count > 5:
            feedback.append({
                'type': 'negative',
                'message': f'Try to reduce filler words (used {filler_count} times).'
            })
        
        # Professional language feedback
        if professional_terms < 2:
            feedback.append({
                'type': 'improvement',
                'message': 'Consider using more professional terminology.'
            })
        
        # Length feedback
        if word_count < 50:
            feedback.append({
                'type': 'improvement',
                'message': 'Your response is quite brief. Consider expanding with more details.'
            })
        elif word_count > 300:
            feedback.append({
                'type': 'improvement',
                'message': 'Your response is quite long. Try to be more concise.'
            })
        
        return feedback

    def _generate_audio_feedback(
        self, volume_stats: Dict[str, float],
        speaking_pace: float,
        clarity_score: float
    ) -> List[Dict[str, str]]:
        """Generate specific feedback based on audio analysis"""
        feedback = []
        
        # Volume feedback
        if volume_stats['mean'] < 0.1:
            feedback.append({
                'type': 'improvement',
                'message': 'Try to speak louder for better clarity.'
            })
        elif volume_stats['mean'] > 0.8:
            feedback.append({
                'type': 'improvement',
                'message': 'Consider speaking a bit softer.'
            })
        
        if volume_stats['std'] > 0.3:
            feedback.append({
                'type': 'improvement',
                'message': 'Try to maintain more consistent volume levels.'
            })
        
        # Pace feedback
        if speaking_pace < 120:
            feedback.append({
                'type': 'improvement',
                'message': 'Try to speak a bit faster to maintain engagement.'
            })
        elif speaking_pace > 160:
            feedback.append({
                'type': 'improvement',
                'message': 'Consider slowing down for better clarity.'
            })
        
        # Clarity feedback
        if clarity_score < 0.5:
            feedback.append({
                'type': 'improvement',
                'message': 'Focus on speaking more clearly and enunciating words.'
            })
        
        return feedback

# Example usage:
if __name__ == "__main__":
    analyzer = ResponseAnalyzer()
    
    # Example text analysis
    sample_text = """
    I successfully led a team of five developers in implementing a new customer 
    relationship management system. We utilized agile methodology and completed 
    the project ahead of schedule. The solution improved customer satisfaction 
    by 35% and reduced response times significantly.
    """
    
    text_analysis = analyzer.analyze_text(sample_text)
    print("\nText Analysis Results:")
    print(f"Quality Score: {text_analysis['quality_score']}")
    print("\nMetrics:", text_analysis['metrics'])
    print("\nFeedback:")
    for feedback in text_analysis['feedback']:
        print(f"- [{feedback['type']}] {feedback['message']}") 
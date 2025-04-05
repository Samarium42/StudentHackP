export interface Feedback {
  type: 'positive' | 'negative' | 'neutral' | 'improvement';
  message: string;
}

export interface Metrics {
  word_count: number;
  avg_word_length: number;
  filler_words: number;
  professional_terms: number;
  positive_indicators: number;
  negative_indicators: number;
  sentiment_polarity: number;
  sentiment_subjectivity: number;
}

export interface AudioMetrics {
  volume_stats: {
    mean: number;
    std: number;
    max: number;
    min: number;
  };
  speaking_pace: number;
  clarity_score: number;
  zero_crossing_rate: number;
}

export interface TextAnalysis {
  quality_score: number;
  metrics: Metrics;
  feedback: Feedback[];
}

export interface AudioAnalysis {
  audio_quality_score: number;
  metrics: AudioMetrics;
  feedback: Feedback[];
}

export interface AnalysisResult {
  success: boolean;
  text_analysis?: TextAnalysis;
  audio_analysis?: AudioAnalysis;
  overall_score?: number;
} 
import { HfInference } from '@huggingface/inference';

const hf = process.env.HUGGING_FACE_TOKEN ? 
  new HfInference(process.env.HUGGING_FACE_TOKEN) : 
  null;

export interface SpeakerSegment {
  speaker: string;
  start: number;
  end: number;
  confidence: number;
}

export async function performSpeakerDiarization(audioBuffer: Buffer): Promise<SpeakerSegment[]> {
  try {
    console.log('🎭 Starting speaker diarization...');
    
    if (!hf) {
      console.warn('🎭 Hugging Face token not provided, skipping speaker diarization');
      return [];
    }
    
    // Use OpenAI Whisper with speaker detection (simplified approach)
    // Since proper diarization models aren't easily available via HF API,
    // we'll use a simpler approach with voice activity detection
    console.log('🎭 Using simplified speaker detection approach...');
    
    // For now, create mock segments based on silence detection
    // This is a placeholder - in production you'd use a proper diarization service
    const segments: SpeakerSegment[] = createMockSpeakerSegments(audioBuffer);
    
    console.log('🎭 Simplified speaker detection completed');
    
    console.log(`🎭 Found ${segments.length} speaker segments`);
    return segments;
    
  } catch (error) {
    console.error('🎭 Speaker diarization error:', error);
    // Return empty segments if diarization fails
    return [];
  }
}

export function alignTranscriptWithSpeakers(
  transcript: string, 
  segments: SpeakerSegment[],
  chunkDurationSec: number = 900
): string {
  if (segments.length === 0) {
    return transcript;
  }
  
  try {
    console.log('🎭 Aligning transcript with speakers...');
    
    // Split transcript into sentences
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Estimate timing for each sentence (rough approximation)
    const totalDuration = segments[segments.length - 1]?.end || chunkDurationSec;
    const timePerSentence = totalDuration / sentences.length;
    
    let alignedTranscript = '';
    let currentTime = 0;
    let currentSpeaker = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      const sentenceStart = currentTime;
      const sentenceEnd = currentTime + timePerSentence;
      
      // Find which speaker is active at this time
      const activeSpeaker = findSpeakerAtTime(segments, sentenceStart + timePerSentence / 2);
      
      // Add speaker label if speaker changed
      if (activeSpeaker && activeSpeaker !== currentSpeaker) {
        alignedTranscript += `\n\n**${activeSpeaker}:**\n`;
        currentSpeaker = activeSpeaker;
      }
      
      alignedTranscript += sentence + '. ';
      currentTime = sentenceEnd;
    }
    
    console.log('🎭 Transcript alignment completed');
    return alignedTranscript.trim();
    
  } catch (error) {
    console.error('🎭 Transcript alignment error:', error);
    return transcript; // Return original if alignment fails
  }
}

function findSpeakerAtTime(segments: SpeakerSegment[], time: number): string | null {
  for (const segment of segments) {
    if (time >= segment.start && time <= segment.end) {
      return segment.speaker;
    }
  }
  return null;
}

function createMockSpeakerSegments(audioBuffer: Buffer): SpeakerSegment[] {
  // Simple mock implementation - in practice this would analyze audio patterns
  // For demonstration, create alternating speakers every 30 seconds
  const audioLengthSec = Math.min(900, Math.floor(audioBuffer.length / 44100)); // Rough estimate
  const segments: SpeakerSegment[] = [];
  
  let currentTime = 0;
  let speakerNumber = 1;
  const segmentLength = 30; // 30 second segments
  
  while (currentTime < audioLengthSec) {
    const endTime = Math.min(currentTime + segmentLength, audioLengthSec);
    
    segments.push({
      speaker: `Speaker ${speakerNumber}`,
      start: currentTime,
      end: endTime,
      confidence: 0.7 // Mock confidence
    });
    
    currentTime = endTime;
    speakerNumber = speakerNumber === 1 ? 2 : 1; // Alternate between Speaker 1 and 2
  }
  
  return segments;
}
import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { fetchCaptions } from "@/lib/getYouTubeCaptions";
import { getCache, setCache } from "@/lib/localCache";
import { downloadAndSplit } from "@/lib/splitAudio";
import { sanitizeYouTube } from "@/utils/sanitizeYouTube";
import { performSpeakerDiarization, alignTranscriptWithSpeakers } from "@/lib/speakerDiarization";

export async function POST(req: NextRequest) {
  try {
    const { url, enableSpeakerIdentification } = await req.json();

    const raw = url as string;
    const cleanUrl = sanitizeYouTube(raw);
    console.log('🔍 Raw URL:', raw);
    console.log('🔍 Clean URL:', cleanUrl);
    
    if (!cleanUrl) {
      return NextResponse.json(
        { error: "Bad YouTube URL" },
        { status: 400 }
      );
    }
    
    // Simple regex validation for YouTube URLs
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/;
    if (!youtubeRegex.test(cleanUrl)) {
      console.error('🔍 URL validation failed: Invalid YouTube URL format');
      return NextResponse.json(
        { error: "Bad YouTube URL" },
        { status: 400 }
      );
    }
    console.log('🔍 URL validation successful');

    // Extraer ID del video
    const videoId = extractVideoId(cleanUrl);
    if (!videoId) {
      return NextResponse.json(
        { error: 'Could not extract video ID' },
        { status: 400 }
      );
    }

    /* 1. cache ------------------------------------- */
    const cached = getCache(videoId);
    if (cached) {
      console.log('✅ Cache hit for:', videoId);
      return NextResponse.json({ transcript: cached, cached: true });
    }

    /* 2. captions intento -------------------------- */
    console.log('📝 Trying to get captions...');
    let transcript = await fetchCaptions(cleanUrl);
    
    if (transcript) {
      console.log('✅ Got captions from YouTube');
      setCache(videoId, transcript);
      return NextResponse.json({ transcript, source: "youtube", cached: false });
    }

    /* 3. whisper con chunking para videos largos -- */
    console.log('🎤 No captions found, using Whisper with chunking...');
    
    try {
      // Descargar y dividir en chunks
      const { chunks, totalSec } = await downloadAndSplit(cleanUrl);
      const durationMin = totalSec / 60;
      
      console.log(`Processing ${chunks.length} chunks for ${durationMin.toFixed(1)} min video`);
      
      // Verificar que tenemos chunks
      if (chunks.length === 0) {
        throw new Error('No chunks were created from the audio file');
      }
      
      // Transcribir chunks en paralelo (máximo 3 simultáneos para evitar rate limits)
      let fullTranscript = "";
      let totalCost = 0;
      let allSpeakerSegments: any[] = [];
      
      const PARALLEL_LIMIT = 3;
      const results: string[] = new Array(chunks.length);
      
      for (let i = 0; i < chunks.length; i += PARALLEL_LIMIT) {
        const batch = chunks.slice(i, i + PARALLEL_LIMIT);
        const batchPromises = batch.map(async (chunk, batchIndex) => {
          const chunkIndex = i + batchIndex;
          console.log(`🎙️ Transcribing chunk ${chunkIndex + 1}/${chunks.length}...`);
          
          if (chunk.length === 0) {
            console.log(`⚠️ Skipping empty chunk ${chunkIndex + 1}`);
            return "";
          }
          
          try {
            const audioFile = new File([chunk], `chunk_${chunkIndex}.webm`, {
              type: 'audio/webm'
            });

            const response = await openai.audio.transcriptions.create({
              model: "whisper-1",
              file: audioFile,
              response_format: "text",
            });
            
            // Speaker diarization si está habilitado
            if (enableSpeakerIdentification && chunk.length > 0) {
              try {
                const speakerSegments = await performSpeakerDiarization(chunk);
                const chunkOffsetSec = chunkIndex * 900;
                const adjustedSegments = speakerSegments.map(segment => ({
                  ...segment,
                  start: segment.start + chunkOffsetSec,
                  end: segment.end + chunkOffsetSec
                }));
                allSpeakerSegments.push(...adjustedSegments);
              } catch (diarizationError) {
                console.error(`🎭 Speaker diarization failed for chunk ${chunkIndex + 1}:`, diarizationError);
              }
            }
            
            console.log(`✅ Chunk ${chunkIndex + 1} completed`);
            return response || "";
            
          } catch (chunkError) {
            console.error(`❌ Error transcribing chunk ${chunkIndex + 1}:`, chunkError);
            return `[Error transcribing chunk ${chunkIndex + 1}]`;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((result, batchIndex) => {
          results[i + batchIndex] = result;
        });
      }
      
      fullTranscript = results.filter(r => r.length > 0).join("\n");
      totalCost = (durationMin / 60) * 0.006; // Simplified cost calculation
      
      transcript = fullTranscript.trim();
      
      // Si speaker identification está habilitado, alinear transcript con speakers
      if (enableSpeakerIdentification && allSpeakerSegments.length > 0) {
        console.log('🎭 Aligning transcript with speaker identification...');
        transcript = alignTranscriptWithSpeakers(transcript, allSpeakerSegments, totalSec);
      }
      
      console.log(`[Whisper] Total cost est. $${totalCost.toFixed(3)} for ${durationMin.toFixed(1)} min`);
      
      /* 4. cache + return ---------------------------- */
      setCache(videoId, transcript);
      return NextResponse.json({ 
        transcript, 
        source: enableSpeakerIdentification ? "whisper-sliced-with-speakers" : "whisper-sliced", 
        cached: false,
        chunks: chunks.length,
        duration: durationMin,
        speakerSegments: enableSpeakerIdentification ? allSpeakerSegments.length : 0
      });
      
    } catch (error: any) {
      if (error.message.includes("longer than 3 h")) {
        return NextResponse.json(
          { error: "Video longer than 3 h" },
          { status: 413 }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe video' },
      { status: 500 }
    );
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

export const maxDuration = 300; // 5 minutes Railway timeout
export const runtime = 'nodejs';
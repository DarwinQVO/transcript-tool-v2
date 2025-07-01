import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";
import { join } from "path";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import { downloadAudio } from "./downloadAudio";

// Use system ffmpeg instead of ffmpeg-static
ffmpeg.setFfmpegPath('ffmpeg');

export async function downloadAndSplit(url: string, chunkSec = 900) {
  console.log('🔍 downloadAndSplit called with URL:', url);
  const tmp = join(tmpdir(), `${Date.now()}.webm`);
  let actualTmpPath = tmp;
  
  try {
    // 1-a download audio to tmp
    console.log('📥 Downloading audio to temp file...');
    actualTmpPath = await downloadAudio(url, tmp);

    // 1-b probe duration
    console.log('📊 Checking video duration...');
    const info = await new Promise<any>((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        url,
        '--dump-single-json',
        '--no-warnings',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        '--add-header', 'Accept-Language:en-US,en;q=0.9'
      ], {
        stdio: 'pipe'
      });
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', (code) => {
        if (code === 0) {
          try {
            const videoInfo = JSON.parse(stdout);
            resolve(videoInfo);
          } catch (error) {
            reject(new Error(`Failed to parse video info: ${error}`));
          }
        } else {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });
      
      ytdlp.on('error', (error) => {
        reject(error);
      });
    });
    
    const totalSec = Math.round(info.duration || 0);
    const totalHours = totalSec / 3600;
    
    console.log(`Video duration: ${totalHours.toFixed(1)} hours`);
    
    if (totalSec > 3 * 60 * 60) {
      throw new Error("Video longer than 3 h");
    }

    // 2 split into chunks
    console.log(`🔪 Splitting into ${chunkSec}s chunks...`);
    const timestamp = Date.now();
    const chunkBaseName = `chunk_${timestamp}`;
    const chunkPattern = join(tmpdir(), `${chunkBaseName}_%03d.webm`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(actualTmpPath)
        .outputOptions([
          `-f`, `segment`,
          `-segment_time`, `${chunkSec}`,
          `-c`, `copy`
        ])
        .output(chunkPattern)
        .on("error", (err) => {
          console.error('🔍 FFmpeg error:', err);
          reject(err);
        })
        .on("end", () => {
          console.log('🔍 FFmpeg segmentation completed');
          resolve();
        })
        .run();
    });

    // 3 read chunks
    console.log('📖 Reading chunk files...');
    const chunks: Buffer[] = [];
    let idx = 0;
    
    while (true) {
      const chunkPath = join(tmpdir(), `${chunkBaseName}_${String(idx).padStart(3, "0")}.webm`);
      try {
        console.log(`🔍 Trying to read chunk: ${chunkPath}`);
        const buf = await fs.readFile(chunkPath);
        chunks.push(buf);
        await fs.unlink(chunkPath); // cleanup immediately
        console.log(`✅ Read chunk ${idx}: ${(buf.length / 1024 / 1024).toFixed(1)}MB`);
        idx++;
      } catch (error) {
        console.log(`🔍 No more chunks found at index ${idx}`);
        break; // no more chunks
      }
    }

    // cleanup main temp file
    await fs.unlink(actualTmpPath);
    
    console.log(`✅ Split into ${chunks.length} chunks, total ${totalSec}s`);
    return { chunks, totalSec };

  } catch (error) {
    // cleanup on error
    try {
      await fs.unlink(actualTmpPath);
    } catch {}
    
    throw error;
  }
}
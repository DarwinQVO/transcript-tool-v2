import { spawn } from 'child_process';
import { readdir, access } from 'fs/promises';
import { join, dirname, basename } from 'path';

export async function downloadAudio(url: string, outputPath: string): Promise<string> {
  console.log('🔍 downloadAudio called with URL:', url);
  console.log('🔍 outputPath:', outputPath);
  
  if (!url) {
    throw new Error('URL is undefined or empty');
  }
  
  try {
    console.log('🔍 Using yt-dlp directly to download audio...');
    
    // Use a template that will be replaced with actual extension
    const outputTemplate = outputPath.replace(/\.[^.]+$/, '.%(ext)s');
    const baseDir = dirname(outputPath);
    const baseNameWithoutExt = basename(outputPath).replace(/\.[^.]+$/, '');
    
    const args = [
      url,
      '--output', outputTemplate,
      '--format', 'bestaudio',
      '--no-check-certificates',
      '--no-warnings',
      '--no-playlist'
    ];
    
    const actualPath = await new Promise<string>((resolve, reject) => {
      const ytdlp = spawn('/opt/homebrew/bin/yt-dlp', args, {
        stdio: 'pipe',
        env: {
          ...process.env,
          PATH: '/opt/homebrew/bin:' + process.env.PATH
        }
      });
      
      let stdout = '';
      let stderr = '';
      
      ytdlp.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      ytdlp.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      ytdlp.on('close', async (code) => {
        if (code === 0) {
          console.log('🔍 Download completed successfully with yt-dlp');
          
          try {
            // Find the actual downloaded file by scanning the directory
            const files = await readdir(baseDir);
            const downloadedFile = files.find(file => file.startsWith(baseNameWithoutExt));
            
            if (downloadedFile) {
              const actualPath = join(baseDir, downloadedFile);
              console.log('🔍 Found downloaded file:', actualPath);
              resolve(actualPath);
            } else {
              // Fallback: try common extensions
              const possibleExtensions = ['webm', 'm4a', 'mp4', 'opus', 'ogg'];
              for (const ext of possibleExtensions) {
                const testPath = join(baseDir, `${baseNameWithoutExt}.${ext}`);
                try {
                  await access(testPath);
                  console.log('🔍 Found file with extension:', ext);
                  resolve(testPath);
                  return;
                } catch {}
              }
              reject(new Error('Could not find downloaded file'));
            }
          } catch (error) {
            console.error('🔍 Error finding downloaded file:', error);
            reject(error);
          }
        } else {
          console.error('🔍 yt-dlp stderr:', stderr);
          console.error('🔍 yt-dlp stdout:', stdout);
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
        }
      });
      
      ytdlp.on('error', (error) => {
        console.error('🔍 yt-dlp spawn error:', error);
        reject(error);
      });
    });
    
    console.log('🔍 Actual downloaded file:', actualPath);
    return actualPath;
    
  } catch (error) {
    console.error('🔍 downloadAudio error:', error);
    throw error;
  }
}
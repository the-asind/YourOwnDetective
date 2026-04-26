import { spawn } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

const VIDEO_TIMEOUT_MS = Number(process.env.VIDEO_TRANSCODE_TIMEOUT_MS || 600_000);
const VIDEO_MAX_SIZE = Number(process.env.VIDEO_MAX_SIZE || 720);
const VIDEO_CRF = process.env.VIDEO_CRF || '34';
const VIDEO_AUDIO_BITRATE = process.env.VIDEO_AUDIO_BITRATE || '64k';

function extensionFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return ext || '.video';
}

async function runFfmpeg(args: string[], timeoutMs = VIDEO_TIMEOUT_MS): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    const stderr: Buffer[] = [];

    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`ffmpeg timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
        return;
      }

      const message = Buffer.concat(stderr).toString('utf8').trim();
      reject(new Error(message || `ffmpeg exited with code ${code}`));
    });
  });
}

export async function processVideo(input: Buffer, originalName: string): Promise<Buffer> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'detective-video-'));
  const inputPath = path.join(tempDir, `source${extensionFor(originalName)}`);
  const outputPath = path.join(tempDir, 'video.webm');

  try {
    await writeFile(inputPath, input);

    await runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-map_metadata',
      '-1',
      '-vf',
      `scale='min(${VIDEO_MAX_SIZE},iw)':'min(${VIDEO_MAX_SIZE},ih)':force_original_aspect_ratio=decrease`,
      '-c:v',
      'libvpx-vp9',
      '-crf',
      VIDEO_CRF,
      '-b:v',
      '0',
      '-deadline',
      'good',
      '-row-mt',
      '1',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'libopus',
      '-b:a',
      VIDEO_AUDIO_BITRATE,
      '-f',
      'webm',
      outputPath,
    ]);

    return readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

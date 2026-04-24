import { spawn } from 'child_process';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';

export interface ProcessedAudio {
  opus: Buffer;
  aac: Buffer;
}

const AUDIO_TIMEOUT_MS = 120_000;
const OPUS_BITRATE = process.env.AUDIO_OPUS_BITRATE || '48k';
const AAC_BITRATE = process.env.AUDIO_AAC_BITRATE || '96k';

function extensionFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return ext || '.audio';
}

async function runFfmpeg(args: string[], timeoutMs = AUDIO_TIMEOUT_MS): Promise<void> {
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

export async function processAudio(input: Buffer, originalName: string): Promise<ProcessedAudio> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'detective-audio-'));
  const inputPath = path.join(tempDir, `source${extensionFor(originalName)}`);
  const opusPath = path.join(tempDir, 'audio.webm');
  const aacPath = path.join(tempDir, 'audio.m4a');

  try {
    await writeFile(inputPath, input);

    await runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-map_metadata',
      '-1',
      '-c:a',
      'libopus',
      '-b:a',
      OPUS_BITRATE,
      '-vbr',
      'on',
      '-application',
      'audio',
      opusPath,
    ]);

    await runFfmpeg([
      '-y',
      '-i',
      inputPath,
      '-vn',
      '-map_metadata',
      '-1',
      '-c:a',
      'aac',
      '-b:a',
      AAC_BITRATE,
      '-movflags',
      '+faststart',
      aacPath,
    ]);

    const [opus, aac] = await Promise.all([readFile(opusPath), readFile(aacPath)]);
    return { opus, aac };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

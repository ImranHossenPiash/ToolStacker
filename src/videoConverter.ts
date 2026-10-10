import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { spawn, execFile } from 'child_process';

export const videoConverterRouter = Router();

// Dedicated temporary folder for video processing
const TEMP_DIR = path.join(os.tmpdir(), 'toolstacker-video-converter');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Memory stores for tracking active conversion jobs and ready downloads
interface ConversionJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'error';
  progress: number;
  stageText: string;
  downloadId?: string;
  filename?: string;
  fileSize?: number;
  duration?: number;
  format?: string;
  bitrate?: string;
  error?: string;
  createdAt: number;
}

interface AudioDownload {
  filePath: string;
  filename: string;
  mimeType: string;
  createdAt: number;
}

const jobs = new Map<string, ConversionJob>();
const downloads = new Map<string, AudioDownload>();

// Periodic cleanup of stale jobs, downloads, and temp files (older than 20 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAgeMs = 20 * 60 * 1000;

  for (const [jobId, job] of jobs.entries()) {
    if (now - job.createdAt > maxAgeMs) {
      jobs.delete(jobId);
    }
  }

  for (const [downloadId, dl] of downloads.entries()) {
    if (now - dl.createdAt > maxAgeMs) {
      if (fs.existsSync(dl.filePath)) {
        try {
          fs.unlinkSync(dl.filePath);
        } catch {
          // ignore cleanup errors
        }
      }
      downloads.delete(downloadId);
    }
  }
}, 5 * 60 * 1000);

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max video size
  },
  fileFilter: (_req, _file, cb) => {
    // Permissive filter so any mobile or desktop upload is accepted
    cb(null, true);
  },
});

/**
 * Probe video duration and check for the presence of audio streams
 */
function probeMediaInfo(filePath: string): Promise<{ duration: number; hasAudio: boolean; audioCodec?: string }> {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      [
        '-v', 'error',
        '-show_entries', 'format=duration:stream=codec_type,codec_name',
        '-of', 'json',
        filePath,
      ],
      { timeout: 10000 },
      (err, stdout) => {
        if (err || !stdout) {
          // In case ffprobe has an issue with exotic containers, assume optimistic fallback
          resolve({ duration: 0, hasAudio: true });
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const duration = parseFloat(data.format?.duration) || 0;
          const streams = data.streams || [];
          const audioStream = streams.find((s: any) => s.codec_type === 'audio');
          const hasAudio = !!audioStream;
          const audioCodec = audioStream ? audioStream.codec_name : undefined;

          resolve({ duration, hasAudio, audioCodec });
        } catch {
          resolve({ duration: 0, hasAudio: true });
        }
      }
    );
  });
}

/**
 * Extract the exact, identical video base filename preserving UTF-8 (Bengali, Unicode, English, spaces)
 */
function extractOriginalBaseName(req: Request, file: Express.Multer.File): string {
  // 1. Check if originalFilename was passed as a dedicated form field (UTF-8 safe from client)
  let candidate = typeof req.body.originalFilename === 'string' ? req.body.originalFilename.trim() : '';

  // 2. If not provided or empty, decode from multer's file.originalname
  if (!candidate && file?.originalname) {
    candidate = file.originalname;
    try {
      // Multer headers default to latin1; if it was UTF-8 multi-byte bytes interpreted as latin1, restore it
      const restored = Buffer.from(file.originalname, 'latin1').toString('utf8');
      if (restored && !restored.includes('\uFFFD') && restored !== file.originalname) {
        candidate = restored;
      }
    } catch {
      // keep candidate as is
    }
  }

  if (!candidate) return 'audio';

  // Strip path directory components if any (security against directory traversal)
  const baseName = candidate.replace(/^.*[\\\/]/, '').trim();

  // Strip extension
  const lastDot = baseName.lastIndexOf('.');
  const nameOnly = lastDot > 0 ? baseName.substring(0, lastDot).trim() : baseName;

  // Only remove characters that are strictly illegal in filesystems or headers: slashes, nulls, control chars
  // Never remove Bengali characters, English letters, spaces, numbers, or valid punctuation!
  const safeName = nameOnly.replace(/[\0\r\n/\\]/g, '').trim();

  return safeName || 'audio';
}

/**
 * Build RFC 5987 & RFC 6266 compliant Content-Disposition header
 * Supports full UTF-8 (Bengali, Unicode) without mangling spaces or character sets
 */
function buildContentDisposition(filename: string): string {
  const cleanFilename = filename.replace(/[\r\n\0]/g, '').trim();

  // RFC 5987 / RFC 6266 encoding for filename*
  const rfc5987Encoded = encodeURIComponent(cleanFilename)
    .replace(/['()]/g, escape)
    .replace(/\*/g, '%2A');

  // ASCII fallback for legacy filename parameter:
  // Strip non-ASCII or double-quotes, but keep spaces, dashes, brackets, etc.
  const asciiOnly = cleanFilename
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/"/g, "'")
    .trim();

  const fallback = asciiOnly && asciiOnly.length > 4
    ? asciiOnly
    : ('audio' + (cleanFilename.toLowerCase().endsWith('.wav') ? '.wav' : '.mp3'));

  return `attachment; filename="${fallback}"; filename*=UTF-8''${rfc5987Encoded}`;
}

/**
 * POST /api/convert-video-to-audio
 * Accepts multipart/form-data:
 * - file: video file
 * - originalFilename: original UTF-8 filename (optional explicit parameter)
 * - format: 'mp3' | 'wav'
 * - bitrate: '320k' | '192k' | '128k'
 * - startTime: number (seconds)
 * - endTime: number (seconds)
 * - jobId: string (client-generated tracker)
 */
videoConverterRouter.post('/api/convert-video-to-audio', (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum supported size is 500 MB.'
        : err.message || 'File upload failed.';
      return res.status(400).json({ success: false, error: message });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No video file received. Please select a valid video.' });
    }

    const jobId = (req.body.jobId as string) || crypto.randomUUID();
    const requestedFormat = ((req.body.format as string) || 'mp3').toLowerCase() === 'wav' ? 'wav' : 'mp3';
    let bitrate = (req.body.bitrate as string) || '320k';
    if (!['320k', '192k', '128k'].includes(bitrate)) {
      bitrate = '320k';
    }

    const startTime = req.body.startTime ? Math.max(0, parseFloat(req.body.startTime)) : 0;
    const endTime = req.body.endTime ? Math.max(0, parseFloat(req.body.endTime)) : 0;

    // Register job state
    const job: ConversionJob = {
      jobId,
      status: 'processing',
      progress: 10,
      stageText: 'Inspecting video & audio streams...',
      format: requestedFormat,
      bitrate: requestedFormat === 'mp3' ? bitrate : 'Lossless PCM',
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);

    const inputPath = file.path;
    const cleanBaseName = extractOriginalBaseName(req, file);
    const outputExtension = requestedFormat === 'wav' ? '.wav' : '.mp3';
    const outputFilename = `${cleanBaseName}${outputExtension}`;
    const outputId = crypto.randomUUID();
    const outputPath = path.join(TEMP_DIR, `output_${outputId}${outputExtension}`);

    try {
      // 1. Probe audio stream and total duration
      const mediaInfo = await probeMediaInfo(inputPath);

      if (!mediaInfo.hasAudio) {
        if (fs.existsSync(inputPath)) {
          try { fs.unlinkSync(inputPath); } catch {}
        }
        job.status = 'error';
        job.error = 'This video does not contain an audio track (ভিডিওটিতে কোনো সাউন্ড বা অডিও ট্র্যাক পাওয়া যায়নি)। Please upload a video with audio.';
        return res.status(400).json({ success: false, error: job.error, noAudio: true });
      }

      const totalDuration = mediaInfo.duration;
      let targetDurationSec = totalDuration;

      if (endTime > 0 && endTime > startTime) {
        targetDurationSec = endTime - startTime;
      } else if (startTime > 0 && totalDuration > startTime) {
        targetDurationSec = totalDuration - startTime;
      }

      job.progress = 25;
      job.stageText = `Extracting audio (${requestedFormat.toUpperCase()} ${requestedFormat === 'mp3' ? bitrate + 'bps' : 'PCM'})...`;

      // 2. Build bulletproof FFmpeg command arguments
      const ffmpegArgs: string[] = ['-y'];

      // Always pass input first
      ffmpegArgs.push('-i', inputPath);

      // Seek start if specified
      if (startTime > 0) {
        ffmpegArgs.push('-ss', startTime.toFixed(3));
      }

      // Duration or end if specified
      if (endTime > 0 && endTime > startTime) {
        const durationSegment = endTime - startTime;
        ffmpegArgs.push('-t', durationSegment.toFixed(3));
      } else if (endTime > 0 && startTime === 0) {
        ffmpegArgs.push('-t', endTime.toFixed(3));
      }

      // Drop video, map first audio stream, downmix to stereo for universal player compatibility
      ffmpegArgs.push('-vn', '-map', '0:a:0?', '-ac', '2');

      // Audio encoding options
      if (requestedFormat === 'wav') {
        ffmpegArgs.push('-acodec', 'pcm_s16le', '-ar', '44100');
      } else {
        ffmpegArgs.push(
          '-acodec', 'libmp3lame',
          '-b:a', bitrate,
          '-ar', '44100',
          '-id3v2_version', '3'
        );
      }

      // Progress reporting
      ffmpegArgs.push('-progress', 'pipe:1');
      ffmpegArgs.push(outputPath);

      const targetDurationUs = targetDurationSec > 0 ? targetDurationSec * 1000000 : 1000000;

      // 3. Spawn FFmpeg process
      const ff = spawn('ffmpeg', ffmpegArgs);

      ff.stdout.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('out_time_us=')) {
            const currentUs = parseInt(line.split('=')[1], 10);
            if (!isNaN(currentUs) && targetDurationUs > 0) {
              const calcPct = Math.min(97, Math.max(25, Math.round((currentUs / targetDurationUs) * 72) + 25));
              job.progress = calcPct;
              job.stageText = `Converting: ${calcPct}% complete...`;
            }
          }
        }
      });

      let ffmpegErrorOutput = '';
      ff.stderr.on('data', (chunk: Buffer) => {
        ffmpegErrorOutput += chunk.toString();
      });

      ff.on('close', (code) => {
        // Clean up input video immediately to protect user privacy
        if (fs.existsSync(inputPath)) {
          try {
            fs.unlinkSync(inputPath);
          } catch {}
        }

        if (code !== 0 || !fs.existsSync(outputPath)) {
          job.status = 'error';
          console.error('FFmpeg conversion failed. Error details:', ffmpegErrorOutput.slice(-500));
          job.error = 'Failed to extract audio track from video. The audio codec may be unsupported or corrupted.';
          return res.status(500).json({
            success: false,
            error: job.error,
            details: ffmpegErrorOutput.slice(-400),
          });
        }

        const stat = fs.statSync(outputPath);
        if (stat.size === 0) {
          try { fs.unlinkSync(outputPath); } catch {}
          job.status = 'error';
          job.error = 'Extracted audio was empty (0 bytes).';
          return res.status(500).json({ success: false, error: job.error });
        }

        const mimeType = requestedFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';

        downloads.set(outputId, {
          filePath: outputPath,
          filename: outputFilename,
          mimeType,
          createdAt: Date.now(),
        });

        job.status = 'completed';
        job.progress = 100;
        job.stageText = 'Conversion completed successfully!';
        job.downloadId = outputId;
        job.filename = outputFilename;
        job.fileSize = stat.size;
        job.duration = targetDurationSec > 0 ? targetDurationSec : totalDuration;

        const downloadUrl = `/api/download-audio/${outputId}/${encodeURIComponent(outputFilename)}`;

        return res.json({
          success: true,
          jobId,
          downloadId: outputId,
          downloadUrl,
          filename: outputFilename,
          fileSize: stat.size,
          duration: job.duration,
          format: requestedFormat,
          bitrate: requestedFormat === 'mp3' ? bitrate : '1411 kbps (Lossless)',
        });
      });

      ff.on('error', (procErr) => {
        if (fs.existsSync(inputPath)) {
          try { fs.unlinkSync(inputPath); } catch {}
        }
        job.status = 'error';
        job.error = `Conversion system error: ${procErr.message}`;
        return res.status(500).json({ success: false, error: job.error });
      });

    } catch (procErr: any) {
      if (fs.existsSync(inputPath)) {
        try { fs.unlinkSync(inputPath); } catch {}
      }
      job.status = 'error';
      job.error = procErr?.message || 'Unexpected conversion error.';
      return res.status(500).json({ success: false, error: job.error });
    }
  });
});

/**
 * GET /api/convert-progress/:jobId
 * Real-time progress check
 */
videoConverterRouter.get('/api/convert-progress/:jobId', (req: Request, res: Response) => {
  const jobId = req.params.jobId;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    stageText: job.stageText,
    downloadId: job.downloadId,
    downloadUrl: job.downloadId && job.filename ? `/api/download-audio/${job.downloadId}/${encodeURIComponent(job.filename)}` : undefined,
    filename: job.filename,
    fileSize: job.fileSize,
    duration: job.duration,
    format: job.format,
    bitrate: job.bitrate,
    error: job.error,
  });
});

/**
 * GET /api/download-audio/:downloadId/:filename?
 * Direct streaming download of converted audio
 */
videoConverterRouter.get('/api/download-audio/:downloadId/:filename?', (req: Request, res: Response) => {
  const downloadId = req.params.downloadId;
  const dl = downloads.get(downloadId);

  if (!dl || !fs.existsSync(dl.filePath)) {
    return res.status(404).send('Audio file not found or expired. Please convert your video again.');
  }

  res.setHeader('Content-Type', dl.mimeType);
  res.setHeader('Content-Disposition', buildContentDisposition(dl.filename));
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const stream = fs.createReadStream(dl.filePath);
  stream.pipe(res);

  stream.on('error', (err) => {
    console.error('Download stream error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error streaming download.');
    }
  });

  // Automatically delete the temporary file 3 minutes after being downloaded
  res.on('finish', () => {
    setTimeout(() => {
      if (fs.existsSync(dl.filePath)) {
        try {
          fs.unlinkSync(dl.filePath);
        } catch {}
      }
      downloads.delete(downloadId);
    }, 3 * 60 * 1000);
  });
});

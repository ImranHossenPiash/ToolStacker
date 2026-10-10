/**
 * Video to MP3 & Audio Converter
 * Mobile-First, Touch-Optimized Client Controller
 * Pure Clean Architecture • Dual-Engine (Server FFmpeg + Client-Side Web Audio Fallback)
 */

import { initTheme, initPWA } from './main.js';
import { Mp3Encoder } from '@breezystack/lamejs';

// Application State
const state = {
  selectedFile: null,
  videoBlobUrl: null,
  videoDuration: 0,
  startTime: 0,
  endTime: 0,
  selectedFormat: 'mp3',
  selectedBitrate: '320k',
  jobId: null,
  convertedResult: null,
  progressInterval: null,
  timerInterval: null,
  startTimeEpoch: 0,
  fallbackBlobUrl: null,
};

// DOM Element References
let dropZone;
let fileInput;
let uploadStage;
let configStage;
let progressStage;
let resultStage;
let previewVideo;
let videoPlayBtn;
let playBtnIcon;
let currentTimeDisplay;
let totalTimeDisplay;
let videoFilename;
let videoFilesize;
let videoDurationLabel;
let trimDurationBadge;
let startSlider;
let endSlider;
let startTimeText;
let endTimeText;
let trimHighlight;
let waveformContainer;
let formatMp3Btn;
let formatWavBtn;
let bitrateContainer;
let bitrateBadge;
let bitrateChoices;
let convertStartBtn;
let convertBtnText;
let progressBarFill;
let progressPercent;
let progressTimer;
let progressStatusText;
let resultFilename;
let resultFormatBadge;
let resultBitrate;
let resultFilesize;
let resultDuration;
let resultAudioPlayer;
let audioPlayerTime;
let downloadCtaBtn;
let convertAnotherBtn;
let changeFileBtn;
let alertBanner;
let alertMessage;
let alertClose;

/**
 * Format bytes to human readable format (MB, KB)
 */
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds, includeSubseconds = false) {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const sub = Math.floor((seconds % 1) * 10);

  const pad = (n) => String(n).padStart(2, '0');

  let str = `${pad(mins)}:${pad(secs)}`;
  if (hrs > 0) {
    str = `${pad(hrs)}:${str}`;
  }
  if (includeSubseconds) {
    str += `.${sub}`;
  }
  return str;
}

/**
 * Show error or information alert
 */
function showAlert(message, type = 'error') {
  if (!alertBanner) return;
  alertBanner.classList.remove('hidden', 'bg-red-50', 'text-red-800', 'border-red-200', 'dark:bg-red-950/60', 'dark:text-red-300', 'dark:border-red-900', 'bg-blue-50', 'text-blue-800', 'border-blue-200', 'dark:bg-blue-950/60', 'dark:text-blue-300');

  if (type === 'error') {
    alertBanner.classList.add('bg-red-50', 'text-red-800', 'border-red-200', 'dark:bg-red-950/60', 'dark:text-red-300', 'dark:border-red-900');
  } else {
    alertBanner.classList.add('bg-blue-50', 'text-blue-800', 'border-blue-200', 'dark:bg-blue-950/60', 'dark:text-blue-300');
  }

  alertMessage.textContent = message;
  alertBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAlert() {
  if (alertBanner) {
    alertBanner.classList.add('hidden');
  }
}

/**
 * Populate simulated audio waveform visualizer bars
 */
function buildWaveformBars() {
  if (!waveformContainer) return;

  const existingHighlight = document.getElementById('trim-highlight');
  waveformContainer.innerHTML = '';
  if (existingHighlight) {
    waveformContainer.appendChild(existingHighlight);
  } else {
    const hl = document.createElement('div');
    hl.id = 'trim-highlight';
    hl.className = 'absolute top-0 bottom-0 bg-blue-500/25 dark:bg-blue-500/35 border-x-2 border-blue-600 dark:border-blue-400 pointer-events-none transition-all';
    waveformContainer.appendChild(hl);
    trimHighlight = hl;
  }

  const totalBars = 48;
  for (let i = 0; i < totalBars; i++) {
    const bar = document.createElement('div');
    bar.className = 'waveform-bar flex-1 bg-neutral-400/80 dark:bg-neutral-600 rounded-full';
    const seed = Math.sin(i * 0.45) * 0.4 + Math.sin(i * 0.8) * 0.3 + 0.35;
    const heightPercent = Math.max(18, Math.min(94, Math.round(seed * 100)));
    bar.style.height = `${heightPercent}%`;
    bar.style.minWidth = '2px';
    bar.style.maxWidth = '4px';
    waveformContainer.appendChild(bar);
  }
}

/**
 * Update trim highlight bounds and labels
 */
function updateTrimUI() {
  if (!state.videoDuration || state.videoDuration <= 0) return;

  const total = state.videoDuration;
  const startPct = Math.max(0, Math.min(100, (state.startTime / total) * 100));
  const endPct = Math.max(0, Math.min(100, (state.endTime / total) * 100));
  const widthPct = Math.max(1, endPct - startPct);

  if (trimHighlight) {
    trimHighlight.style.left = `${startPct}%`;
    trimHighlight.style.width = `${widthPct}%`;
  }

  if (startSlider) {
    startSlider.value = state.startTime.toFixed(1);
    startSlider.max = total.toFixed(1);
  }
  if (endSlider) {
    endSlider.value = state.endTime.toFixed(1);
    endSlider.max = total.toFixed(1);
  }

  if (startTimeText) startTimeText.textContent = formatTime(state.startTime, true);
  if (endTimeText) endTimeText.textContent = formatTime(state.endTime, true);

  const segmentDuration = Math.max(0, state.endTime - state.startTime);
  if (trimDurationBadge) {
    if (Math.abs(segmentDuration - total) < 0.2) {
      trimDurationBadge.textContent = `Extracting: Full Video (${formatTime(total)})`;
    } else {
      trimDurationBadge.textContent = `Extracting: ${formatTime(segmentDuration)} segment`;
    }
  }

  updateConvertBtnText();
}

/**
 * Update Convert CTA Button Text
 */
function updateConvertBtnText() {
  if (!convertBtnText) return;
  if (state.selectedFormat === 'wav') {
    convertBtnText.textContent = 'Convert to WAV (Lossless PCM)';
  } else {
    convertBtnText.textContent = `Convert to MP3 (${state.selectedBitrate}bps)`;
  }
}

/**
 * Handle new video file selection
 */
function handleFileSelection(file) {
  if (!file) return;

  // 500 MB limit
  if (file.size > 500 * 1024 * 1024) {
    showAlert(`File is too large (${formatBytes(file.size)}). Maximum supported file size is 500 MB.`);
    return;
  }

  hideAlert();
  state.selectedFile = file;

  if (state.videoBlobUrl) {
    URL.revokeObjectURL(state.videoBlobUrl);
  }

  state.videoBlobUrl = URL.createObjectURL(file);

  if (videoFilename) videoFilename.textContent = file.name;
  if (videoFilesize) videoFilesize.textContent = formatBytes(file.size);
  if (videoDurationLabel) videoDurationLabel.textContent = 'Reading duration...';

  if (previewVideo) {
    previewVideo.src = state.videoBlobUrl;
    previewVideo.load();
  }

  buildWaveformBars();

  uploadStage.classList.add('hidden');
  resultStage.classList.add('hidden');
  progressStage.classList.add('hidden');
  configStage.classList.remove('hidden');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Switch selected audio format (MP3 vs WAV)
 */
function setAudioFormat(format) {
  state.selectedFormat = format;

  if (format === 'wav') {
    formatWavBtn.classList.add('bg-blue-50', 'dark:bg-blue-950/50', 'border-blue-600', 'text-blue-700', 'dark:text-blue-300', 'shadow-xs');
    formatWavBtn.classList.remove('bg-white', 'dark:bg-neutral-900', 'border-neutral-200', 'dark:border-neutral-800', 'text-neutral-700', 'dark:text-neutral-300');

    formatMp3Btn.classList.remove('bg-blue-50', 'dark:bg-blue-950/50', 'border-blue-600', 'text-blue-700', 'dark:text-blue-300', 'shadow-xs');
    formatMp3Btn.classList.add('bg-white', 'dark:bg-neutral-900', 'border-neutral-200', 'dark:border-neutral-800', 'text-neutral-700', 'dark:text-neutral-300');

    if (bitrateContainer) {
      bitrateContainer.classList.add('opacity-40', 'pointer-events-none');
    }
    if (bitrateBadge) {
      bitrateBadge.textContent = 'Lossless PCM 1411k';
    }
  } else {
    formatMp3Btn.classList.add('bg-blue-50', 'dark:bg-blue-950/50', 'border-blue-600', 'text-blue-700', 'dark:text-blue-300', 'shadow-xs');
    formatMp3Btn.classList.remove('bg-white', 'dark:bg-neutral-900', 'border-neutral-200', 'dark:border-neutral-800', 'text-neutral-700', 'dark:text-neutral-300');

    formatWavBtn.classList.remove('bg-blue-50', 'dark:bg-blue-950/50', 'border-blue-600', 'text-blue-700', 'dark:text-blue-300', 'shadow-xs');
    formatWavBtn.classList.add('bg-white', 'dark:bg-neutral-900', 'border-neutral-200', 'dark:border-neutral-800', 'text-neutral-700', 'dark:text-neutral-300');

    if (bitrateContainer) {
      bitrateContainer.classList.remove('opacity-40', 'pointer-events-none');
    }
    setBitrate(state.selectedBitrate || '320k');
  }

  updateConvertBtnText();
}

/**
 * Switch MP3 Bitrate
 */
function setBitrate(bitrate) {
  state.selectedBitrate = bitrate;

  bitrateChoices.forEach((btn) => {
    const isCurrent = btn.dataset.bitrate === bitrate;
    if (isCurrent) {
      btn.classList.add('bg-blue-50', 'dark:bg-blue-950/50', 'border-blue-600', 'text-blue-700', 'dark:text-blue-300', 'shadow-xs');
      btn.classList.remove('bg-white', 'dark:bg-neutral-900', 'border-neutral-200', 'dark:border-neutral-800', 'text-neutral-700', 'dark:text-neutral-300');
    } else {
      btn.classList.remove('bg-blue-50', 'dark:bg-blue-950/50', 'border-blue-600', 'text-blue-700', 'dark:text-blue-300', 'shadow-xs');
      btn.classList.add('bg-white', 'dark:bg-neutral-900', 'border-neutral-200', 'dark:border-neutral-800', 'text-neutral-700', 'dark:text-neutral-300');
    }
  });

  if (bitrateBadge) {
    if (bitrate === '320k') bitrateBadge.textContent = '320 kbps (Studio Best)';
    else if (bitrate === '192k') bitrateBadge.textContent = '192 kbps (Standard)';
    else bitrateBadge.textContent = '128 kbps (Compact)';
  }

  updateConvertBtnText();
}

/**
 * CLIENT-SIDE FALLBACK: Encode AudioBuffer to lossless WAV Blob
 */
function encodeAudioBufferToWav(buffer, startSec = 0, endSec = 0) {
  const sampleRate = buffer.sampleRate;
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = endSec > startSec ? Math.min(buffer.length, Math.floor(endSec * sampleRate)) : buffer.length;
  const numSamples = Math.max(0, endSample - startSample);

  const blockAlign = numChannels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataByteCount = numSamples * blockAlign;
  const bufferLength = 44 + dataByteCount;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteCount, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataByteCount, true);

  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = startSample; i < endSample; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * CLIENT-SIDE FALLBACK: Encode AudioBuffer to MP3 Blob using @breezystack/lamejs
 */
function encodeAudioBufferToMp3(buffer, bitrateKbps = 320, startSec = 0, endSec = 0) {
  const sampleRate = buffer.sampleRate;
  const numChannels = Math.min(2, buffer.numberOfChannels);
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = endSec > startSec ? Math.min(buffer.length, Math.floor(endSec * sampleRate)) : buffer.length;
  const numSamples = Math.max(0, endSample - startSample);

  const encoder = new Mp3Encoder(numChannels, sampleRate, parseInt(bitrateKbps, 10) || 320);

  const leftChannelRaw = buffer.getChannelData(0);
  const rightChannelRaw = numChannels > 1 ? buffer.getChannelData(1) : leftChannelRaw;

  // Convert Float32 to Int16
  const leftInt16 = new Int16Array(numSamples);
  const rightInt16 = new Int16Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const srcIndex = startSample + i;
    const l = Math.max(-1, Math.min(1, leftChannelRaw[srcIndex]));
    const r = Math.max(-1, Math.min(1, rightChannelRaw[srcIndex]));
    leftInt16[i] = l < 0 ? l * 0x8000 : l * 0x7FFF;
    rightInt16[i] = r < 0 ? r * 0x8000 : r * 0x7FFF;
  }

  const mp3Data = [];
  const chunkSize = 1152;

  for (let i = 0; i < numSamples; i += chunkSize) {
    const leftChunk = leftInt16.subarray(i, i + chunkSize);
    const rightChunk = rightInt16.subarray(i, i + chunkSize);
    let mp3buf;
    if (numChannels === 1) {
      mp3buf = encoder.encodeBuffer(leftChunk);
    } else {
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    }
    if (mp3buf && mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const flushBuf = encoder.flush();
  if (flushBuf && flushBuf.length > 0) {
    mp3Data.push(flushBuf);
  }

  return new Blob(mp3Data, { type: 'audio/mpeg' });
}

/**
 * CLIENT-SIDE FALLBACK: Extract audio using browser Web Audio API
 */
async function extractAudioClientSide() {
  if (progressStatusText) {
    progressStatusText.textContent = 'Processing audio locally in browser...';
  }
  if (progressBarFill) progressBarFill.style.width = '45%';
  if (progressPercent) progressPercent.textContent = '45%';

  try {
    const arrayBuffer = await state.selectedFile.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    const audioCtx = new AudioContextClass();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    if (!audioBuffer || audioBuffer.numberOfChannels === 0 || audioBuffer.length === 0) {
      throw new Error('This video does not contain an audio track (ভিডিওটিতে কোনো অডিও বা সাউন্ড নেই)। Please upload a video with sound.');
    }

    if (progressBarFill) progressBarFill.style.width = '75%';
    if (progressPercent) progressPercent.textContent = '75%';
    if (progressStatusText) {
      progressStatusText.textContent = `Encoding ${state.selectedFormat.toUpperCase()} audio...`;
    }

    let audioBlob;
    const isTrimmed = state.startTime > 0 || (state.endTime > 0 && state.endTime < audioBuffer.duration - 0.2);
    const startSec = isTrimmed ? state.startTime : 0;
    const endSec = isTrimmed ? state.endTime : audioBuffer.duration;
    const finalDuration = Math.max(0, endSec - startSec);

    if (state.selectedFormat === 'wav') {
      audioBlob = encodeAudioBufferToWav(audioBuffer, startSec, endSec);
    } else {
      const kbps = parseInt(state.selectedBitrate, 10) || 320;
      audioBlob = encodeAudioBufferToMp3(audioBuffer, kbps, startSec, endSec);
    }

    if (state.fallbackBlobUrl) {
      URL.revokeObjectURL(state.fallbackBlobUrl);
    }
    state.fallbackBlobUrl = URL.createObjectURL(audioBlob);

    const rawName = state.selectedFile ? state.selectedFile.name : 'audio';
    const lastDot = rawName.lastIndexOf('.');
    const baseName = lastDot > 0 ? rawName.substring(0, lastDot).trim() : rawName.trim();
    const ext = state.selectedFormat === 'wav' ? '.wav' : '.mp3';
    const outputFilename = `${baseName || 'audio'}${ext}`;

    onConversionSuccess({
      success: true,
      downloadUrl: state.fallbackBlobUrl,
      filename: outputFilename,
      fileSize: audioBlob.size,
      duration: finalDuration > 0 ? finalDuration : audioBuffer.duration,
      format: state.selectedFormat,
      bitrate: state.selectedFormat === 'mp3' ? state.selectedBitrate : 'Lossless PCM',
    });
  } catch (clientErr) {
    console.error('Client-side audio extraction error:', clientErr);
    onConversionError(clientErr.message || 'Failed to extract audio from video.');
  }
}

/**
 * Start Video to Audio Conversion
 */
function startConversion() {
  if (!state.selectedFile) {
    showAlert('Please select a video file first.');
    return;
  }

  hideAlert();

  if (previewVideo) {
    previewVideo.pause();
  }

  state.jobId = 'conv_' + Math.random().toString(36).substring(2, 10) + Date.now();
  state.startTimeEpoch = Date.now();

  configStage.classList.add('hidden');
  resultStage.classList.add('hidden');
  progressStage.classList.remove('hidden');

  if (progressBarFill) progressBarFill.style.width = '8%';
  if (progressPercent) progressPercent.textContent = '8%';
  if (progressStatusText) progressStatusText.textContent = 'Uploading video file...';

  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - state.startTimeEpoch) / 1000);
    if (progressTimer) progressTimer.textContent = formatTime(elapsedSec);
  }, 1000);

  const formData = new FormData();
  formData.append('file', state.selectedFile);
  formData.append('originalFilename', state.selectedFile.name);
  formData.append('jobId', state.jobId);
  formData.append('format', state.selectedFormat);
  formData.append('bitrate', state.selectedBitrate);

  const isCustomTrim = state.startTime > 0 || (state.videoDuration > 0 && state.endTime < state.videoDuration - 0.2);
  if (isCustomTrim) {
    formData.append('startTime', state.startTime.toFixed(2));
    formData.append('endTime', state.endTime.toFixed(2));
  }

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/convert-video-to-audio');

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const uploadPct = Math.round((event.loaded / event.total) * 30) + 5;
      if (progressBarFill) progressBarFill.style.width = `${uploadPct}%`;
      if (progressPercent) progressPercent.textContent = `${uploadPct}%`;
      if (progressStatusText) {
        progressStatusText.textContent = `Uploading video: ${Math.round((event.loaded / event.total) * 100)}% (${formatBytes(event.loaded)} / ${formatBytes(event.total)})`;
      }
    }
  };

  let pollingInterval = null;
  const startPollingProgress = () => {
    pollingInterval = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/convert-progress/${state.jobId}`);
        if (!pollRes.ok) return;
        const jobData = await pollRes.json();

        if (jobData.progress && progressBarFill) {
          const currentProgress = Math.max(parseInt(progressBarFill.style.width, 10) || 35, jobData.progress);
          progressBarFill.style.width = `${currentProgress}%`;
          if (progressPercent) progressPercent.textContent = `${currentProgress}%`;
        }
        if (jobData.stageText && progressStatusText) {
          progressStatusText.textContent = jobData.stageText;
        }

        if (jobData.status === 'completed' && jobData.downloadId) {
          clearInterval(pollingInterval);
        } else if (jobData.status === 'error') {
          clearInterval(pollingInterval);
        }
      } catch {
        // ignore polling network drops
      }
    }, 400);
  };

  xhr.onload = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    if (state.timerInterval) clearInterval(state.timerInterval);

    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        const response = JSON.parse(xhr.responseText);
        if (response.success) {
          onConversionSuccess(response);
          return;
        }
        throw new Error(response.error || 'Conversion failed.');
      } catch (err) {
        console.warn('Server conversion response error, attempting client-side fallback:', err);
        extractAudioClientSide();
      }
    } else {
      let errorMsg = '';
      let isNoAudio = false;
      try {
        const errorJson = JSON.parse(xhr.responseText);
        errorMsg = errorJson.error || '';
        isNoAudio = !!errorJson.noAudio;
      } catch {}

      // If the server explicitly confirmed the video has no audio track, alert immediately
      if (isNoAudio || errorMsg.includes('audio track') || errorMsg.includes('কোনো অডিও')) {
        onConversionError(errorMsg);
        return;
      }

      // Otherwise automatically recover using client-side in-browser Web Audio extraction!
      console.warn('Server error:', errorMsg, 'Falling back to client-side Web Audio...');
      extractAudioClientSide();
    }
  };

  xhr.onerror = () => {
    if (pollingInterval) clearInterval(pollingInterval);
    if (state.timerInterval) clearInterval(state.timerInterval);
    console.warn('Network upload drop, auto-recovering with client-side audio extraction...');
    extractAudioClientSide();
  };

  xhr.upload.onload = () => {
    if (progressStatusText) progressStatusText.textContent = 'Extracting audio & encoding...';
    startPollingProgress();
  };

  xhr.send(formData);
}

/**
 * Handle successful conversion
 */
function onConversionSuccess(result) {
  state.convertedResult = result;

  if (progressBarFill) progressBarFill.style.width = '100%';
  if (progressPercent) progressPercent.textContent = '100%';

  setTimeout(() => {
    progressStage.classList.add('hidden');
    configStage.classList.add('hidden');
    resultStage.classList.remove('hidden');

    if (resultFilename) {
      resultFilename.textContent = result.filename;
      resultFilename.title = result.filename;
    }
    if (resultFormatBadge) resultFormatBadge.textContent = (result.format || state.selectedFormat).toUpperCase();
    if (resultBitrate) resultBitrate.textContent = result.bitrate || (state.selectedFormat === 'mp3' ? `${state.selectedBitrate}bps` : 'Lossless');
    if (resultFilesize) resultFilesize.textContent = formatBytes(result.fileSize);
    if (resultDuration) resultDuration.textContent = formatTime(result.duration || state.videoDuration);

    if (resultAudioPlayer) {
      resultAudioPlayer.src = result.downloadUrl;
      resultAudioPlayer.load();

      resultAudioPlayer.ontimeupdate = () => {
        if (audioPlayerTime) {
          audioPlayerTime.textContent = `${formatTime(resultAudioPlayer.currentTime)} / ${formatTime(resultAudioPlayer.duration || result.duration)}`;
        }
      };
    }

    if (downloadCtaBtn) {
      downloadCtaBtn.href = result.downloadUrl;
      downloadCtaBtn.setAttribute('download', result.filename);
      const btnLabel = document.getElementById('download-btn-text');
      if (btnLabel) {
        btnLabel.textContent = `Download ${result.format.toUpperCase()} (${formatBytes(result.fileSize)})`;
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, 350);
}

/**
 * Handle conversion failure with clear messages
 */
function onConversionError(errorMessage) {
  if (state.timerInterval) clearInterval(state.timerInterval);
  progressStage.classList.add('hidden');
  configStage.classList.remove('hidden');
  showAlert(errorMessage || 'Failed to convert video. Please ensure the video contains a valid audio track and try again.');
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Reset application to upload stage
 */
function resetApplication() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  if (state.videoBlobUrl) URL.revokeObjectURL(state.videoBlobUrl);
  if (state.fallbackBlobUrl) URL.revokeObjectURL(state.fallbackBlobUrl);

  if (previewVideo) {
    previewVideo.pause();
    previewVideo.src = '';
  }
  if (resultAudioPlayer) {
    resultAudioPlayer.pause();
    resultAudioPlayer.src = '';
  }

  state.selectedFile = null;
  state.videoBlobUrl = null;
  state.fallbackBlobUrl = null;
  state.videoDuration = 0;
  state.startTime = 0;
  state.endTime = 0;
  state.convertedResult = null;

  hideAlert();
  if (fileInput) fileInput.value = '';

  resultStage.classList.add('hidden');
  configStage.classList.add('hidden');
  progressStage.classList.add('hidden');
  uploadStage.classList.remove('hidden');

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Initialize DOM Listeners and App Lifecycle
 */
export function initVideoConverter() {
  dropZone = document.getElementById('drop-zone');
  fileInput = document.getElementById('file-input');
  uploadStage = document.getElementById('upload-stage');
  configStage = document.getElementById('config-stage');
  progressStage = document.getElementById('progress-stage');
  resultStage = document.getElementById('result-stage');
  previewVideo = document.getElementById('preview-video');
  videoPlayBtn = document.getElementById('video-play-btn');
  playBtnIcon = document.getElementById('play-btn-icon');
  currentTimeDisplay = document.getElementById('current-time-display');
  totalTimeDisplay = document.getElementById('total-time-display');
  videoFilename = document.getElementById('video-filename');
  videoFilesize = document.getElementById('video-filesize');
  videoDurationLabel = document.getElementById('video-duration-label');
  trimDurationBadge = document.getElementById('trim-duration-badge');
  startSlider = document.getElementById('start-slider');
  endSlider = document.getElementById('end-slider');
  startTimeText = document.getElementById('start-time-text');
  endTimeText = document.getElementById('end-time-text');
  trimHighlight = document.getElementById('trim-highlight');
  waveformContainer = document.getElementById('waveform-container');
  formatMp3Btn = document.getElementById('format-mp3-btn');
  formatWavBtn = document.getElementById('format-wav-btn');
  bitrateContainer = document.getElementById('bitrate-container');
  bitrateBadge = document.getElementById('bitrate-badge');
  bitrateChoices = document.querySelectorAll('.bitrate-choice');
  convertStartBtn = document.getElementById('convert-start-btn');
  convertBtnText = document.getElementById('convert-btn-text');
  progressBarFill = document.getElementById('progress-bar-fill');
  progressPercent = document.getElementById('progress-percent');
  progressTimer = document.getElementById('progress-timer');
  progressStatusText = document.getElementById('progress-status-text');
  resultFilename = document.getElementById('result-filename');
  resultFormatBadge = document.getElementById('result-format-badge');
  resultBitrate = document.getElementById('result-bitrate');
  resultFilesize = document.getElementById('result-filesize');
  resultDuration = document.getElementById('result-duration');
  resultAudioPlayer = document.getElementById('result-audio-player');
  audioPlayerTime = document.getElementById('audio-player-time');
  downloadCtaBtn = document.getElementById('download-cta-btn');
  convertAnotherBtn = document.getElementById('convert-another-btn');
  changeFileBtn = document.getElementById('change-file-btn');
  alertBanner = document.getElementById('alert-banner');
  alertMessage = document.getElementById('alert-message');
  alertClose = document.getElementById('alert-close');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/30');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/30');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  });

  if (changeFileBtn) {
    changeFileBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }

  if (previewVideo) {
    previewVideo.addEventListener('loadedmetadata', () => {
      state.videoDuration = previewVideo.duration || 0;
      state.startTime = 0;
      state.endTime = state.videoDuration;

      if (videoDurationLabel) videoDurationLabel.textContent = formatTime(state.videoDuration);
      if (totalTimeDisplay) totalTimeDisplay.textContent = formatTime(state.videoDuration);
      if (currentTimeDisplay) currentTimeDisplay.textContent = '00:00';

      updateTrimUI();
    });

    previewVideo.addEventListener('timeupdate', () => {
      if (currentTimeDisplay) {
        currentTimeDisplay.textContent = formatTime(previewVideo.currentTime);
      }
      if (state.endTime > 0 && previewVideo.currentTime >= state.endTime) {
        previewVideo.pause();
        previewVideo.currentTime = state.startTime;
      }
    });

    previewVideo.addEventListener('play', () => {
      if (playBtnIcon) {
        playBtnIcon.setAttribute('data-lucide', 'pause');
        if (window.lucide) window.lucide.createIcons();
      }
    });

    previewVideo.addEventListener('pause', () => {
      if (playBtnIcon) {
        playBtnIcon.setAttribute('data-lucide', 'play');
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  if (videoPlayBtn && previewVideo) {
    videoPlayBtn.addEventListener('click', () => {
      if (previewVideo.paused) {
        if (previewVideo.currentTime >= state.endTime || previewVideo.currentTime < state.startTime) {
          previewVideo.currentTime = state.startTime;
        }
        previewVideo.play().catch(() => {});
      } else {
        previewVideo.pause();
      }
    });
  }

  if (startSlider) {
    startSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.startTime = Math.min(val, Math.max(0, state.endTime - 0.5));
      if (previewVideo) {
        previewVideo.currentTime = state.startTime;
      }
      updateTrimUI();
    });
  }

  if (endSlider) {
    endSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.endTime = Math.max(val, Math.min(state.videoDuration, state.startTime + 0.5));
      if (previewVideo) {
        previewVideo.currentTime = state.endTime;
      }
      updateTrimUI();
    });
  }

  const startMinusBtn = document.getElementById('start-minus-btn');
  const startPlusBtn = document.getElementById('start-plus-btn');
  const endMinusBtn = document.getElementById('end-minus-btn');
  const endPlusBtn = document.getElementById('end-plus-btn');

  if (startMinusBtn) {
    startMinusBtn.addEventListener('click', () => {
      state.startTime = Math.max(0, state.startTime - 1);
      if (previewVideo) previewVideo.currentTime = state.startTime;
      updateTrimUI();
    });
  }
  if (startPlusBtn) {
    startPlusBtn.addEventListener('click', () => {
      state.startTime = Math.min(state.endTime - 0.5, state.startTime + 1);
      if (previewVideo) previewVideo.currentTime = state.startTime;
      updateTrimUI();
    });
  }
  if (endMinusBtn) {
    endMinusBtn.addEventListener('click', () => {
      state.endTime = Math.max(state.startTime + 0.5, state.endTime - 1);
      if (previewVideo) previewVideo.currentTime = state.endTime;
      updateTrimUI();
    });
  }
  if (endPlusBtn) {
    endPlusBtn.addEventListener('click', () => {
      state.endTime = Math.min(state.videoDuration, state.endTime + 1);
      if (previewVideo) previewVideo.currentTime = state.endTime;
      updateTrimUI();
    });
  }

  const setStartBtn = document.getElementById('set-start-btn');
  const setEndBtn = document.getElementById('set-end-btn');

  if (setStartBtn && previewVideo) {
    setStartBtn.addEventListener('click', () => {
      const current = previewVideo.currentTime;
      state.startTime = Math.max(0, Math.min(current, state.endTime - 0.5));
      updateTrimUI();
    });
  }

  if (setEndBtn && previewVideo) {
    setEndBtn.addEventListener('click', () => {
      const current = previewVideo.currentTime;
      state.endTime = Math.min(state.videoDuration, Math.max(current, state.startTime + 0.5));
      updateTrimUI();
    });
  }

  const presetFullBtn = document.getElementById('preset-full-btn');
  const preset30sBtn = document.getElementById('preset-30s-btn');
  const preset60sBtn = document.getElementById('preset-60s-btn');

  if (presetFullBtn) {
    presetFullBtn.addEventListener('click', () => {
      state.startTime = 0;
      state.endTime = state.videoDuration;
      if (previewVideo) previewVideo.currentTime = 0;
      updateTrimUI();
    });
  }
  if (preset30sBtn) {
    preset30sBtn.addEventListener('click', () => {
      state.startTime = 0;
      state.endTime = Math.min(30, state.videoDuration);
      if (previewVideo) previewVideo.currentTime = 0;
      updateTrimUI();
    });
  }
  if (preset60sBtn) {
    preset60sBtn.addEventListener('click', () => {
      state.startTime = 0;
      state.endTime = Math.min(60, state.videoDuration);
      if (previewVideo) previewVideo.currentTime = 0;
      updateTrimUI();
    });
  }

  if (formatMp3Btn) {
    formatMp3Btn.addEventListener('click', () => setAudioFormat('mp3'));
  }
  if (formatWavBtn) {
    formatWavBtn.addEventListener('click', () => setAudioFormat('wav'));
  }

  bitrateChoices.forEach((btn) => {
    btn.addEventListener('click', () => {
      setBitrate(btn.dataset.bitrate);
    });
  });

  if (convertStartBtn) {
    convertStartBtn.addEventListener('click', startConversion);
  }

  if (convertAnotherBtn) {
    convertAnotherBtn.addEventListener('click', resetApplication);
  }

  if (downloadCtaBtn) {
    downloadCtaBtn.addEventListener('click', async (e) => {
      if (!state.convertedResult || !state.convertedResult.downloadUrl) return;

      const targetFilename = state.convertedResult.filename;
      const downloadUrl = state.convertedResult.downloadUrl;

      // If already a local blob URL, browser native blob download handles it instantly
      if (downloadUrl.startsWith('blob:')) {
        return;
      }

      // For server URL, fetch blob to ensure the browser saves the exact Bengali / Unicode / English filename
      // without any percent-encoding or header parsing quirks
      try {
        e.preventDefault();
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          window.location.href = downloadUrl;
          return;
        }
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const tempLink = document.createElement('a');
        tempLink.href = blobUrl;
        tempLink.download = targetFilename;
        tempLink.style.display = 'none';
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
      } catch (err) {
        console.warn('Blob download fetch fallback to native URL:', err);
        window.location.href = downloadUrl;
      }
    });
  }

  if (alertClose) {
    alertClose.addEventListener('click', hideAlert);
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Auto-boot on load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPWA();
    initVideoConverter();
  });
}

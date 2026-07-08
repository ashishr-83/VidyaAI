import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscriptionJobStatus,
  LanguageCode as TranscribeLanguageCode,
} from '@aws-sdk/client-transcribe';
import { PollyClient, SynthesizeSpeechCommand, Engine, OutputFormat, LanguageCode, VoiceId } from '@aws-sdk/client-polly';
import { env } from '../lib/env';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

// ── AWS client singletons ─────────────────────────────────────────────────────

// When AWS_ENDPOINT_URL is set the S3 client points at MinIO (local Docker).
// Transcribe and Polly always use real AWS — they have no local equivalent.
const s3Config: S3ClientConfig = {
  region: env.AWS_REGION,
  ...(env.AWS_ENDPOINT_URL
    ? {
        endpoint: env.AWS_ENDPOINT_URL,
        forcePathStyle: true, // MinIO requires path-style bucket URLs
        credentials: {
          accessKeyId: env.MINIO_ROOT_USER ?? 'minioadmin',
          secretAccessKey: env.MINIO_ROOT_PASSWORD ?? 'minioadmin',
        },
      }
    : {}),
};

const s3 = new S3Client(s3Config);
const transcribe = new TranscribeClient({ region: env.AWS_REGION });
const polly = new PollyClient({ region: env.AWS_REGION });

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESIGNED_URL_EXPIRES_IN = 300; // seconds
const TRANSCRIBE_POLL_INTERVAL_MS = 2_000;
const TRANSCRIBE_MAX_POLLS = 15; // 15 × 2s = 30s max

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/ogg': 'ogg',
};

const LANGUAGE_TO_TRANSCRIBE_CODE: Record<string, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
};

interface PollyVoiceConfig {
  voice: string;
  engine: 'neural' | 'standard';
}

const POLLY_VOICES: Record<string, PollyVoiceConfig> = {
  hi: { voice: 'Aditi', engine: 'standard' },
  en: { voice: 'Raveena', engine: 'standard' },
  ta: { voice: 'Kajal', engine: 'neural' },
  te: { voice: 'Kajal', engine: 'neural' },
  kn: { voice: 'Kajal', engine: 'neural' },
  mr: { voice: 'Kajal', engine: 'neural' },
};

// ── getUploadPresignedUrl ─────────────────────────────────────────────────────

export interface UploadPresignedUrlParams {
  userId: string;
  contentType: string;
}

export interface UploadPresignedUrlResult {
  uploadUrl: string;
  s3Key: string;
}

export async function getUploadPresignedUrl(
  params: UploadPresignedUrlParams
): Promise<UploadPresignedUrlResult> {
  const ext = CONTENT_TYPE_TO_EXT[params.contentType];
  if (!ext) {
    throw new AppError('Unsupported content type', 'UNSUPPORTED_CONTENT_TYPE', 400);
  }

  const s3Key = `audio/uploads/${params.userId}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: s3Key,
    ContentType: params.contentType,
  });

  const start = Date.now();
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGNED_URL_EXPIRES_IN });
  logger.info('S3 presigned URL generated', { latencyMs: Date.now() - start, s3Key });

  return { uploadUrl, s3Key };
}

// ── transcribeAudio ───────────────────────────────────────────────────────────

export interface TranscribeAudioParams {
  s3Key: string;
  languageCode: string; // short code: 'hi', 'en', etc.
}

export async function transcribeAudio(params: TranscribeAudioParams): Promise<string> {
  const awsLanguageCode = LANGUAGE_TO_TRANSCRIBE_CODE[params.languageCode];
  if (!awsLanguageCode) {
    throw new AppError('Unsupported language', 'UNSUPPORTED_LANGUAGE', 400);
  }

  const jobName = `vidyaai-${randomUUID()}`;
  const mediaUri = `s3://${env.AWS_S3_BUCKET}/${params.s3Key}`;

  const start = Date.now();
  await transcribe.send(
    new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      Media: { MediaFileUri: mediaUri },
      LanguageCode: awsLanguageCode as TranscribeLanguageCode,
      OutputBucketName: env.AWS_S3_BUCKET,
      OutputKey: `audio/transcripts/${jobName}.json`,
    })
  );

  // Poll until complete or timeout
  for (let attempt = 0; attempt < TRANSCRIBE_MAX_POLLS; attempt++) {
    await sleep(TRANSCRIBE_POLL_INTERVAL_MS);

    const { TranscriptionJob: job } = await transcribe.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
    );

    const status = job?.TranscriptionJobStatus;

    if (status === TranscriptionJobStatus.COMPLETED) {
      const transcriptKey = `audio/transcripts/${jobName}.json`;
      const transcriptText = await fetchTranscriptFromS3(transcriptKey);
      logger.info('AWS Transcribe job completed', {
        latencyMs: Date.now() - start,
        jobName,
        language: params.languageCode,
      });
      return transcriptText;
    }

    if (status === TranscriptionJobStatus.FAILED) {
      logger.warn('AWS Transcribe job failed', { jobName, failureReason: job?.FailureReason });
      throw new AppError('Transcription failed', 'TRANSCRIPTION_FAILED', 422);
    }
    // status is IN_PROGRESS or QUEUED — keep polling
  }

  logger.warn('AWS Transcribe job timed out', { jobName, elapsedMs: Date.now() - start });
  throw new AppError('Transcription timed out', 'TRANSCRIPTION_TIMEOUT', 504);
}

async function fetchTranscriptFromS3(s3Key: string): Promise<string> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: s3Key })
  );

  if (!response.Body) {
    throw new AppError('Transcription result empty', 'TRANSCRIPTION_FAILED', 422);
  }

  const bodyStr = await response.Body.transformToString();
  const parsed = JSON.parse(bodyStr) as {
    results: { transcripts: Array<{ transcript: string }> };
  };

  const transcript = parsed.results?.transcripts?.[0]?.transcript?.trim();
  if (!transcript) {
    throw new AppError('Transcription result empty', 'TRANSCRIPTION_FAILED', 422);
  }

  return transcript;
}

// ── synthesiseSpeech ─────────────────────────────────────────────────────────

export interface SynthesiseSpeechParams {
  text: string;
  languageCode: string; // short code: 'hi', 'en', etc.
}

export async function synthesiseSpeech(params: SynthesiseSpeechParams): Promise<string> {
  const voiceConfig = POLLY_VOICES[params.languageCode];
  if (!voiceConfig) {
    throw new AppError('Unsupported language', 'UNSUPPORTED_LANGUAGE', 400);
  }

  const start = Date.now();
  const pollyResponse = await polly.send(
    new SynthesizeSpeechCommand({
      Text: params.text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: voiceConfig.voice as VoiceId,
      Engine: voiceConfig.engine as Engine,
      LanguageCode: (LANGUAGE_TO_TRANSCRIBE_CODE[params.languageCode] ?? 'hi-IN') as LanguageCode,
    })
  );

  if (!pollyResponse.AudioStream) {
    throw new AppError('Polly returned no audio', 'TTS_FAILED', 502);
  }

  // Collect stream into Buffer
  const audioBuffer = Buffer.from(await pollyResponse.AudioStream.transformToByteArray());

  const s3Key = `audio/responses/${randomUUID()}.mp3`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    })
  );

  logger.info('AWS Polly speech synthesis complete', {
    latencyMs: Date.now() - start,
    language: params.languageCode,
    voice: voiceConfig.voice,
    s3Key,
  });

  return `${env.CLOUDFRONT_BASE_URL}/${s3Key}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

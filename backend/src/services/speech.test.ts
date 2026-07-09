/**
 * Unit tests for speech.ts — Arrange → Act → Assert throughout.
 *
 * What is mocked: all AWS SDK clients (S3, Transcribe, Polly) and the presigner.
 * What is real: all business logic — key construction, polling loop, error wrapping,
 *               language mapping, CloudFront URL formatting.
 */

// ── AWS SDK mocks — must be hoisted before any imports ───────────────────────

const mockGetSignedUrl = jest.fn();
const mockS3Send = jest.fn();
const mockTranscribeSend = jest.fn();
const mockPollySend = jest.fn();

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// AWS SDK v3: Command constructors store their input on `instance.input`.
// We implement them as classes so that `new XCommand(input)` captures input correctly.
class MockPutObjectCommand { input: unknown; constructor(i: unknown) { this.input = i; } }
class MockGetObjectCommand { input: unknown; constructor(i: unknown) { this.input = i; } }
class MockStartTranscriptionJobCommand { input: unknown; constructor(i: unknown) { this.input = i; } }
class MockGetTranscriptionJobCommand { input: unknown; constructor(i: unknown) { this.input = i; } }
class MockSynthesizeSpeechCommand { input: unknown; constructor(i: unknown) { this.input = i; } }

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: MockPutObjectCommand,
  GetObjectCommand: MockGetObjectCommand,
}));

jest.mock('@aws-sdk/client-transcribe', () => ({
  TranscribeClient: jest.fn().mockImplementation(() => ({ send: mockTranscribeSend })),
  StartTranscriptionJobCommand: MockStartTranscriptionJobCommand,
  GetTranscriptionJobCommand: MockGetTranscriptionJobCommand,
  TranscriptionJobStatus: {
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    IN_PROGRESS: 'IN_PROGRESS',
    QUEUED: 'QUEUED',
  },
  LanguageCode: {},
}));

jest.mock('@aws-sdk/client-polly', () => ({
  PollyClient: jest.fn().mockImplementation(() => ({ send: mockPollySend })),
  SynthesizeSpeechCommand: MockSynthesizeSpeechCommand,
  Engine: { NEURAL: 'neural', STANDARD: 'standard' },
  OutputFormat: { MP3: 'mp3' },
  LanguageCode: {},
  VoiceId: {},
}));

jest.mock('../lib/env', () => ({
  env: {
    NODE_ENV: 'test',
    AWS_REGION: 'ap-south-1',
    AWS_S3_BUCKET: 'vidyaai-audio-test',
    CLOUDFRONT_BASE_URL: 'https://cdn.vidyaai.in',
  },
}));

jest.mock('../lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { getUploadPresignedUrl, transcribeAudio, synthesiseSpeech } from './speech';
import { AppError } from '../middleware/errorHandler';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTranscriptS3Body(transcript: string) {
  return {
    Body: {
      transformToString: jest.fn().mockResolvedValue(
        JSON.stringify({ results: { transcripts: [{ transcript }] } })
      ),
    },
  };
}

function makePollyAudioStream(bytes: Uint8Array = new Uint8Array([0x49, 0x44, 0x33])) {
  return {
    AudioStream: {
      transformToByteArray: jest.fn().mockResolvedValue(bytes),
    },
  };
}

// ── getUploadPresignedUrl ─────────────────────────────────────────────────────

describe('getUploadPresignedUrl', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a presigned PUT URL and correctly structured S3 key for audio/webm', async () => {
    // Arrange
    mockGetSignedUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

    // Act
    const result = await getUploadPresignedUrl({ userId: 'user-123', contentType: 'audio/webm' });

    // Assert
    expect(result.uploadUrl).toBe('https://s3.amazonaws.com/signed-url');
    expect(result.s3Key).toMatch(/^audio\/uploads\/user-123\/.+\.webm$/);
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('returns .m4a extension for audio/mp4', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

    const result = await getUploadPresignedUrl({ userId: 'user-123', contentType: 'audio/mp4' });

    expect(result.s3Key).toMatch(/\.m4a$/);
  });

  it('returns .ogg extension for audio/ogg', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

    const result = await getUploadPresignedUrl({ userId: 'user-123', contentType: 'audio/ogg' });

    expect(result.s3Key).toMatch(/\.ogg$/);
  });

  it('generates a unique S3 key on each call (UUID-based)', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

    const [r1, r2] = await Promise.all([
      getUploadPresignedUrl({ userId: 'user-123', contentType: 'audio/webm' }),
      getUploadPresignedUrl({ userId: 'user-123', contentType: 'audio/webm' }),
    ]);

    expect(r1.s3Key).not.toBe(r2.s3Key);
  });

  it('throws UNSUPPORTED_CONTENT_TYPE for audio/wav', async () => {
    await expect(
      getUploadPresignedUrl({ userId: 'user-123', contentType: 'audio/wav' })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT_TYPE', statusCode: 400 });

    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('throws UNSUPPORTED_CONTENT_TYPE for empty string', async () => {
    await expect(
      getUploadPresignedUrl({ userId: 'user-123', contentType: '' })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT_TYPE', statusCode: 400 });
  });

  it('S3 key always contains the requesting userId — never another user\'s id', async () => {
    mockGetSignedUrl.mockResolvedValue('https://s3.amazonaws.com/signed-url');

    const result = await getUploadPresignedUrl({ userId: 'riya-student-456', contentType: 'audio/webm' });

    expect(result.s3Key).toContain('riya-student-456');
    expect(result.s3Key).not.toContain('other-user');
  });
});

// ── transcribeAudio ───────────────────────────────────────────────────────────

describe('transcribeAudio', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts a Transcribe job, polls once (COMPLETED), returns transcript text', async () => {
    // Arrange — job completes on first poll
    mockTranscribeSend
      .mockResolvedValueOnce({}) // StartTranscriptionJobCommand
      .mockResolvedValueOnce({ TranscriptionJob: { TranscriptionJobStatus: 'COMPLETED' } }); // GetTranscriptionJobCommand
    mockS3Send.mockResolvedValueOnce(makeTranscriptS3Body('Newton ka teesra niyam kya hai?'));

    // Act
    const text = await transcribeAudio({ s3Key: 'audio/uploads/user-abc/uuid.webm', languageCode: 'hi' });

    // Assert
    expect(text).toBe('Newton ka teesra niyam kya hai?');
    expect(mockTranscribeSend).toHaveBeenCalledTimes(2); // start + 1 poll
  });

  it('handles a job that is QUEUED on first poll then COMPLETED on second', async () => {
    mockTranscribeSend
      .mockResolvedValueOnce({}) // start
      .mockResolvedValueOnce({ TranscriptionJob: { TranscriptionJobStatus: 'QUEUED' } })
      .mockResolvedValueOnce({ TranscriptionJob: { TranscriptionJobStatus: 'COMPLETED' } });
    mockS3Send.mockResolvedValueOnce(makeTranscriptS3Body('Photosynthesis kya hota hai?'));

    const text = await transcribeAudio({ s3Key: 'audio/uploads/user-abc/uuid.webm', languageCode: 'hi' });

    expect(text).toBe('Photosynthesis kya hota hai?');
    expect(mockTranscribeSend).toHaveBeenCalledTimes(3); // start + 2 polls
  });

  it('throws TRANSCRIPTION_FAILED when job status is FAILED', async () => {
    mockTranscribeSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        TranscriptionJob: {
          TranscriptionJobStatus: 'FAILED',
          FailureReason: 'Audio file not found in S3',
        },
      });

    await expect(
      transcribeAudio({ s3Key: 'audio/uploads/user-abc/bad.webm', languageCode: 'en' })
    ).rejects.toMatchObject({ code: 'TRANSCRIPTION_FAILED', statusCode: 422 });
  });

  it('throws TRANSCRIPTION_TIMEOUT after 15 polls without COMPLETED', async () => {
    // Arrange — start + 15 IN_PROGRESS polls = 16 calls
    mockTranscribeSend.mockResolvedValue({ TranscriptionJob: { TranscriptionJobStatus: 'IN_PROGRESS' } });
    mockTranscribeSend.mockResolvedValueOnce({}); // first call is StartTranscriptionJobCommand

    await expect(
      transcribeAudio({ s3Key: 'audio/uploads/user-abc/uuid.webm', languageCode: 'hi' })
    ).rejects.toMatchObject({ code: 'TRANSCRIPTION_TIMEOUT', statusCode: 504 });

    // 1 start + 15 polls
    expect(mockTranscribeSend).toHaveBeenCalledTimes(16);
  }, 45_000); // allow up to 45s for 15 × 2s poll intervals (jest fake timers not used here)

  it('throws TRANSCRIPTION_FAILED when S3 transcript body is empty', async () => {
    mockTranscribeSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ TranscriptionJob: { TranscriptionJobStatus: 'COMPLETED' } });
    mockS3Send.mockResolvedValueOnce({
      Body: {
        transformToString: jest.fn().mockResolvedValue(
          JSON.stringify({ results: { transcripts: [{ transcript: '' }] } })
        ),
      },
    });

    await expect(
      transcribeAudio({ s3Key: 'audio/uploads/user-abc/silent.webm', languageCode: 'hi' })
    ).rejects.toMatchObject({ code: 'TRANSCRIPTION_FAILED', statusCode: 422 });
  });

  it('throws TRANSCRIPTION_FAILED when S3 Body is null', async () => {
    mockTranscribeSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ TranscriptionJob: { TranscriptionJobStatus: 'COMPLETED' } });
    mockS3Send.mockResolvedValueOnce({ Body: null });

    await expect(
      transcribeAudio({ s3Key: 'audio/uploads/user-abc/uuid.webm', languageCode: 'hi' })
    ).rejects.toMatchObject({ code: 'TRANSCRIPTION_FAILED', statusCode: 422 });
  });

  it('throws UNSUPPORTED_LANGUAGE for an unknown language code', async () => {
    await expect(
      transcribeAudio({ s3Key: 'audio/uploads/user-abc/uuid.webm', languageCode: 'fr' })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_LANGUAGE', statusCode: 400 });

    expect(mockTranscribeSend).not.toHaveBeenCalled();
  });

  it.each([
    ['hi', 'hi-IN'],
    ['en', 'en-IN'],
    ['ta', 'ta-IN'],
    ['te', 'te-IN'],
    ['kn', 'kn-IN'],
    ['mr', 'mr-IN'],
  ])('maps language "%s" to AWS code "%s"', async (lang, expectedCode) => {
    mockTranscribeSend
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ TranscriptionJob: { TranscriptionJobStatus: 'COMPLETED' } });
    mockS3Send.mockResolvedValueOnce(makeTranscriptS3Body('test transcript'));

    await transcribeAudio({ s3Key: 'audio/uploads/user-abc/uuid.webm', languageCode: lang });

    const startCmd = mockTranscribeSend.mock.calls[0][0] as MockStartTranscriptionJobCommand;
    expect((startCmd.input as Record<string, unknown>).LanguageCode).toBe(expectedCode);
  });
});

// ── synthesiseSpeech ─────────────────────────────────────────────────────────

describe('synthesiseSpeech', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a CloudFront URL for the generated MP3', async () => {
    // Arrange
    mockPollySend.mockResolvedValueOnce(makePollyAudioStream());
    mockS3Send.mockResolvedValueOnce({}); // PutObjectCommand

    // Act
    const url = await synthesiseSpeech({ text: 'Newton ka pehla niyam yeh hai...', languageCode: 'hi' });

    // Assert
    expect(url).toMatch(/^https:\/\/cdn\.vidyaai\.in\/audio\/responses\/.+\.mp3$/);
  });

  it('calls Polly with Aditi voice + standard engine for Hindi', async () => {
    mockPollySend.mockResolvedValueOnce(makePollyAudioStream());
    mockS3Send.mockResolvedValueOnce({});

    await synthesiseSpeech({ text: 'test', languageCode: 'hi' });

    const pollyCmd = mockPollySend.mock.calls[0][0] as MockSynthesizeSpeechCommand;
    const input = pollyCmd.input as Record<string, unknown>;
    expect(input.VoiceId).toBe('Aditi');
    expect(input.Engine).toBe('standard');
  });

  it('calls Polly with Raveena voice for English', async () => {
    mockPollySend.mockResolvedValueOnce(makePollyAudioStream());
    mockS3Send.mockResolvedValueOnce({});

    await synthesiseSpeech({ text: 'test', languageCode: 'en' });

    const pollyCmd = mockPollySend.mock.calls[0][0] as MockSynthesizeSpeechCommand;
    expect((pollyCmd.input as Record<string, unknown>).VoiceId).toBe('Raveena');
  });

  it('calls Polly with Kajal neural voice for Tamil', async () => {
    mockPollySend.mockResolvedValueOnce(makePollyAudioStream());
    mockS3Send.mockResolvedValueOnce({});

    await synthesiseSpeech({ text: 'test', languageCode: 'ta' });

    const pollyCmd = mockPollySend.mock.calls[0][0] as MockSynthesizeSpeechCommand;
    const input = pollyCmd.input as Record<string, unknown>;
    expect(input.VoiceId).toBe('Kajal');
    expect(input.Engine).toBe('neural');
  });

  it.each(['te', 'kn', 'mr'])('uses Kajal neural for language "%s"', async (lang) => {
    mockPollySend.mockResolvedValueOnce(makePollyAudioStream());
    mockS3Send.mockResolvedValueOnce({});

    await synthesiseSpeech({ text: 'test', languageCode: lang });

    const pollyCmd = mockPollySend.mock.calls[0][0] as MockSynthesizeSpeechCommand;
    const input = pollyCmd.input as Record<string, unknown>;
    expect(input.VoiceId).toBe('Kajal');
    expect(input.Engine).toBe('neural');
  });

  it('generates a unique S3 key on each call', async () => {
    mockPollySend.mockResolvedValue(makePollyAudioStream());
    mockS3Send.mockResolvedValue({});

    const [url1, url2] = await Promise.all([
      synthesiseSpeech({ text: 'test', languageCode: 'hi' }),
      synthesiseSpeech({ text: 'test', languageCode: 'hi' }),
    ]);

    expect(url1).not.toBe(url2);
  });

  it('throws TTS_FAILED when Polly returns no AudioStream', async () => {
    mockPollySend.mockResolvedValueOnce({ AudioStream: null });

    await expect(
      synthesiseSpeech({ text: 'test', languageCode: 'hi' })
    ).rejects.toMatchObject({ code: 'TTS_FAILED', statusCode: 502 });

    expect(mockS3Send).not.toHaveBeenCalled(); // should not attempt S3 upload
  });

  it('throws UNSUPPORTED_LANGUAGE for unknown language — does not call Polly', async () => {
    await expect(
      synthesiseSpeech({ text: 'bonjour', languageCode: 'fr' })
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_LANGUAGE', statusCode: 400 });

    expect(mockPollySend).not.toHaveBeenCalled();
  });

  it('uploads audio as audio/mpeg to S3 under audio/responses/ prefix', async () => {
    mockPollySend.mockResolvedValueOnce(makePollyAudioStream());
    mockS3Send.mockResolvedValueOnce({});

    await synthesiseSpeech({ text: 'test', languageCode: 'hi' });

    const s3Cmd = mockS3Send.mock.calls[0][0] as MockPutObjectCommand;
    const input = s3Cmd.input as Record<string, unknown>;
    expect(input.Key as string).toMatch(/^audio\/responses\/.+\.mp3$/);
    expect(input.ContentType).toBe('audio/mpeg');
  });
});

// ── AppError shape validation ─────────────────────────────────────────────────

describe('AppError shape', () => {
  it('errors thrown by speech service are instances of AppError', async () => {
    try {
      await getUploadPresignedUrl({ userId: 'u', contentType: 'audio/wav' });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).statusCode).toBeDefined();
      expect((err as AppError).code).toBeDefined();
    }
  });
});

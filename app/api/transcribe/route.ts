import { NextResponse } from 'next/server';

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY || '';

  if (!apiKey) {
    console.log('[TRANSCRIBE] No OPENAI_API_KEY found, returning fallback');
    return NextResponse.json({ error: 'No API key configured' }, { status: 503 });
  }

  try {
    const audioFormData = new FormData();
    audioFormData.append('file', file);
    audioFormData.append('model', 'whisper-1');
    audioFormData.append('language', 'en');
    audioFormData.append('response_format', 'json');

    console.log('[TRANSCRIBE] Sending to Whisper API, file size:', file.size, 'bytes');

    const res = await fetch(WHISPER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: audioFormData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[TRANSCRIBE] Whisper API error:', res.status, errText);
      return NextResponse.json({ error: `Whisper API error: ${res.status}` }, { status: res.status });
    }

    const data = (await res.json()) as { text?: string };
    const text = (data.text || '').trim();

    console.log('[TRANSCRIBE] Whisper result:', text);

    return NextResponse.json({ text });
  } catch (err) {
    console.error('[TRANSCRIBE] Exception:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

const ASSEMBLY_UPLOAD_URL = 'https://api.assemblyai.com/v2/upload';
const ASSEMBLY_TRANSCRIPT_URL = 'https://api.assemblyai.com/v2/transcript';

type ProviderResult = {
  ok: boolean;
  text?: string;
  status?: number;
  error?: string;
};

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

  const assemblyAiKey = process.env.ASSEMBLYAI_API_KEY || '';

  if (!assemblyAiKey) {
    console.log('[TRANSCRIBE] Missing ASSEMBLYAI_API_KEY');
    return NextResponse.json(
      { error: 'Thiếu ASSEMBLYAI_API_KEY cho transcribe.' },
      { status: 503 }
    );
  }

  try {
    const result = await transcribeWithAssemblyAI(file, assemblyAiKey);
    if (result.ok && result.text) {
      console.log('[TRANSCRIBE] assemblyai result:', result.text);
      return NextResponse.json({ text: result.text });
    }

    if (result.status === 429) {
      return NextResponse.json(
        { error: 'AssemblyAI đang hết quota hoặc bị giới hạn tần suất (429). Vui lòng kiểm tra quota/billing rồi thử lại.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: result.error || 'AssemblyAI transcription failed' },
      { status: result.status || 500 }
    );
  } catch (err) {
    console.error('[TRANSCRIBE] assemblyai exception:', err);
    return NextResponse.json({ error: 'AssemblyAI transcription failed' }, { status: 500 });
  }
}

async function transcribeWithAssemblyAI(file: File, apiKey: string): Promise<ProviderResult> {
  console.log('[TRANSCRIBE] Sending to AssemblyAI, file size:', file.size, 'bytes');

  const bytes = new Uint8Array(await file.arrayBuffer());

  const uploadRes = await fetch(ASSEMBLY_UPLOAD_URL, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/octet-stream',
    },
    body: bytes,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return {
      ok: false,
      status: uploadRes.status,
      error: `AssemblyAI upload lỗi (${uploadRes.status}): ${errText.slice(0, 300)}`,
    };
  }

  const uploadData = (await uploadRes.json()) as { upload_url?: string };
  const uploadUrl = uploadData.upload_url || '';
  if (!uploadUrl) {
    return { ok: false, status: 500, error: 'AssemblyAI upload không trả về upload_url' };
  }

  const createRes = await fetch(ASSEMBLY_TRANSCRIPT_URL, {
    method: 'POST',
    headers: {
      authorization: apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      language_code: 'en',
      speech_models: ['universal-2'],
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    return {
      ok: false,
      status: createRes.status,
      error: `AssemblyAI create transcript lỗi (${createRes.status}): ${errText.slice(0, 300)}`,
    };
  }

  const createData = (await createRes.json()) as { id?: string };
  const transcriptId = createData.id || '';
  if (!transcriptId) {
    return { ok: false, status: 500, error: 'AssemblyAI không trả về transcript id' };
  }

  for (let i = 0; i < 24; i += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    const pollRes = await fetch(`${ASSEMBLY_TRANSCRIPT_URL}/${transcriptId}`, {
      headers: {
        authorization: apiKey,
      },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text();
      return {
        ok: false,
        status: pollRes.status,
        error: `AssemblyAI poll lỗi (${pollRes.status}): ${errText.slice(0, 300)}`,
      };
    }

    const pollData = (await pollRes.json()) as {
      status?: string;
      text?: string;
      error?: string;
    };

    if (pollData.status === 'completed') {
      return { ok: true, text: (pollData.text || '').trim() };
    }

    if (pollData.status === 'error') {
      return {
        ok: false,
        status: 500,
        error: `AssemblyAI transcript error: ${pollData.error || 'unknown error'}`,
      };
    }
  }

  return { ok: false, status: 504, error: 'AssemblyAI timeout khi chờ transcript hoàn tất' };
}

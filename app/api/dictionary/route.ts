import { NextResponse } from 'next/server';

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: Array<{ text?: string; audio?: string }>;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
}

interface LookupResult {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      definitionVi: string;
      example?: string;
      synonyms?: string[];
    }>;
  }>;
}

async function translateToVietnamese(text: string): Promise<string> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return text;
  }

  try {
    const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'vi',
        format: 'text',
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as { data: { translations: Array<{ translatedText: string }> } };
      return data.data.translations[0]?.translatedText || text;
    }
  } catch {
    // Fall through silently
  }

  return text;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const word = searchParams.get('word')?.trim().toLowerCase();

  if (!word) {
    return NextResponse.json({ error: 'No word provided' }, { status: 400 });
  }

  if (word.length > 100) {
    return NextResponse.json({ error: 'Word too long' }, { status: 400 });
  }

  try {
    // 1. Fetch from DictionaryAPI.dev
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      next: { revalidate: 86400 }, // cache 24h
    });

    if (!dictRes.ok) {
      if (dictRes.status === 404) {
        return NextResponse.json({ error: 'Không tìm thấy từ này trong từ điển' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Không thể tra từ điển' }, { status: 502 });
    }

    const dictData = (await dictRes.json()) as DictionaryEntry[];
    const entry = dictData[0];

    if (!entry) {
      return NextResponse.json({ error: 'Không tìm thấy từ này' }, { status: 404 });
    }

    // Find audio URL
    let audioUrl: string | undefined;
    for (const p of entry.phonetics || []) {
      if (p.audio && p.audio.length > 0) {
        audioUrl = p.audio;
        break;
      }
    }

    // Collect all definitions + examples for translation (batch translate for efficiency)
    const definitionTexts: string[] = [];
    const defIndices: Array<{ meaningIdx: number; defIdx: number }> = [];

    for (let mi = 0; mi < entry.meanings.length; mi++) {
      const meaning = entry.meanings[mi];
      for (let di = 0; di < meaning.definitions.length; di++) {
        const def = meaning.definitions[di];
        definitionTexts.push(def.definition);
        defIndices.push({ meaningIdx: mi, defIdx: di });
      }
    }

    // Batch translate all definitions at once
    const translatedDefs = new Map<string, string>();
    if (definitionTexts.length > 0) {
      const batchTexts = definitionTexts.join('\n---\n');
      const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GEMINI_API_KEY || '';
      
      if (apiKey) {
        try {
          const res = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: batchTexts,
              source: 'en',
              target: 'vi',
              format: 'text',
            }),
          });

          if (res.ok) {
            const data = (await res.json()) as { data: { translations: Array<{ translatedText: string }> } };
            const translations = data.data.translations;
            translations.forEach((t, idx) => {
              translatedDefs.set(definitionTexts[idx], t.translatedText);
            });
          }
        } catch {
          // Translation failed, use original
        }
      }
    }

    // Build result
    const result: LookupResult = {
      word: entry.word,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
      audioUrl,
      meanings: entry.meanings.map((meaning, mi) => ({
        partOfSpeech: meaning.partOfSpeech,
        definitions: meaning.definitions.map((def, di) => ({
          definition: def.definition,
          definitionVi: translatedDefs.get(def.definition) || def.definition,
          example: def.example,
          synonyms: def.synonyms?.slice(0, 5),
        })),
      })),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error('[DICTIONARY] Error:', err);
    return NextResponse.json({ error: 'Lỗi server khi tra từ điển' }, { status: 500 });
  }
}

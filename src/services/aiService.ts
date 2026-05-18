// AI Assistant Service - supports OpenAI-compatible APIs
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

const SYSTEM_PROMPT = `Kamu adalah asisten Islam yang ramah dan berpengetahuan luas bernama "MuslimMate AI".
Kamu membantu menjawab pertanyaan seputar Islam dengan sopan, berdasarkan Al-Quran dan Hadits shahih.
Gunakan bahasa Indonesia yang baik dan mudah dipahami.
Selalu sertakan dalil dari Al-Quran atau Hadits jika relevan.
Untuk pertanyaan kompleks tentang fiqih, sarankan untuk berkonsultasi dengan ulama.
Jangan menjawab pertanyaan di luar topik Islam.`;

export async function sendAIMessage(
  messages: ChatMessage[],
  apiKey: string,
  baseUrl: string = 'https://api.openai.com/v1',
  model: string = 'gpt-3.5-turbo'
): Promise<string> {
  if (!apiKey) {
    return 'API Key belum diatur. Silakan masukkan API Key di menu Pengaturan.';
  }

  const payload = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 1000,
  };

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message ?? 'API Error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content ?? 'Maaf, tidak ada respons.';
  } catch (error: any) {
    if (error.message.includes('API Key')) throw error;
    throw new Error(`Gagal menghubungi AI: ${error.message}`);
  }
}

// Suggested questions for Islamic topics
export const SUGGESTED_QUESTIONS = [
  'Apa keutamaan membaca Al-Qur\'an?',
  'Bagaimana tata cara sholat yang benar?',
  'Apa dalil tentang kewajiban puasa Ramadhan?',
  'Jelaskan tentang zakat fitrah',
  'Apa hukum mendengarkan musik dalam Islam?',
  'Bagaimana cara bertaubat yang benar?',
  'Apa amalan yang dianjurkan di hari Jumat?',
  'Jelaskan tentang syarat sah sholat',
];

export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

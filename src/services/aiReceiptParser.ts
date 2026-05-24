export interface ParsedReceipt {
  amount: number | null;
  description: string;
  category: string;
  date: string | null;
  notes: string;
}

const CATEGORIES = [
  'Préstamos',
  'Gastos Fijos',
  'Comida',
  'Transporte',
  'Entretenimiento',
  'Salud',
  'Otros',
];

export async function resizeImage(
  file: File,
  maxDimension = 1024
): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar la imagen'));
    };
    img.src = url;
  });
}

export async function parseReceiptWithAI(
  base64: string,
  mimeType: 'image/jpeg',
  apiKey: string
): Promise<ParsedReceipt> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType, data: base64 },
            },
            {
              type: 'text',
              text: `Analiza este ticket o recibo y extrae la información del gasto. Devuelve ÚNICAMENTE un objeto JSON con estos campos exactos:
- "amount": número decimal (importe total en euros, null si no es visible)
- "description": string (descripción breve del comercio o producto, máx 60 caracteres)
- "category": string (elige una de estas: ${CATEGORIES.join(', ')})
- "date": string (formato YYYY-MM-DD, null si no aparece)
- "notes": string (observaciones adicionales, cadena vacía si no hay nada)

Responde SOLO con el JSON, sin markdown ni explicación.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `Error ${response.status} de la API`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text ?? '{}';

  let parsed: Partial<ParsedReceipt>;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('La IA devolvió una respuesta inesperada');
  }

  return {
    amount: typeof parsed.amount === 'number' ? parsed.amount : null,
    description: typeof parsed.description === 'string' ? parsed.description : '',
    category: CATEGORIES.includes(parsed.category ?? '') ? parsed.category! : 'Otros',
    date: typeof parsed.date === 'string' ? parsed.date : null,
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
  };
}

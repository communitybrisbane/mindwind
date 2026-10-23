// OpenAI Embeddings（サーバー側専用）。モデル選定は docs/ARCHITECTURE.md が正

export const EMBEDDING_DIM = 1536;
const MODEL = "text-embedding-3-small";

async function requestEmbeddings(input: string | string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, input }),
  });
  if (!res.ok) throw new Error(`embeddings API ${res.status}`);
  const data = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
  // 応答の順番は index で揃える（入力と同じ並びで返す）
  return [...data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await requestEmbeddings(text);
  return embedding;
}

/** 複数のテキストを1回の API 呼び出しでベクトル化する（チャンクの保存用）。入力と同じ順で返す */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const out = await requestEmbeddings(texts);
  if (out.length !== texts.length) throw new Error("embeddings API returned a wrong count");
  return out;
}

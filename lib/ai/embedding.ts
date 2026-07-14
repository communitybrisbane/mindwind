// OpenAI Embeddings（サーバー側専用）。モデル選定は docs/ARCHITECTURE.md が正

export const EMBEDDING_DIM = 1536;

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`embeddings API ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding as number[];
}

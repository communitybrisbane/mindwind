// ndjson（1行=1 JSON）ストリームの読み取り。相談 API のストリーミング受信で使う

export async function readNdjson(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: unknown) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line));
    }
  }
  // 改行なしで終わった最終行も処理する
  if (buffer.trim()) onEvent(JSON.parse(buffer));
}

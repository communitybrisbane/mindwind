/** NDJSON（1行1JSON）のストリーミングレスポンスを作る。
 *  run の中でエラー処理・返金を済ませる前提で、終了時は必ず controller を閉じる */
export function ndjsonResponse(run: (push: (data: object) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      try {
        await run(push);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

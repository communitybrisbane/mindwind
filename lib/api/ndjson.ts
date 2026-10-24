/** NDJSON（1行1JSON）のストリーミングレスポンスを作る。
 *  run の中でエラー処理・返金を済ませる前提で、終了時は必ず controller を閉じる。
 *  クライアントが先に切断すると stream は cancel 済みになり、そのあとの close() は TypeError を投げるので握る
 *  （push 側の enqueue の例外は呼び出し側が扱う） */
export function ndjsonResponse(run: (push: (data: object) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let cancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      const push = (data: object) =>
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      try {
        await run(push);
      } finally {
        if (!cancelled) {
          try {
            controller.close();
          } catch {
            // 切断後の close は無視する
          }
        }
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  });
}

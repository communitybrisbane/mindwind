import { describe, expect, it } from "vitest";
import { readNdjson } from "./ndjson";

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("readNdjson", () => {
  it("行ごとに JSON をパースしてコールバックする", async () => {
    const events: unknown[] = [];
    await readNdjson(streamOf(['{"a":1}\n{"b":2}\n']), (e) => events.push(e));
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("チャンク境界が行の途中でも正しく組み立てる", async () => {
    const events: unknown[] = [];
    await readNdjson(streamOf(['{"type":"del', 'ta","text":"あ"}\n{"type":', '"done"}\n']), (e) =>
      events.push(e)
    );
    expect(events).toEqual([{ type: "delta", text: "あ" }, { type: "done" }]);
  });

  it("改行なしで終わる最終行・空行も扱える", async () => {
    const events: unknown[] = [];
    await readNdjson(streamOf(['{"a":1}\n\n', '{"b":2}']), (e) => events.push(e));
    expect(events).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

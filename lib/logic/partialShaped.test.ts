import { describe, expect, it } from "vitest";
import { parsePartialShaped } from "./partialShaped";

describe("parsePartialShaped", () => {
  it("完全な JSON から全項目を取り出す", () => {
    const json = JSON.stringify({
      title: "初の単独提案",
      event: "一人で提案した",
      thinking: "緊張した",
      action: "最後まで話した",
      reason: "自分の言葉で",
      emotion: "前進の手応え",
      values: "やり遂げたい",
    });
    const p = parsePartialShaped(json);
    expect(p.title).toBe("初の単独提案");
    expect(p.values).toBe("やり遂げたい");
  });

  it("値の途中でもそこまでの文字を返す", () => {
    const partial = '{"title":"初の単独提案","event":"一人で提案し';
    const p = parsePartialShaped(partial);
    expect(p.title).toBe("初の単独提案");
    expect(p.event).toBe("一人で提案し");
    expect(p.thinking).toBeUndefined();
  });

  it("エスケープ（改行・引用符）を復元する", () => {
    const partial = '{"event":"彼は\\"やる\\"と言った。\\n次の日';
    expect(parsePartialShaped(partial).event).toBe('彼は"やる"と言った。\n次の日');
  });

  it("書きかけのエスケープは捨てて壊れない", () => {
    expect(parsePartialShaped('{"event":"途中\\').event).toBe("途中");
    expect(parsePartialShaped('{"event":"途中\\u30').event).toBe("途中");
  });

  it("キーだけで値が始まっていなければ含めない", () => {
    expect(parsePartialShaped('{"title":').title).toBeUndefined();
  });
});

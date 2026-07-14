import { describe, expect, it } from "vitest";
import { buildEmbeddingText } from "./recordText";

describe("buildEmbeddingText", () => {
  it("6項目を素のラベル付きで連結する（タイトルは含めない）", () => {
    const text = buildEmbeddingText({
      title: "初の単独提案",
      event: "一人で提案した",
      thinking: "緊張した",
      action: "最後まで話した",
      reason: "自分の言葉で話したかった",
      emotion: "前進した手応え",
      values: "やり遂げることを重視しているのかもしれない",
    });
    expect(text).toBe(
      "出来事：一人で提案した\n思考：緊張した\n行動：最後まで話した\n理由：自分の言葉で話したかった\n感情：前進した手応え\n価値観：やり遂げることを重視しているのかもしれない"
    );
    expect(text).not.toContain("初の単独提案");
    expect(text).not.toContain("AIの気づき");
  });
});

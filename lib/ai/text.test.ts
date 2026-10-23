import { describe, expect, it } from "vitest";
import { joinTextBlocks } from "./text";

describe("joinTextBlocks", () => {
  it("text ブロックだけを順に連結する", () => {
    expect(
      joinTextBlocks([
        { type: "thinking" },
        { type: "text", text: "こん" },
        { type: "tool_use" },
        { type: "text", text: "にちは" },
      ])
    ).toBe("こんにちは");
  });

  it("text ブロックがなければ空文字", () => {
    expect(joinTextBlocks([{ type: "thinking" }])).toBe("");
  });
});

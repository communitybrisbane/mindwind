/** Anthropic の応答 content から text ブロックだけを連結して返す */
export function joinTextBlocks(content: { type: string; text?: string }[]): string {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

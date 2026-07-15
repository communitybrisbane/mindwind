import { describe, expect, it } from "vitest";
import {
  currentSession,
  fromStored,
  savedCards,
  toStored,
  type RecordMessage,
} from "./recordChatMessages";

const shaped = {
  title: "t",
  event: "e",
  thinking: "th",
  action: "a",
  reason: "r",
  emotion: "em",
  values: "v",
};

const card: RecordMessage = { role: "ai", kind: "card", shaped, thoughtId: "id1" };
const userText: RecordMessage = { role: "user", kind: "text", text: "日記" };
const aiText: RecordMessage = { role: "ai", kind: "text", text: "質問" };

describe("toStored / fromStored", () => {
  it("往復変換で元に戻る", () => {
    const messages = [userText, aiText, card];
    expect(fromStored(toStored(messages))).toEqual(messages);
  });

  it("壊れたカードは捨てて復元を続ける", () => {
    const restored = fromStored([
      { role: "ai", type: "card", content: "{invalid json", thoughtId: "x" },
      { role: "user", type: "text", content: "日記" },
    ]);
    expect(restored).toEqual([userText]);
  });
});

describe("savedCards / currentSession", () => {
  it("カードだけを取り出す", () => {
    expect(savedCards([userText, card, aiText])).toEqual([card]);
  });

  it("最後のカードより後ろが進行中セッション", () => {
    expect(currentSession([userText, card, aiText, userText])).toEqual([aiText, userText]);
  });

  it("カードがなければ全部が進行中", () => {
    expect(currentSession([userText, aiText])).toEqual([userText, aiText]);
  });

  it("最後がカードなら進行中は空", () => {
    expect(currentSession([userText, card])).toEqual([]);
  });
});

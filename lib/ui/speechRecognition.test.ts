// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isFatalRecognitionError, parseRecognitionResults, type RecognitionEvent } from "./speechRecognition";

const r = (transcript: string, isFinal: boolean) => ({ isFinal, 0: { transcript } });
const ev = (resultIndex: number, results: ReturnType<typeof r>[]): RecognitionEvent => ({ resultIndex, results });

// 元の実装の入出力を期待値にする。
// 記録(useSpeech): final ごとに onFinal、final でないものは連結して onInterim。
// 相談(ConsultInput): final だけを連結（interim は捨てる）。
describe("parseRecognitionResults", () => {
  it("resultIndex 以降だけを見る", () => {
    const out = parseRecognitionResults(ev(1, [r("無視", true), r("こんにちは", true)]));
    expect(out).toEqual({ finals: ["こんにちは"], interim: "" });
  });
  it("final と interim を分け、順番を保つ（記録: onFinal を順に・onInterim は連結）", () => {
    const out = parseRecognitionResults(ev(0, [r("あ", true), r("い", false), r("う", true), r("え", false)]));
    expect(out.finals).toEqual(["あ", "う"]);
    expect(out.interim).toBe("いえ");
  });
  it("相談の元の連結: final だけを足し合わせる", () => {
    const out = parseRecognitionResults(ev(0, [r("あ", true), r("い", false), r("う", true)]));
    expect(out.finals.join("")).toBe("あう");
  });
  it("final が無ければ相談の text は空（何もしない）", () => {
    const out = parseRecognitionResults(ev(0, [r("い", false)]));
    expect(out.finals.join("")).toBe("");
    expect(out.interim).toBe("い");
  });
  it("結果が空でも落ちない（記録は onInterim('') を呼ぶ）", () => {
    expect(parseRecognitionResults(ev(0, []))).toEqual({ finals: [], interim: "" });
  });
});

describe("isFatalRecognitionError", () => {
  it("no-speech と aborted は致命的でない（元: return）", () => {
    expect(isFatalRecognitionError("no-speech")).toBe(false);
    expect(isFatalRecognitionError("aborted")).toBe(false);
  });
  it("それ以外は致命的（許可拒否・不明・空）", () => {
    expect(isFatalRecognitionError("not-allowed")).toBe(true);
    expect(isFatalRecognitionError("service-not-allowed")).toBe(true);
    expect(isFatalRecognitionError("")).toBe(true);
    expect(isFatalRecognitionError(undefined)).toBe(true);
  });
});

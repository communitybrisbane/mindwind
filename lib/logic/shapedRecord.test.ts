import { describe, expect, it } from "vitest";
import { MAX_SHAPED_FIELD, MAX_TITLE_LENGTH } from "./limits";
import { parseShapedRecord } from "./shapedRecord";

const valid = {
  title: "題",
  event: "出来事",
  thinking: "思考",
  action: "行動",
  reason: "理由",
  emotion: "感情",
  values: "価値観",
};

describe("parseShapedRecord", () => {
  it("正しい記録はそのまま返す", () => {
    expect(parseShapedRecord(valid)).toEqual(valid);
  });

  it("7項目以外は取り除く", () => {
    expect(parseShapedRecord({ ...valid, extra: "x" })).toEqual(valid);
  });

  it("オブジェクト以外は null", () => {
    expect(parseShapedRecord(null)).toBeNull();
    expect(parseShapedRecord(undefined)).toBeNull();
    expect(parseShapedRecord("text")).toBeNull();
  });

  it("欠け・空白のみ・文字列以外は null", () => {
    expect(parseShapedRecord({ ...valid, event: undefined })).toBeNull();
    expect(parseShapedRecord({ ...valid, event: "  " })).toBeNull();
    expect(parseShapedRecord({ ...valid, action: 1 })).toBeNull();
  });

  it("上限ちょうどは通り、超えると null（タイトルは別上限）", () => {
    expect(parseShapedRecord({ ...valid, title: "あ".repeat(MAX_TITLE_LENGTH) })).not.toBeNull();
    expect(parseShapedRecord({ ...valid, title: "あ".repeat(MAX_TITLE_LENGTH + 1) })).toBeNull();
    expect(parseShapedRecord({ ...valid, event: "あ".repeat(MAX_SHAPED_FIELD) })).not.toBeNull();
    expect(parseShapedRecord({ ...valid, event: "あ".repeat(MAX_SHAPED_FIELD + 1) })).toBeNull();
  });
});

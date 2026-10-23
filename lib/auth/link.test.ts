import { describe, expect, it } from "vitest";
import {
  authCode,
  authErrorMessage,
  classifyAuthError,
  conflictAccountLabel,
  linkedLimitsText,
  logoutDialogFor,
  needsReauthBeforeDelete,
  nicknameHint,
  normalizeNickname,
  reloginToast,
} from "./link";

describe("authCode", () => {
  it("code を取り出す", () => {
    expect(authCode({ code: "auth/popup-blocked" })).toBe("auth/popup-blocked");
  });
  it("code が無い・壊れた値は空文字", () => {
    expect(authCode(new Error("x"))).toBe("");
    expect(authCode(null)).toBe("");
    expect(authCode("auth/x")).toBe("");
    expect(authCode({ code: 42 })).toBe("");
  });
});

describe("classifyAuthError", () => {
  it("使用中のアカウントは conflict", () => {
    expect(classifyAuthError("auth/credential-already-in-use")).toBe("conflict");
    expect(classifyAuthError("auth/email-already-in-use")).toBe("conflict");
  });
  it("本人が閉じたのは dismissed", () => {
    expect(classifyAuthError("auth/popup-closed-by-user")).toBe("dismissed");
    expect(classifyAuthError("auth/cancelled-popup-request")).toBe("dismissed");
  });
  it("そのほか", () => {
    expect(classifyAuthError("auth/popup-blocked")).toBe("blocked");
    expect(classifyAuthError("auth/network-request-failed")).toBe("network");
    expect(classifyAuthError("auth/requires-recent-login")).toBe("recent_login");
    expect(classifyAuthError("auth/user-mismatch")).toBe("mismatch");
    expect(classifyAuthError("")).toBe("failed");
    expect(classifyAuthError("auth/internal-error")).toBe("failed");
  });
});

describe("authErrorMessage", () => {
  it("dismissed と conflict は何も出さない", () => {
    expect(authErrorMessage("dismissed")).toBeNull();
    expect(authErrorMessage("conflict")).toBeNull();
  });
  it("ほかは文言を返す", () => {
    for (const k of ["blocked", "network", "mismatch", "recent_login", "failed"] as const) {
      expect(authErrorMessage(k)).toBeTruthy();
    }
  });
});

describe("linkedLimitsText", () => {
  it("会員の上限（記録30・相談30）", () => {
    expect(linkedLimitsText()).toBe("1日の上限も広がっています（記録30・相談30）。");
  });
});

describe("normalizeNickname", () => {
  it("trim する", () => {
    expect(normalizeNickname("  ゆう  ")).toBe("ゆう");
  });
  it("12文字で切る（コードポイントで数える）", () => {
    expect(normalizeNickname("あいうえおかきくけこさしすせそ")).toBe("あいうえおかきくけこさし");
    expect(Array.from(normalizeNickname("😀".repeat(20)))).toHaveLength(12);
  });
  it("空は空", () => {
    expect(normalizeNickname("   ")).toBe("");
  });
});

describe("nicknameHint", () => {
  it("空なら自動の呼び名の説明", () => {
    expect(nicknameHint("", "風見")).toBe(
      "いまは自動の呼び名（風見さん）です。好きな呼び名を入れると、そう呼びます。",
    );
    expect(nicknameHint("  ", "凧")).toContain("凧さん");
  });
  it("入っていればその名前で呼ぶ説明", () => {
    expect(nicknameHint(" ゆう ", "風見")).toBe(
      "「ゆうさん」と呼びます。空にすると、自動の呼び名（風見さん）に戻ります。",
    );
  });
});

describe("分岐", () => {
  it("削除の本人確認は Google だけ", () => {
    expect(needsReauthBeforeDelete(true)).toBe(false);
    expect(needsReauthBeforeDelete(false)).toBe(true);
  });
  it("ログアウトのダイアログ", () => {
    expect(logoutDialogFor(true)).toBe("logoutGuest");
    expect(logoutDialogFor(false)).toBe("logoutLinked");
  });
});

describe("使用中アカウントの文言", () => {
  it("メールがあれば入れる", () => {
    expect(conflictAccountLabel("sakura@example.com")).toBe("「sakura@example.com」のアカウント");
    expect(reloginToast("sakura@example.com")).toBe(
      "sakura@example.com のアカウントに入りました。ゲストの記録は消えました。",
    );
  });
  it("なければ汎用", () => {
    expect(conflictAccountLabel(null)).toBe("そのアカウント");
    expect(reloginToast("")).toBe("Google のアカウントに入りました。ゲストの記録は消えました。");
  });
});

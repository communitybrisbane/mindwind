"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { deleteUser, linkWithPopup, reauthenticateWithPopup, signOut } from "firebase/auth";
import AuthGuard from "@/components/AuthGuard";
import AutoGrowTextarea from "@/components/AutoGrowTextarea";
import Header from "@/components/Header";
import { auth, googleProvider } from "@/lib/db/firebase";
import { SpiralIcon } from "@/components/icons";
import { authedFetch, authedJson, useUser } from "@/lib/db/useUser";
import { emptyProfile, STAGES, type Profile, type Stage } from "@/lib/db/types";

const stageLabels: Record<Stage, string> = {
  student: "学生",
  year1: "社会人1年目",
  year2: "2年目",
  year3plus: "3年目以上",
};

const inputClass =
  "w-full rounded-xl border border-input-border bg-white px-4 py-3 text-[15px] text-ink placeholder:text-ink-tertiary focus:border-accent focus:outline-none";

export default function OnboardingPage() {
  return (
    <Suspense>
      <AuthGuard allowWithoutProfile>
        <OnboardingForm />
      </AuthGuard>
    </Suspense>
  );
}

function OnboardingForm() {
  const router = useRouter();
  // 編集モード（ホームの歯車から ?edit=1 で開く。設定画面を兼ねる）
  const isEdit = useSearchParams().get("edit") === "1";
  const { user, loading } = useUser();
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [saving, setSaving] = useState(false);

  // 保存済みの値があれば復元（編集し直して戻ってきた場合など）
  useEffect(() => {
    if (!user) return;
    authedFetch(user, "/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) setProfile({ ...emptyProfile, ...data.profile });
      })
      .catch(() => {});
  }, [user]);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  async function logout() {
    // ゲストはログアウトするとこの端末の記録に戻れない
    if (
      user?.isGuest &&
      !window.confirm(
        "ログアウトするとゲストの記録には戻れません。残したい場合は先に Google アカウントと連携してください。ログアウトしますか？"
      )
    )
      return;
    await signOut(auth);
    router.replace("/");
  }

  /** ゲスト→Google 連携（uid はそのままなのでデータは全部引き継がれる） */
  async function linkGoogle() {
    const current = auth.currentUser;
    if (!current) return;
    try {
      await linkWithPopup(current, googleProvider);
      window.alert("Google アカウントと連携しました。記録はそのまま引き継がれます。");
      window.location.reload();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code === "auth/credential-already-in-use") {
        window.alert(
          "この Google アカウントは既に MindWind で使われています。一度ログアウトして、その Google アカウントでログインし直してください（ゲストの記録は引き継げません）。"
        );
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        window.alert("連携できませんでした。少し待ってからもう一度試してください。");
      }
    }
  }

  async function deleteAccount() {
    const current = auth.currentUser;
    if (!user || !current) return;
    if (
      !window.confirm(
        "アカウントを削除しますか？ すべての記録・相談履歴が完全に削除され、元に戻せません"
      )
    )
      return;
    try {
      // 直近ログインが古いと deleteUser が requires-recent-login になるため先に再認証する
      await reauthenticateWithPopup(current, googleProvider);
      const res = await authedFetch(user, "/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error(`account ${res.status}`);
      await deleteUser(current);
      router.replace("/");
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        window.alert("削除できませんでした。少し待ってからもう一度試してください。");
      }
    }
  }

  /** スキップ：空のプロフィールを保存して「初回済み」にする（次回からオンボーディングに戻されない） */
  async function skip() {
    if (user) {
      await authedJson(user, "PUT", "/api/profile", emptyProfile).catch(() => {});
    }
    router.push("/home");
  }

  async function save() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await authedJson(user, "PUT", "/api/profile", profile);
      router.push("/home");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto px-6 pb-8 pt-7">
        <h1 className="text-2xl font-semibold text-primary">
          {isEdit ? "プロフィール" : "はじめまして"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          {isEdit ? (
            "いつでも変更できます"
          ) : (
            <>
              あなたに合った答えを返すために、
              <br />
              少しだけ教えてください
            </>
          )}
        </p>

        <div className="mt-7 flex flex-col gap-[22px]">
          <label className="block">
            <span className="text-[13px] font-semibold text-ink">呼び名</span>
            <input
              type="text"
              value={profile.nickname}
              onChange={(e) => set("nickname", e.target.value)}
              placeholder="例：ゆう"
              className={`mt-2 ${inputClass}`}
            />
          </label>

          <label className="block">
            <span className="text-[13px] font-semibold text-ink">
              いましていること{" "}
              <span className="text-xs font-normal text-ink-tertiary">仕事や学業など</span>
            </span>
            <AutoGrowTextarea
              value={profile.activity}
              onChange={(text) => set("activity", text)}
              placeholder="例：営業／大学生"
              className={`mt-2 ${inputClass}`}
            />
          </label>

          <div>
            <span className="text-[13px] font-semibold text-ink">いまのステージ</span>
            <div className="mt-2 flex flex-wrap gap-2.5">
              {STAGES.map((stage) => {
                const active = profile.stage === stage;
                return (
                  <button
                    key={stage}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("stage", active ? null : stage)}
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                      active
                        ? "bg-accent text-white"
                        : "border border-input-border bg-white text-ink"
                    }`}
                  >
                    {stageLabels[stage]}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-[13px] font-semibold text-ink">
              いまの目標・課題{" "}
              <span className="text-xs font-normal text-ink-tertiary">任意・あとからでOK</span>
            </span>
            <AutoGrowTextarea
              value={profile.goal}
              onChange={(text) => set("goal", text)}
              placeholder="例：仕事に早く慣れたい"
              className={`mt-2 ${inputClass}`}
            />
          </label>
        </div>

        <div className="mt-12">
          <button
            type="button"
            aria-label={isEdit ? "保存する" : "はじめる"}
            onClick={save}
            disabled={loading || saving}
            className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-white disabled:opacity-60"
          >
            <SpiralIcon className="h-5 w-9" />
          </button>
          {!isEdit && (
            <button
              type="button"
              onClick={() => void skip()}
              className="mx-auto mt-4 block text-[13px] text-ink-secondary underline"
            >
              あとで入力する
            </button>
          )}
          {isEdit && (
            <div className="mt-8 flex flex-col items-center gap-4 border-t border-ceramic pt-6">
              {user?.isGuest && (
                <button
                  type="button"
                  onClick={() => void linkGoogle()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[13px] font-bold text-primary">
                    G
                  </span>
                  Google アカウントと連携してデータを残す
                </button>
              )}
              <button
                type="button"
                onClick={() => void logout()}
                className="text-sm text-ink-secondary underline"
              >
                ログアウト
              </button>
              {/* 誤タップ防止のため保存ボタンから最も遠い最下部に置く */}
              <button
                type="button"
                onClick={() => void deleteAccount()}
                className="text-sm text-error underline"
              >
                アカウントを削除
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

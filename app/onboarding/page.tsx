"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Header from "@/components/Header";
import { SpiralIcon } from "@/components/icons";
import { authedFetch, useUser } from "@/lib/db/useUser";
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
      <OnboardingForm />
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

  async function save() {
    if (!user || saving) return;
    setSaving(true);
    try {
      await authedFetch(user, "/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
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
            <input
              type="text"
              value={profile.activity}
              onChange={(e) => set("activity", e.target.value)}
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
            <input
              type="text"
              value={profile.goal}
              onChange={(e) => set("goal", e.target.value)}
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
              onClick={() => router.push("/home")}
              className="mx-auto mt-4 block text-[13px] text-ink-secondary underline"
            >
              あとで入力する
            </button>
          )}
          {/* 編集モードのアカウント管理（ログアウト・削除）は Phase 6 で追加 */}
        </div>
      </main>
    </>
  );
}

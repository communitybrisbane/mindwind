"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { requestToast } from "@/components/Toast";
import type { ShapedRecord } from "@/lib/db/types";
import { authedFetch, authedJson, type AppUser } from "@/lib/db/useUser";
import type { Thought } from "./page";

/** 保存済み記録の編集・削除（最近の記録・カレンダーの両方からここに集約） */
export function useThoughtEditing(
  user: AppUser | null,
  setThoughts: Dispatch<SetStateAction<Thought[] | null>>
) {
  const [editing, setEditing] = useState<Thought | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  function startEdit(thought: Thought) {
    setEditError("");
    setEditing(thought);
  }

  function closeEdit() {
    setEditing(null);
  }

  // 編集を保存：サーバーが embedding を作り直す。ローカルの thoughts も更新
  async function saveEdit(shaped: ShapedRecord) {
    if (!user || !editing || editSaving) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await authedJson(user, "PUT", `/api/thoughts/${editing.id}`, { shaped });
      if (!res.ok) throw new Error(`update ${res.status}`);
      setThoughts((t) =>
        t?.map((thought) => (thought.id === editing.id ? { ...thought, ...shaped } : thought)) ?? t
      );
      setEditing(null);
      requestToast("記録を更新しました");
    } catch {
      setEditError("保存できませんでした。少し待ってからもう一度試してください。");
    } finally {
      setEditSaving(false);
    }
  }

  // 削除するとカレンダーの点灯・ストリークも state 経由で自動再計算される
  async function deleteThought(id: string) {
    if (!user) return;
    if (!window.confirm("この記録を削除しますか？ 削除すると元に戻せません。")) return;
    try {
      const res = await authedFetch(user, `/api/thoughts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      setThoughts((t) => t?.filter((thought) => thought.id !== id) ?? t);
    } catch {
      window.alert("削除できませんでした。少し待ってからもう一度試してください。");
    }
  }

  return { editing, editSaving, editError, startEdit, closeEdit, saveEdit, deleteThought };
}

"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import ConsultInput from "@/components/consult/ConsultInput";
import ConsultThread from "@/components/consult/ConsultThread";
import RefModal from "@/components/consult/RefModal";
import styles from "@/components/consult/consult.module.css";
import { Desk } from "@/components/ui/Desk";
import { Dialog } from "@/components/ui/Dialog";
import { Paper } from "@/components/ui/Paper";
import { RoundButton } from "@/components/ui/RoundButton";
import { showToast } from "@/components/ui/Toast";
import { useUser } from "@/lib/db/useUser";
import { sound, vibrate } from "@/lib/ui/feedback";
import { useConsultChat, type ChatSummary, type RefPage } from "./useConsultChat";

/** ISO 文字列 → "10/23"（不正な日付は ""） */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${d.getMonth() + 1}/${d.getDate()}`;
}

/** これまでの相談（左から出る紙。スレッドを開く・消す・新しい相談） */
function HistoryDrawer({
  chats,
  loading,
  currentChatId,
  onSelect,
  onDelete,
  onNewChat,
  onClose,
}: {
  chats: ChatSummary[];
  loading: boolean;
  currentChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (chat: ChatSummary) => void;
  onNewChat: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className={styles.drawerScrim}
      role="dialog"
      aria-modal="true"
      aria-label="これまでの相談"
      onClick={onClose}
    >
      <div className={styles.drawerShell}>
        <div className={styles.drawerBox} onClick={(e) => e.stopPropagation()}>
          <Paper className={styles.drawer}>
            <h2 className={styles.drawerTitle}>これまでの相談</h2>
            <ul className={styles.drawerList}>
              {chats.length === 0 ? (
                <li className={styles.drawerEmpty}>
                  {loading ? "読み込んでいます…" : "まだ相談はありません"}
                </li>
              ) : (
                chats.map((chat) => (
                  <li
                    key={chat.id}
                    className={`${styles.drawerItem} ${chat.id === currentChatId ? styles.current : ""}`}
                  >
                    <button
                      type="button"
                      className={styles.drawerOpen}
                      onClick={() => onSelect(chat.id)}
                      aria-current={chat.id === currentChatId ? "true" : undefined}
                    >
                      <span className={styles.drawerItemTitle}>{chat.title || "（無題の相談）"}</span>
                      <span className={styles.drawerItemDate}>{shortDate(chat.updatedAt)}</span>
                    </button>
                    <RoundButton
                      variant="ink"
                      icon="trash"
                      aria-label={`「${chat.title || "無題の相談"}」を消す`}
                      onClick={() => onDelete(chat)}
                    />
                  </li>
                ))
              )}
            </ul>
            <div className={styles.drawerFoot}>
              <RoundButton variant="ink" icon="check" label="とじる" aria-label="とじる" onClick={onClose} />
              <RoundButton
                variant="green"
                icon="pencil"
                label="新しい相談"
                aria-label="新しい相談"
                onClick={onNewChat}
              />
            </div>
          </Paper>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SearchInner() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  // 手紙の「相談する」から来たときの下書き（入れるだけで送らない）
  const [draft] = useState(() => searchParams.get("draft") ?? "");
  const {
    chatId,
    messages,
    chats,
    chatsLoading,
    thinking,
    streaming,
    limitReached,
    send,
    loadChats,
    selectChat,
    startNewChat,
    deleteChat,
  } = useConsultChat(user);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refPage, setRefPage] = useState<RefPage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatSummary | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 下書きは一度入れたら URL から外す（再読み込みで二重に入らないように）
  useEffect(() => {
    if (!draft) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("draft");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, [draft]);

  const followBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const closeRef = useCallback(() => setRefPage(null), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  function openRef(ref: RefPage) {
    vibrate(10);
    sound("pop");
    setRefPage(ref);
  }

  function openDrawer() {
    sound("rub");
    setDrawerOpen(true);
    void loadChats();
  }

  function newChat() {
    sound("rub");
    startNewChat();
    setDrawerOpen(false);
  }

  async function pickChat(id: string) {
    setDrawerOpen(false);
    const ok = await selectChat(id);
    if (!ok) showToast("相談をひらけませんでした");
  }

  async function confirmDelete(chat: ChatSummary) {
    const ok = await deleteChat(chat.id);
    showToast(ok ? "相談を消したよ" : "消せませんでした。少し待ってからもう一度試してね");
  }

  const current = chats.find((c) => c.id === chatId);
  const firstAsk = messages.find((m) => m.role === "user")?.text ?? "";
  const threadTitle = current?.title || firstAsk.slice(0, 20) || "新しい相談";

  return (
    <Desk className={styles.page}>
      <div className={styles.bar}>
        <h1 className={styles.thread}>{threadTitle}</h1>
        <RoundButton variant="chalk" icon="stack" aria-label="これまでの相談" onClick={openDrawer} />
        <RoundButton variant="chalk" icon="pencil" aria-label="新しい相談" onClick={newChat} />
      </div>

      <ConsultThread
        messages={messages}
        thinking={thinking}
        onSelectRef={openRef}
        scrollRef={scrollRef}
      />

      <div className={styles.inputWrap}>
        {limitReached &&
          (user?.isGuest ? (
            <p className={styles.notice}>
              今日のゲストの上限に達しました。
              <Link href="/settings">Google アカウントと連携</Link>
              するともっと相談できます
            </p>
          ) : (
            <p className={styles.notice}>今日の相談はここまで。また明日話そう</p>
          ))}
        <ConsultInput
          initial={draft}
          disabled={limitReached}
          busy={thinking || streaming}
          placeholder={messages.length === 0 ? "いま思っていること" : "続きを書く"}
          onSend={send}
          onResize={followBottom}
        />
      </div>

      {drawerOpen && (
        <HistoryDrawer
          chats={chats}
          loading={chatsLoading}
          currentChatId={chatId}
          onSelect={(id) => void pickChat(id)}
          onDelete={(chat) => {
            // 確認の紙は机の上に出るので、そのあいだドロワーは閉じておく（閉じたら戻す）
            setDrawerOpen(false);
            setPendingDelete(chat);
          }}
          onNewChat={newChat}
          onClose={closeDrawer}
        />
      )}

      <RefModal page={refPage} onClose={closeRef} />

      <Dialog
        open={pendingDelete !== null}
        title="この相談を消しますか？"
        text={
          <>
            「{pendingDelete?.title || "無題の相談"}」のやりとりを、<b>すべて完全に消します</b>。元に戻せません。
            <br />
            <br />
            消すときは、右の赤いボタンを<b>長押し</b>します。
          </>
        }
        buttons={[
          { icon: "undo", label: "やめる", onPress: () => {} },
          {
            icon: "trash",
            label: "消す",
            variant: "warn",
            hold: true,
            onPress: () => {
              if (pendingDelete) void confirmDelete(pendingDelete);
            },
          },
        ]}
        onClose={() => {
          setPendingDelete(null);
          setDrawerOpen(true);
        }}
      />
    </Desk>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchInner />
    </Suspense>
  );
}

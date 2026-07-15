"use client";

import { TrashIcon } from "./icons";

export type ChatSummary = { id: string; title: string; updatedAt: string | null };

type Props = {
  chats: ChatSummary[];
  currentChatId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
};

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 相談履歴ドロワー（左からスライドイン・背景タップで閉じる） */
export default function ChatHistoryDrawer({
  chats,
  currentChatId,
  onSelect,
  onDelete,
  onNewChat,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-30 flex justify-center bg-black/40" onClick={onClose}>
      {/* アプリシェル幅に合わせてドロワーを左端に出す */}
      <div className="flex h-full w-full max-w-[430px] justify-start">
        <div
          className="flex h-full w-[78%] max-w-[335px] flex-col bg-warm p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onNewChat}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-semibold text-white"
          >
            ＋ 新しい相談
          </button>
          <h2 className="mt-5 text-[13px] font-semibold text-ink-secondary">相談履歴</h2>
          <ul className="mt-2 flex-1 overflow-y-auto">
            {chats.length === 0 && (
              <li className="py-3 text-sm text-ink-secondary">まだ相談履歴がありません</li>
            )}
            {chats.map((chat) => (
              <li key={chat.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(chat.id)}
                  className={`flex min-h-11 flex-1 items-center gap-2 rounded-lg px-2.5 text-left ${
                    chat.id === currentChatId ? "bg-leaf" : ""
                  }`}
                >
                  <span className="flex-1 truncate text-sm text-ink">{chat.title}</span>
                  <span className="flex-none text-xs text-ink-tertiary">
                    {formatUpdatedAt(chat.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="この相談履歴を削除"
                  onClick={() => onDelete(chat.id)}
                  className="flex h-8 w-8 flex-none items-center justify-center text-ink-tertiary"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

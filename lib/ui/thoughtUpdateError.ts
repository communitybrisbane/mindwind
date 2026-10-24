import type { ApiError } from "@/lib/api/contracts";

export const CONFLICT_MESSAGE = "別の画面で先にこの記録が直されたみたい。開き直してから、もう一度試してね。";
export const NOT_FOUND_MESSAGE = "この記録は見つかりませんでした。";
export const SAVE_FAILED_MESSAGE = "保存できませんでした。少し待ってからもう一度試してください。";

/** 記録の更新（PUT /api/thoughts/:id）が失敗したときの文言。
 *  own＝呼び出し側だけが持つエラーコードごとの文言（先に見る）。続いて競合・404・その他の順 */
export function thoughtUpdateErrorMessage(
  status: number,
  data: ApiError | null,
  own: Partial<Record<ApiError["error"], string>> = {},
): string {
  const code = data?.error;
  if (code !== undefined && own[code] !== undefined) return own[code] as string;
  if (code === "conflict") return CONFLICT_MESSAGE;
  if (status === 404) return NOT_FOUND_MESSAGE;
  return SAVE_FAILED_MESSAGE;
}

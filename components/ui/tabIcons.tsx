// タブバーの3タブの定義と、タブバーを隠すパスの判定（タスク46）。
// 見た目の正は docs/prototype/ui-v5.html の #tabs（ホーム=stack／記録=book／相談=swirl）。
// 描画は components/TabBar.tsx。ここは純粋なデータと関数だけ（Vitest で確かめる）。

import type { IconName } from "./iconPaths";

export type TabDef = {
  href: "/home" | "/record" | "/search";
  label: "ホーム" | "記録" | "相談";
  /** ホーム=束ねた紙／記録=開いたノート／相談=風の渦 */
  icon: IconName;
};

export const TABS: readonly TabDef[] = [
  { href: "/home", label: "ホーム", icon: "stack" },
  { href: "/record", label: "記録", icon: "book" },
  { href: "/search", label: "相談", icon: "swirl" },
] as const;

/**
 * タブバーを出さない画面（回転盤・一言・手紙・風の記録・設定）。
 * いまは (full) グループに置かれるので (tabs) には来ないが、
 * ルートが移っても隠れるようにパスでも判定する。
 */
export const TABBAR_HIDDEN_PREFIXES = ["/mood", "/letter", "/wind", "/settings"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** このパスでタブバーを隠すか（/mood・/mood/write・/letter・/wind・/settings とその配下） */
export function isTabBarHidden(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return TABBAR_HIDDEN_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

/** 選択中のタブの href（どれにも当たらなければ null） */
export function activeTabHref(pathname: string | null | undefined): TabDef["href"] | null {
  if (!pathname) return null;
  return TABS.find((t) => matchesPrefix(pathname, t.href))?.href ?? null;
}

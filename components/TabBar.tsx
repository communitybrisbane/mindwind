"use client";

// 3タブのタブバー（タスク46・新 UI v5）。(tabs)/layout.tsx だけが置く。
// 見た目の正は docs/prototype/ui-v5.html の #tabs：
//   地は --color-tabbar（革の机より暗い緑）・上に細いクリーム色の線、
//   アイコンは鉛筆の線（Icon が #pencil フィルターを持つ）、選択中は金の点線の枠。
// 回転盤・一言・手紙・風の記録・設定の画面では隠す（パスで判定。tabIcons.ts）。

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { TABS, activeTabHref, isTabBarHidden } from "@/components/ui/tabIcons";
import { sound, vibrate } from "@/lib/ui/feedback";

export default function TabBar() {
  const pathname = usePathname();
  if (isTabBarHidden(pathname)) return null;
  const active = activeTabHref(pathname);

  return (
    <nav
      aria-label="タブ"
      className="relative z-[5] flex flex-none items-start justify-around border-t border-cream/12 bg-tabbar pt-3"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      {TABS.map(({ href, label, icon }) => {
        const on = active === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={on ? "page" : undefined}
            onClick={() => {
              vibrate(8);
              sound("rub");
            }}
            className={`flex h-[54px] w-[76px] items-center justify-center rounded-[14px] text-[30px] transition-colors ${
              on
                ? "border-[1.6px] border-dashed border-gold/50 text-gold"
                : "border-[1.6px] border-transparent text-cream/45"
            }`}
          >
            <Icon name={icon} />
          </Link>
        );
      })}
    </nav>
  );
}

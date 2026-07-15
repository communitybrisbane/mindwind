"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BlocksIcon, HouseIcon, SpiralIcon } from "./icons";

const tabs = [
  { href: "/home", label: "ホーム", Icon: HouseIcon, iconClass: "h-6 w-6" },
  { href: "/record", label: "記録", Icon: BlocksIcon, iconClass: "h-6 w-6" },
  // スパイラル（アプリアイコン）は横長なので幅広で表示する
  { href: "/search", label: "相談", Icon: SpiralIcon, iconClass: "h-[18px] w-8" },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="flex h-14 flex-none border-t border-ceramic bg-white">
      {tabs.map(({ href, label, Icon, iconClass }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center ${
              active ? "text-accent" : "text-ink-tertiary"
            }`}
          >
            <Icon className={iconClass} />
          </Link>
        );
      })}
    </nav>
  );
}

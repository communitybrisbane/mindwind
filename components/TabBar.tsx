"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BlocksIcon, ChatBubbleIcon, SpiralIcon } from "./icons";

const tabs = [
  { href: "/home", label: "ホーム", Icon: SpiralIcon },
  { href: "/record", label: "記録", Icon: BlocksIcon },
  { href: "/search", label: "相談", Icon: ChatBubbleIcon },
] as const;

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="flex h-14 flex-none border-t border-ceramic bg-white">
      {tabs.map(({ href, label, Icon }) => {
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
            <Icon className="h-6 w-6" />
          </Link>
        );
      })}
    </nav>
  );
}

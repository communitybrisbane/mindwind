import AuthGuard from "@/components/AuthGuard";
import TabBar from "@/components/TabBar";
import Desk from "@/components/ui/Desk";

// タブのある3画面（ホーム・記録・相談）の外枠。背景は革の机（Desk）。
// 中身は縦に伸び、タブバーは常に画面下に留まる（シェルは app/layout.tsx の h-dvh）。
export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Desk className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AuthGuard>{children}</AuthGuard>
      </div>
      <TabBar />
    </Desk>
  );
}

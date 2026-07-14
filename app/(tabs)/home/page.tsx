import Header from "@/components/Header";
import Toast from "@/components/Toast";

export default function HomePage() {
  return (
    <>
      <Header />
      <Toast />
      <main className="flex-1 overflow-y-auto p-4">
        <p className="text-sm text-ink-secondary">ホーム（実装予定）</p>
      </main>
    </>
  );
}

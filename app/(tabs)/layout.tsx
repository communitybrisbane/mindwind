import TabBar from "@/components/TabBar";

export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <TabBar />
    </>
  );
}

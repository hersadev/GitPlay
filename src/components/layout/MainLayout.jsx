import Header from './Header';

export default function MainLayout({ children, onReset, onOpenLessons, onToggleSandbox, sandboxMode }) {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Header
        onReset={onReset}
        onOpenLessons={onOpenLessons}
        onToggleSandbox={onToggleSandbox}
        sandboxMode={sandboxMode}
      />
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

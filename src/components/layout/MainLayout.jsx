import Header from './Header';

export default function MainLayout({
  children,
  onReset,
  onOpenLessons,
  onToggleSandbox,
  onOpenBadges,
  onOpenGithub,
  openPRsCount,
  sandboxMode,
  lessonIndex,
  totalLessons,
  earnedCount,
  totalBadges,
}) {
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <Header
        onReset={onReset}
        onOpenLessons={onOpenLessons}
        onToggleSandbox={onToggleSandbox}
        onOpenBadges={onOpenBadges}
        onOpenGithub={onOpenGithub}
        openPRsCount={openPRsCount}
        sandboxMode={sandboxMode}
        lessonIndex={lessonIndex}
        totalLessons={totalLessons}
        earnedCount={earnedCount}
        totalBadges={totalBadges}
      />
      <main className="flex flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

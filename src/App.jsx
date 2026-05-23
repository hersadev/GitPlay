import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from './components/layout/MainLayout';
import GraphView from './components/graph/GraphView';
import Terminal from './components/terminal/Terminal';
import LessonPanel from './components/lesson/LessonPanel';
import LessonSelector from './components/lesson/LessonSelector';
import StatusPanel from './components/status/StatusPanel';
import FileViewer from './components/files/FileViewer';
import BadgesPanel from './components/badges/BadgesPanel';
import BadgeToast from './components/badges/BadgeToast';
import GitHubView from './components/github/GitHubView';
import { useGitStore } from './store/gitStore';
import { useGitEngine } from './hooks/useGitEngine';
import { useTerminalHistory } from './hooks/useTerminalHistory';
import { useLessonProgress } from './hooks/useLessonProgress';
import { useBadges } from './hooks/useBadges';
import { BADGES } from './utils/badges';
import { saveLessonIndex, loadLessonIndex, clearProgress } from './utils/persistence';
import { module1 } from './lessons/module1';
import { module2 } from './lessons/module2';
import { module3 } from './lessons/module3';
import { module4 } from './lessons/module4';
import { module5 } from './lessons/module5';
import { moduleGithub } from './lessons/moduleGithub';

// Orden pedagógico: ramas → GitHub → reescribir historia → equipo avanzado → escenarios reales.
const ALL_LESSONS = [
  ...module1,
  ...module2,
  ...moduleGithub,
  ...module3,
  ...module4,
  ...module5,
];

export default function App() {
  const { repoState, runCommand, resetRepo, seedFiles, editFile, runSetup } = useGitEngine();
  const { lines, pushCommand, pushOutput } = useTerminalHistory();

  const [lessonIndex, setLessonIndex] = useState(() => loadLessonIndex());
  const [showSuccess, setShowSuccess] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [openFile, setOpenFile] = useState(null); // { name, source: 'staged' | 'working' | 'commit', hash? }

  const { openPR, mergePR, closePR } = useGitStore();

  // Track the previous isComplete value to detect false → true transitions only
  const prevIsComplete = useRef(false);

  const currentLesson = sandboxMode ? null : (ALL_LESSONS[lessonIndex] ?? null);
  const { completedCount, isComplete, checkObjective } = useLessonProgress(currentLesson);

  const { earned, recent, reset: resetBadges, dismissRecent } = useBadges({
    repoState,
    lessonIndex,
    totalLessons: ALL_LESSONS.length,
  });

  // Persist lesson index whenever it changes
  useEffect(() => {
    saveLessonIndex(lessonIndex);
  }, [lessonIndex]);

  // Re-check objectives whenever repo state or lesson changes
  useEffect(() => {
    checkObjective(repoState);
  }, [repoState, checkObjective]);

  // Plantar archivos y/o ejecutar setup arbitrario de la lección.
  useEffect(() => {
    if (!currentLesson) return;
    if (currentLesson.setupFiles) seedFiles(currentLesson.setupFiles);
    if (typeof currentLesson.setup === 'function') runSetup(currentLesson.setup);
  }, [currentLesson?.id, seedFiles, runSetup]);

  // Advance only when isComplete transitions false → true (not on initial load)
  useEffect(() => {
    const wasComplete = prevIsComplete.current;
    prevIsComplete.current = isComplete;

    if (!isComplete || wasComplete) return;
    if (lessonIndex >= ALL_LESSONS.length - 1) return;

    setShowSuccess(true);
    const timer = setTimeout(() => {
      setShowSuccess(false);
      setLessonIndex((i) => i + 1);
    }, 2200);

    return () => clearTimeout(timer);
  }, [isComplete, lessonIndex]);

  function handleCommand(input) {
    pushCommand(input);
    const result = runCommand(input);
    pushOutput(result.output, result.ok ? 'success' : 'error');
  }

  function handleReset() {
    clearProgress();
    resetRepo();
    resetBadges();
    setLessonIndex(0);
    prevIsComplete.current = false;
    setSandboxMode(false);
    setSelectorOpen(false);
    setBadgesOpen(false);
    // Forzar re-seed: si lessonIndex ya era 0, el useEffect no se redispararía.
    if (ALL_LESSONS[0]?.setupFiles) seedFiles(ALL_LESSONS[0].setupFiles);
  }

  function handleSelectLesson(index) {
    setLessonIndex(index);
    setSandboxMode(false);
    setSelectorOpen(false);
    prevIsComplete.current = false;
  }

  function handleToggleSandbox() {
    setSandboxMode((m) => !m);
    setSelectorOpen(false);
  }

  return (
    <MainLayout
      onReset={handleReset}
      onOpenLessons={() => setSelectorOpen(true)}
      onToggleSandbox={handleToggleSandbox}
      onOpenBadges={() => setBadgesOpen(true)}
      onOpenGithub={() => setGithubOpen(true)}
      openPRsCount={(repoState.pullRequests ?? []).filter((p) => p.state === 'open').length}
      sandboxMode={sandboxMode}
      lessonIndex={lessonIndex}
      totalLessons={ALL_LESSONS.length}
      earnedCount={earned.size}
      totalBadges={BADGES.length}
    >
      {sandboxMode ? (
        <aside className="w-80 flex flex-col gap-3 p-4 bg-gray-900 border-r border-gray-700">
          <span className="text-xs text-yellow-400 uppercase tracking-wider">Modo Sandbox</span>
          <h2 className="text-base font-semibold text-white leading-snug">
            Juega libre con Git
          </h2>
          <p className="text-gray-400 text-sm">
            Sin objetivos, sin auto-avance. Prueba cualquier comando del motor: <code className="text-gray-300">init</code>, <code className="text-gray-300">commit</code>, <code className="text-gray-300">branch</code>, <code className="text-gray-300">merge</code>, <code className="text-gray-300">rebase</code>, <code className="text-gray-300">reflog</code>...
          </p>
          <p className="text-gray-500 text-xs mt-2">
            Pulsa <span className="text-yellow-400">Volver a lecciones</span> para retomar tu progreso.
          </p>
        </aside>
      ) : (
        <LessonPanel
          key={currentLesson?.id}
          lesson={currentLesson}
          lessonIndex={lessonIndex}
          total={ALL_LESSONS.length}
          progress={completedCount}
          isComplete={isComplete}
        />
      )}

      <div className="flex flex-col flex-1 overflow-hidden relative">
        <GraphView
          commits={repoState.commits}
          branches={repoState.branches}
          tags={repoState.tags}
          remoteRefs={repoState.remoteRefs}
          HEAD={repoState.HEAD}
          onOpenFile={(f) => setOpenFile(f)}
        />

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-semibold"
            >
              <span className="text-lg">✓</span>
              ¡Lección completada! Cargando la siguiente…
            </motion.div>
          )}
        </AnimatePresence>

        <Terminal history={lines} onCommand={handleCommand} repoState={repoState} />
      </div>

      <StatusPanel
        repo={repoState}
        onOpenFile={(name, source) => setOpenFile({ name, source })}
      />

      <AnimatePresence>
        {openFile && (
          <FileViewer
            file={openFile}
            repo={repoState}
            onClose={() => setOpenFile(null)}
            onSave={(name, content) => editFile(name, content)}
          />
        )}
      </AnimatePresence>

      {selectorOpen && (
        <LessonSelector
          currentIndex={lessonIndex}
          onSelect={handleSelectLesson}
          onClose={() => setSelectorOpen(false)}
        />
      )}

      <AnimatePresence>
        {badgesOpen && (
          <BadgesPanel earned={earned} onClose={() => setBadgesOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {githubOpen && (
          <GitHubView
            repo={repoState}
            onClose={() => setGithubOpen(false)}
            onOpenPR={openPR}
            onMergePR={mergePR}
            onClosePR={closePR}
            onOpenFile={(f) => setOpenFile(f)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recent && <BadgeToast badge={recent} onClose={dismissRecent} />}
      </AnimatePresence>
    </MainLayout>
  );
}

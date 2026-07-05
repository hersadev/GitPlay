import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MainLayout from './components/layout/MainLayout';
import ResizeHandle from './components/layout/ResizeHandle';
import GraphView from './components/graph/GraphView';
import Terminal from './components/terminal/Terminal';
import LessonPanel from './components/lesson/LessonPanel';
import LessonSelector from './components/lesson/LessonSelector';
import StatusPanel from './components/status/StatusPanel';
import FileViewer from './components/files/FileViewer';
import BadgesPanel from './components/badges/BadgesPanel';
import BadgeModal from './components/badges/BadgeModal';
import GitHubView from './components/github/GitHubView';
import CommandLog from './components/commands/CommandLog';
import WelcomeModal from './components/onboarding/WelcomeModal';
import ModuleIntroModal from './components/lesson/ModuleIntroModal';
import StuckHelpModal from './components/lesson/StuckHelpModal';
import { useGitStore } from './store/gitStore';
import { useGitEngine } from './hooks/useGitEngine';
import { useTerminalHistory } from './hooks/useTerminalHistory';
import { useLessonProgress } from './hooks/useLessonProgress';
import { useBadges } from './hooks/useBadges';
import { BADGES } from './utils/badges';
import { extractModuleCommands } from './utils/commandInfo';
import { equivalentCommandWarning } from './utils/commandEquivalents';
import { splitChainedCommands } from './engine/CommandParser';
import {
  saveLessonIndex,
  loadLessonIndex,
  saveLessonMax,
  loadLessonMax,
  clearProgress,
  loadWelcomeSeen,
  saveWelcomeSeen,
  loadSeenModuleIntros,
  saveSeenModuleIntros,
} from './utils/persistence';
import { ALL_LESSONS, MODULES, LESSON_MODULE_INDEX } from './lessons';

const clampWidth = (px, min, max) => Math.max(min, Math.min(max, px));

// Lista los archivos "en disco": árbol del commit actual + staging + working dir.
function listFiles(repo) {
  const names = new Set();
  const tipHash = repo.branches.get(repo.HEAD) ?? (repo.commits.has(repo.HEAD) ? repo.HEAD : null);
  const tree = tipHash ? repo.commits.get(tipHash)?.tree : null;
  if (tree instanceof Map) tree.forEach((_, name) => names.add(name));
  repo.stagingArea.forEach((_, name) => names.add(name));
  repo.workingDirectory.forEach((_, name) => names.add(name));
  return [...names].sort().join('\n');
}

// Lecciones que cuentan para el 100% del curso: las opcionales (el puente a
// Git real) quedan fuera del contador y de la barra de progreso del header.
const CORE_LESSONS = ALL_LESSONS.filter((l) => !l.optional).length;

// Errores de terminal SEGUIDOS en la misma lección antes de abrir el modal de
// ayuda (cualquier comando que funcione reinicia la racha).
const STUCK_ERROR_THRESHOLD = 4;

export default function App() {
  const { repoState, runCommand, resetRepo, seedFiles, editFile, runSetup } = useGitEngine();
  const { lines, pushCommand, pushOutput, clear: clearTerminal } = useTerminalHistory();

  const [lessonIndex, setLessonIndex] = useState(() => loadLessonIndex());
  const [maxReached, setMaxReached] = useState(() => Math.max(loadLessonIndex(), loadLessonMax()));
  const [showSuccess, setShowSuccess] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [openFile, setOpenFile] = useState(null); // { name, source: 'staged' | 'working' | 'commit', hash? }
  // Bienvenida: solo para usuarios nuevos (o tras reiniciar el juego).
  const [welcomeOpen, setWelcomeOpen] = useState(() => !loadWelcomeSeen());
  // Aviso de comandos: se muestra UNA vez al empezar cada módulo.
  const [moduleIntroOpen, setModuleIntroOpen] = useState(false);
  // Modal de ayuda tras varios errores seguidos en la lección actual.
  const [stuckOpen, setStuckOpen] = useState(false);
  const [seenModuleIntros, setSeenModuleIntros] = useState(() => new Set(loadSeenModuleIntros()));
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(240);
  const [terminalHeight, setTerminalHeight] = useState(192);

  const { openPR, mergePR, closePR, createFile, usedCommands } = useGitStore();

  // Track the previous isComplete value to detect false → true transitions only
  const prevIsComplete = useRef(false);
  // Racha de errores consecutivos del terminal (se rearma al acertar).
  const errorStreak = useRef(0);

  const currentLesson = sandboxMode ? null : (ALL_LESSONS[lessonIndex] ?? null);
  const { completedCount, isComplete, checkObjective } = useLessonProgress(currentLesson);

  const { earned, recent, reset: resetBadges, dismissRecent } = useBadges({
    repoState,
    lessonIndex,
    totalLessons: ALL_LESSONS.length,
    isComplete,
  });

  const currentModule = currentLesson ? MODULES[LESSON_MODULE_INDEX[lessonIndex]] ?? null : null;
  const moduleCommands = currentModule ? extractModuleCommands(currentModule) : [];

  // Al entrar por primera vez en un módulo, avisar de los comandos que se
  // van a usar. Solo una vez por módulo (persistido): ni recargas, ni cierres
  // de otros modales, ni volver a entrar desde el selector lo reabren.
  // Espera a que no haya otro modal a pantalla completa abierto (bienvenida
  // o logro) para no solaparse con ellos.
  useEffect(() => {
    if (!currentModule || welcomeOpen || recent) return;
    if (moduleCommands.length === 0) return;
    if (seenModuleIntros.has(currentModule.id)) return;
    setModuleIntroOpen(true);
  }, [currentModule, welcomeOpen, recent, moduleCommands.length, seenModuleIntros]);

  // Persist lesson index (y el máximo alcanzado, para el desbloqueo del selector)
  useEffect(() => {
    saveLessonIndex(lessonIndex);
    if (lessonIndex > maxReached) {
      setMaxReached(lessonIndex);
      saveLessonMax(lessonIndex);
    }
  }, [lessonIndex, maxReached]);

  // Re-check objectives whenever repo state or lesson changes
  useEffect(() => {
    checkObjective(repoState);
  }, [repoState, checkObjective]);

  // Plantar archivos y/o ejecutar setup arbitrario de la lección.
  useEffect(() => {
    if (!currentLesson) return;
    if (currentLesson.setupFiles) seedFiles(currentLesson.setupFiles);
    if (typeof currentLesson.setup === 'function') runSetup(currentLesson.setup);
  }, [currentLesson, seedFiles, runSetup]);

  // Al cambiar de lección (o entrar al sandbox) se olvida la racha de errores.
  useEffect(() => {
    errorStreak.current = 0;
  }, [currentLesson?.id]);

  // Advance only when isComplete transitions false → true (not on initial load).
  // Al completar la última lección avanza a ALL_LESSONS.length: el panel muestra
  // la pantalla de graduación y la barra de progreso llega al 100%.
  useEffect(() => {
    const wasComplete = prevIsComplete.current;
    prevIsComplete.current = isComplete;

    if (!isComplete || wasComplete) return;
    if (lessonIndex >= ALL_LESSONS.length) return;

    setShowSuccess(true);
    const timer = setTimeout(() => {
      setShowSuccess(false);
      setLessonIndex((i) => Math.min(i + 1, ALL_LESSONS.length));
    }, 2200);

    return () => clearTimeout(timer);
  }, [isComplete, lessonIndex]);

  // Un error más en la racha: al llegar al umbral, abrir el modal de ayuda de
  // la lección y rearmar el contador (si sigue fallando, volverá a salir).
  function registerCommandError() {
    if (!currentLesson || currentLesson.optional || !currentLesson.hints?.length) return;
    errorStreak.current += 1;
    if (errorStreak.current >= STUCK_ERROR_THRESHOLD) {
      errorStreak.current = 0;
      setStuckOpen(true);
    }
  }

  // Ejecuta una línea del terminal: soporta ls/touch/clear y comandos
  // encadenados con && (como aparecen en muchas pistas).
  function handleCommand(input) {
    pushCommand(input);
    const parts = splitChainedCommands(input);

    for (const part of parts) {
      if (part === 'clear') {
        clearTerminal();
        continue;
      }
      if (part === 'ls') {
        const repo = useGitStore.getState().repoState;
        pushOutput(listFiles(repo) || '(no hay archivos todavía)', 'success');
        continue;
      }
      if (part === 'touch' || part.startsWith('touch ')) {
        const names = part.slice(5).trim().split(/\s+/).filter(Boolean);
        if (!names.length) {
          pushOutput('Uso: touch <archivo>', 'error');
          registerCommandError();
          return;
        }
        names.forEach((n) => createFile(n));
        continue;
      }
      const result = runCommand(part);
      if (result.output) pushOutput(result.output, result.ok ? 'success' : 'error');
      if (result.ok) {
        const warning = equivalentCommandWarning(part, result, currentLesson);
        if (warning) pushOutput(warning, 'info');
      }
      // Como en la shell, && corta la cadena en el primer error.
      if (!result.ok) {
        // Si el comando dejó conflictos pendientes, abrir el resolutor visual
        // sobre el primer archivo en conflicto. Un conflicto no es una
        // equivocación (es parte de la lección): no cuenta para la racha.
        if (/^git (merge|pull|rebase)\b/.test(part)) {
          const repo = useGitStore.getState().repoState;
          const conflicts = repo.mergeState?.conflicts ?? repo.rebaseState?.conflicts;
          if (conflicts?.size) {
            setOpenFile({ name: [...conflicts][0], source: 'working' });
            return;
          }
        }
        registerCommandError();
        return;
      }
    }

    // La línea entera funcionó: la racha de errores se corta.
    errorStreak.current = 0;

    // Lecciones con setup "vivo" (liveSetup): el escenario se re-evalúa tras
    // cada comando para reaccionar al estado del repo (p. ej. en gh-l6 la
    // compañera vuelve a editar si su commit se integró sin conflicto).
    // Los setups son idempotentes, así que re-ejecutarlos es seguro.
    if (currentLesson?.liveSetup && typeof currentLesson.setup === 'function') {
      runSetup(currentLesson.setup);
    }
  }

  function handleReset() {
    clearProgress();
    resetRepo();
    resetBadges();
    clearTerminal();
    setLessonIndex(0);
    setMaxReached(0);
    prevIsComplete.current = false;
    errorStreak.current = 0;
    setStuckOpen(false);
    setSandboxMode(false);
    setSelectorOpen(false);
    setBadgesOpen(false);
    setCommandsOpen(false);
    setModuleIntroOpen(false);
    setSeenModuleIntros(new Set()); // clearProgress ya borró la clave persistida
    setWelcomeOpen(true); // empezar de cero: mostrar la bienvenida de nuevo
    // Forzar re-seed: si lessonIndex ya era 0, el useEffect no se redispararía.
    if (ALL_LESSONS[0]?.setupFiles) seedFiles(ALL_LESSONS[0].setupFiles);
  }

  function handleCloseWelcome() {
    saveWelcomeSeen();
    setWelcomeOpen(false);
  }

  // Al cerrar el aviso de comandos, dejar constancia de que este módulo ya lo mostró.
  function handleCloseModuleIntro() {
    if (currentModule) {
      const next = new Set(seenModuleIntros);
      next.add(currentModule.id);
      setSeenModuleIntros(next);
      saveSeenModuleIntros([...next]);
    }
    setModuleIntroOpen(false);
  }

  function handleSelectLesson(index) {
    if (index > maxReached) return; // bloqueada: aún no alcanzada
    setLessonIndex(index);
    setSandboxMode(false);
    setSelectorOpen(false);
    prevIsComplete.current = false;
  }

  // Las lecciones opcionales (puente a Git real) no tienen objetivos validables:
  // se completan o saltan manualmente con los botones del panel.
  function handleCompleteOptional() {
    prevIsComplete.current = false;
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setLessonIndex((i) => Math.min(i + 1, ALL_LESSONS.length));
    }, 1200);
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
      onOpenCommands={() => setCommandsOpen(true)}
      usedCommandsCount={Object.keys(usedCommands).length}
      onOpenGithub={() => setGithubOpen(true)}
      openPRsCount={(repoState.pullRequests ?? []).filter((p) => p.state === 'open').length}
      sandboxMode={sandboxMode}
      lessonIndex={Math.min(lessonIndex, CORE_LESSONS)}
      totalLessons={CORE_LESSONS}
      earnedCount={earned.size}
      totalBadges={BADGES.length}
    >
      <div style={{ width: leftWidth }} className="flex flex-shrink-0 [&>aside]:w-full">
      {sandboxMode ? (
        <aside className="w-80 flex flex-col gap-3 p-4 bg-gray-900 border-r border-gray-700">
          <span className="text-xs text-yellow-400 uppercase tracking-wider">Modo Sandbox</span>
          <h2 className="text-base font-semibold text-white leading-snug">
            Juega libre con Git
          </h2>
          <p className="text-gray-400 text-sm">
            Sin objetivos, sin auto-avance. Prueba cualquier comando del motor: <code className="text-gray-300">init</code>, <code className="text-gray-300">commit</code>, <code className="text-gray-300">branch</code>, <code className="text-gray-300">merge</code>, <code className="text-gray-300">rebase</code>, <code className="text-gray-300">reflog</code>...
          </p>
          <p className="text-gray-500 text-xs">
            Crea archivos con <code className="text-gray-300">touch archivo.js</code>, lístalos con <code className="text-gray-300">ls</code> y limpia el terminal con <code className="text-gray-300">clear</code>.
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
          onCompleteOptional={handleCompleteOptional}
        />
      )}
      </div>

      <ResizeHandle onResize={(dx) => setLeftWidth((w) => clampWidth(w + dx, 240, 560))} />

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

        <ResizeHandle
          orientation="horizontal"
          onResize={(dy) => setTerminalHeight((h) => clampWidth(h - dy, 96, 560))}
        />

        <div style={{ height: terminalHeight }} className="flex-shrink-0 [&>div]:h-full">
          <Terminal history={lines} onCommand={handleCommand} repoState={repoState} />
        </div>
      </div>

      <ResizeHandle onResize={(dx) => setRightWidth((w) => clampWidth(w - dx, 200, 520))} />

      <div style={{ width: rightWidth }} className="flex flex-shrink-0 [&>aside]:w-full">
        <StatusPanel
          repo={repoState}
          onOpenFile={(name, source) => setOpenFile({ name, source })}
          onStage={(name) => handleCommand(`git add ${name}`)}
          onUnstage={(name) => handleCommand(`git restore --staged ${name}`)}
        />
      </div>

      <AnimatePresence>
        {openFile && (
          <FileViewer
            file={openFile}
            repo={repoState}
            onClose={() => setOpenFile(null)}
            onSave={(name, content) => editFile(name, content)}
            onMarkResolved={(name) => handleCommand(`git add ${name}`)}
          />
        )}
      </AnimatePresence>

      {selectorOpen && (
        <LessonSelector
          currentIndex={lessonIndex}
          maxUnlockedIndex={maxReached}
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
        {commandsOpen && (
          <CommandLog usedCommands={usedCommands} onClose={() => setCommandsOpen(false)} />
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
        {stuckOpen && currentLesson && (
          <StuckHelpModal
            lesson={currentLesson}
            progress={completedCount}
            onClose={() => setStuckOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recent && <BadgeModal badge={recent} onClose={dismissRecent} />}
      </AnimatePresence>

      <AnimatePresence>
        {welcomeOpen && <WelcomeModal onClose={handleCloseWelcome} />}
      </AnimatePresence>

      <AnimatePresence>
        {moduleIntroOpen && (
          <ModuleIntroModal
            moduleDef={currentModule}
            commands={moduleCommands}
            onClose={handleCloseModuleIntro}
          />
        )}
      </AnimatePresence>
    </MainLayout>
  );
}

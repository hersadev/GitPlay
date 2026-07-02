// Información de cada comando soportado por el simulador.
// La usan la ayuda del terminal (git <cmd> --help) y la libreta de comandos
// (repaso de todo lo que el alumno ya ha utilizado).

export const COMMAND_INFO = {
  init: {
    usage: 'git init',
    desc: 'Convierte la carpeta actual en un repositorio Git. Es siempre el primer paso: crea la "caja" donde Git guardará toda la historia.',
  },
  clone: {
    usage: 'git clone <url>',
    desc: 'Descarga un repositorio remoto completo (historia incluida) y lo deja listo para trabajar en local.',
  },
  status: {
    usage: 'git status',
    desc: 'Tu brújula: muestra en qué rama estás, qué archivos están preparados (staging), cuáles modificados y cuáles sin seguimiento.',
  },
  add: {
    usage: 'git add <archivo> · git add .',
    desc: 'Prepara archivos para el próximo commit moviéndolos al staging area. Con "." prepara todos los cambios de golpe.',
  },
  commit: {
    usage: 'git commit -m "mensaje" · git commit --amend -m "mensaje"',
    desc: 'Guarda una foto permanente de lo que hay en el staging. Con --amend reemplaza el último commit (corrige mensaje o añade archivos olvidados) — solo antes de hacer push.',
  },
  log: {
    usage: 'git log',
    desc: 'Muestra la línea de tiempo del proyecto: la lista de commits alcanzables desde donde estás, del más nuevo al más viejo.',
  },
  diff: {
    usage: 'git diff · git diff --staged',
    desc: 'Enseña línea a línea qué cambió: sin flags compara tu working directory; con --staged, lo que ya está preparado para commit.',
  },
  branch: {
    usage: 'git branch · git branch <nombre> · git branch -d <nombre>',
    desc: 'Sin argumentos lista las ramas (la actual con *). Con nombre crea una rama nueva; con -d borra una ya integrada.',
  },
  checkout: {
    usage: 'git checkout <rama|hash> · git checkout -b <rama>',
    desc: 'La forma clásica de moverse: cambia de rama o viaja a un commit (HEAD desacoplado). Con -b crea la rama y entra en un paso.',
  },
  switch: {
    usage: 'git switch <rama> · git switch -c <rama>',
    desc: 'La forma moderna de cambiar de rama. Con -c crea la rama y se mueve a ella en un solo paso.',
  },
  merge: {
    usage: 'git merge <rama>',
    desc: 'Integra los commits de otra rama en la actual. Puede ser fast-forward (mover el puntero) o crear un commit de merge.',
  },
  restore: {
    usage: 'git restore <archivo> · git restore --staged <archivo>',
    desc: 'Descarta los cambios del working directory (vuelve a la última versión guardada). Con --staged saca el archivo del staging sin perder cambios.',
  },
  reset: {
    usage: 'git reset [--soft|--mixed|--hard] <ref> · git reset <archivo>',
    desc: 'Mueve la rama a otro commit: --soft conserva el staging, --mixed lo vacía, --hard borra también el working directory. Con un archivo, lo saca del staging.',
  },
  revert: {
    usage: 'git revert <hash>',
    desc: 'Deshace un commit creando otro nuevo que aplica los cambios inversos. La forma segura de deshacer en ramas compartidas.',
  },
  stash: {
    usage: 'git stash · git stash pop · git stash list',
    desc: 'Guarda tu trabajo a medias en una pila y deja el workspace limpio. Con pop lo recuperas; con list ves lo guardado.',
  },
  tag: {
    usage: 'git tag · git tag <nombre>',
    desc: 'Marca un commit con una etiqueta fija (típicamente versiones: v1.0.0). Sin argumentos lista las etiquetas existentes.',
  },
  'cherry-pick': {
    usage: 'git cherry-pick <hash>',
    desc: 'Copia un commit concreto de otra rama y lo aplica sobre la actual. Ideal para portar un fix sin traer toda la rama.',
  },
  rebase: {
    usage: 'git rebase <rama>',
    desc: 'Reaplica tus commits encima de otra rama, dejando la historia lineal. Reescribe los hashes: no usarlo en commits ya compartidos.',
  },
  reflog: {
    usage: 'git reflog',
    desc: 'La red de seguridad: registra todos los movimientos de HEAD (commits, resets, checkouts). Permite recuperar commits "perdidos".',
  },
  push: {
    usage: 'git push [origin] [<rama>]',
    desc: 'Sube tus commits locales al remoto (origin) para compartirlos con el equipo.',
  },
  pull: {
    usage: 'git pull',
    desc: 'Trae los commits nuevos del remoto y los integra en tu rama actual. Equivale a git fetch + git merge.',
  },
  fetch: {
    usage: 'git fetch',
    desc: 'Descarga los commits del remoto sin integrarlos: actualiza origin/<rama> para que puedas revisar antes de mergear.',
  },
};

export const COMMAND_NAMES = Object.keys(COMMAND_INFO);

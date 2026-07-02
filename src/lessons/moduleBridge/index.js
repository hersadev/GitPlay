// Módulo puente (opcional, 1 lección): del simulador al Git de verdad.
// No tiene objetivos validables porque ocurre fuera de GitPlay: se marca
// como completada (o se salta) con los botones del panel.

export const moduleBridge = [
  {
    id: 'bridge-l1',
    optional: true,
    title: 'Puente a Git real (opcional)',
    description:
      'Todo lo que has practicado aquí funciona exactamente igual en el Git de verdad. Esta última lección sale del simulador: instala Git en tu máquina y replica el ciclo básico. Si ya lo tienes instalado, empieza en el paso 2 — o salta la lección directamente.',
    steps: [
      'Instala Git: en Windows descárgalo de git-scm.com; en macOS ejecuta `xcode-select --install`; en Linux `sudo apt install git` (o el gestor de tu distro).',
      'Preséntate (solo la primera vez): `git config --global user.name "Tu Nombre"` y `git config --global user.email "tu@email.com"`. Sin esto, Git no te deja commitear.',
      'Crea una carpeta nueva, entra en ella y ejecuta `git init` — como en la lección 1.',
      'Crea un archivo README.md con tu editor, y luego: `git add README.md` + `git commit -m "docs: primer commit real"`.',
      'Ejecuta `git status`, `git log` y `git diff`: reconocerás todas las salidas.',
      'Extra: crea una cuenta en github.com, un repositorio vacío, y conecta tu carpeta con `git remote add origin <url>` seguido de `git push -u origin main`.',
    ],
    curiosity:
      'Tres cosas nuevas que verás en Git real: si un commit sin -m te abre el editor Vim, se sale escribiendo :wq · el `git log` largo se navega con espacio y se cierra con q · y `git clone <url>` te trae cualquier proyecto público de GitHub para cotillear su historia. Con lo que ya sabes, nada de eso debería asustarte.',
  },
];

# GitPlay

Un juego para aprender Git desde el navegador. Escribes comandos de verdad en un terminal, ves el grafo de commits crecer y ramificarse con cada uno, y avanzas por lecciones mientras construyes TaskFlow, una app de tareas inventada para el curso.

La gracia es que nada es real: el Git que corre por debajo es un simulador escrito desde cero, así que puedes hacer un `reset --hard` o liarla con un rebase sin perder nada. Si algo se rompe, reinicias y ya.

## Qué tiene

- Un terminal con los comandos que importan: `init`, `add`, `commit`, `branch`, `merge`, `rebase`, `cherry-pick`, `stash`, `reflog`, `push`, `pull`... unos 20 en total.
- El grafo de commits dibujado en pantalla y actualizado con cada comando. Es la parte que más ayuda a entender qué hace realmente cada cosa.
- Una vista tipo GitHub para practicar push, pull, fetch y Pull Requests, sin cuenta ni conexión.
- Conflictos de merge de verdad, con un editor visual para resolverlos.
- 45 lecciones en tres niveles: básico (commits y ramas), medio (GitHub y reescribir historia) y avanzado (rebase, reflog, GitFlow y rescates de commits perdidos). Cada una valida sus objetivos mirando el estado real del repo, y trae pistas por si te atascas.
- Logros que se van desbloqueando, y el progreso se guarda solo en el navegador: cierras y sigues donde estabas.

## Cómo ejecutarlo

Si tienes Node 20 o superior:

```bash
git clone https://github.com/hersadev/GitPlay.git
cd GitPlay
npm install
npm run dev
```

y abre http://localhost:5173.

Si prefieres Docker y no instalar Node:

```bash
git clone https://github.com/hersadev/GitPlay.git
cd GitPlay
docker compose up --build
```

y abre http://localhost:8080. Si cambias código, acuérdate de repetir el `--build`.

## Si quieres tocar el código

Es React 18 con Vite, Tailwind y Zustand, sin backend. El simulador de Git vive en [src/engine/GitEngine.js](src/engine/GitEngine.js) y las lecciones en [src/lessons/](src/lessons/), cada módulo en su carpeta. Hay tests del motor (`npx vitest run`) y lint (`npm run lint`).

Si encuentras un bug o se te ocurre una lección nueva, abre un issue o manda un PR.

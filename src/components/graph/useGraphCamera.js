import { useState, useRef, useEffect } from 'react';
import { NODE_R } from './palettes';

// Cámara del grafo: el contenido se dibuja con translate(cam) + scale(zoom)
// dentro de un SVG que ocupa todo el panel. Así el paneo es libre en cualquier
// dirección y las etiquetas que sobresalen del grafo (arriba de la primera
// fila) no se recortan: basta con arrastrar para verlas.
export function useGraphCamera({ width, height, positions, focusHash }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [cam, setCam] = useState({ x: 0, y: 0 });

  // Paneo con arrastre: pinchar y mover el ratón desplaza la vista.
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef(null); // { x, y, camX, camY, moved }

  function onPanStart(e) {
    // Solo botón izquierdo, y nunca desde los controles flotantes (zoom, detalle, leyenda).
    if (e.button !== 0 || e.target.closest('button')) return;
    panRef.current = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y, moved: false };
    setIsPanning(true);
  }

  useEffect(() => {
    if (!isPanning) return;

    function onMove(e) {
      const pan = panRef.current;
      if (!pan) return;
      const dx = e.clientX - pan.x;
      const dy = e.clientY - pan.y;
      if (!pan.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      pan.moved = true;
      setCam({ x: pan.camX + dx, y: pan.camY + dy });
    }
    function onUp() {
      setIsPanning(false);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [isPanning]);

  // Si hubo arrastre real, el clic que llega después no debe seleccionar/deseleccionar nada.
  function onClickCapture(e) {
    if (panRef.current?.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
    panRef.current = null;
  }

  // La rueda del ratón también panea (sustituye al scroll nativo del contenedor).
  function onWheel(e) {
    setCam((c) => ({ x: c.x - e.deltaX, y: c.y - e.deltaY }));
  }

  const prevFocus = useRef(null);

  useEffect(() => {
    if (!focusHash || prevFocus.current === focusHash) return;
    prevFocus.current = focusHash;
    const el = containerRef.current;
    const pos = positions.get(focusHash);
    if (!el || !pos) return;

    // Solo movemos la cámara si el commit de HEAD queda fuera de la vista
    // (con un margen), para no robarle el paneo manual al usuario.
    const margin = NODE_R * 2;
    setCam((c) => {
      const sx = pos.x * zoom + c.x;
      const sy = pos.y * zoom + c.y;
      const inViewX = sx >= margin && sx <= el.clientWidth - margin;
      const inViewY = sy >= margin && sy <= el.clientHeight - margin;
      if (inViewX && inViewY) return c;
      return {
        x: el.clientWidth / 2 - pos.x * zoom,
        y: el.clientHeight / 2 - pos.y * zoom,
      };
    });
  }, [focusHash, positions, zoom]);

  function zoomBy(factor) {
    const nz = Math.min(2, Math.max(0.3, +(zoom * factor).toFixed(2)));
    if (nz === zoom) return;
    const el = containerRef.current;
    if (el) {
      // Zoom centrado: el punto del grafo que está en el centro del panel no se mueve.
      const cx = el.clientWidth / 2;
      const cy = el.clientHeight / 2;
      setCam((c) => ({
        x: cx - (cx - c.x) * (nz / zoom),
        y: cy - (cy - c.y) * (nz / zoom),
      }));
    }
    setZoom(nz);
  }
  function fitToView() {
    const el = containerRef.current;
    if (!el) return;
    const z = Math.min(1, el.clientWidth / width, el.clientHeight / height);
    setZoom(z);
    setCam({
      x: (el.clientWidth - width * z) / 2,
      y: (el.clientHeight - height * z) / 2,
    });
  }
  // Centra la cámara en el commit de HEAD (o el más reciente si no hay HEAD).
  function centerOnHead() {
    const el = containerRef.current;
    const pos = focusHash ? positions.get(focusHash) : null;
    if (!el || !pos) return;
    setCam({
      x: el.clientWidth / 2 - pos.x * zoom,
      y: el.clientHeight / 2 - pos.y * zoom,
    });
  }

  return {
    containerRef,
    zoom,
    cam,
    isPanning,
    onPanStart,
    onClickCapture,
    onWheel,
    zoomBy,
    fitToView,
    centerOnHead,
  };
}

import { useRef } from 'react';

// Divisor arrastrable. orientation='vertical' → redimensiona ancho (llama a
// onResize con dx); orientation='horizontal' → redimensiona alto (dy).
// El padre decide qué panel crece/encoge.
export default function ResizeHandle({ onResize, orientation = 'vertical' }) {
  const horizontal = orientation === 'horizontal';
  const dragging = useRef(false);
  const last = useRef(0);
  const move = useRef(null);
  const up = useRef(null);

  function onMouseDown(e) {
    e.preventDefault();
    dragging.current = true;
    last.current = horizontal ? e.clientY : e.clientX;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = horizontal ? 'row-resize' : 'col-resize';

    move.current = (ev) => {
      if (!dragging.current) return;
      const pos = horizontal ? ev.clientY : ev.clientX;
      const delta = pos - last.current;
      last.current = pos;
      onResize(delta);
    };
    up.current = () => {
      dragging.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', move.current);
      window.removeEventListener('mouseup', up.current);
    };
    window.addEventListener('mousemove', move.current);
    window.addEventListener('mouseup', up.current);
  }

  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation={orientation}
      title="Arrastra para redimensionar"
      className={
        'group flex-shrink-0 bg-gray-800 hover:bg-green-500/60 active:bg-green-500 transition-colors flex items-center justify-center ' +
        (horizontal ? 'h-1.5 w-full cursor-row-resize' : 'w-1.5 h-full cursor-col-resize')
      }
    >
      <span
        className={
          'bg-gray-600 group-hover:bg-green-300 transition-colors ' +
          (horizontal ? 'w-8 h-px' : 'h-8 w-px')
        }
      />
    </div>
  );
}

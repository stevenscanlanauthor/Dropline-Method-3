import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  onResize: (deltaX: number) => void;
  onResizeEnd?: () => void;
}

export default function ResizeHandle({ onResize, onResizeEnd }: Props) {
  const [active, setActive] = useState(false);
  const lastX = useRef(0);

  const stop = useCallback(() => {
    setActive(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  useEffect(() => {
    if (!active) return;
    function onMove(e: MouseEvent) {
      const delta = e.clientX - lastX.current;
      lastX.current = e.clientX;
      if (delta !== 0) onResize(delta);
    }
    function onUp() {
      stop();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [active, onResize, stop]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      className={`resize-handle shrink-0 ${active ? 'resize-handle-active' : ''}`}
      onMouseDown={e => {
        e.preventDefault();
        lastX.current = e.clientX;
        setActive(true);
      }}
    />
  );
}

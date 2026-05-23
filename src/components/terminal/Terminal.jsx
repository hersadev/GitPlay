import { useEffect, useRef } from 'react';
import CommandInput from './CommandInput';
import TerminalOutput from './TerminalOutput';

export default function Terminal({ history, onCommand }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  return (
    <div className="flex flex-col bg-gray-900 border-t border-gray-700 h-48 font-mono text-sm">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
        <TerminalOutput lines={history} />
      </div>
      <CommandInput onSubmit={onCommand} />
    </div>
  );
}

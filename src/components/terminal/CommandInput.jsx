import { useState } from 'react';

export default function CommandInput({ onSubmit }) {
  const [value, setValue] = useState('');

  function handleKeyDown(e) {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim());
      setValue('');
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-700">
      <span className="text-green-400">$</span>
      <input
        className="flex-1 bg-transparent outline-none text-white caret-green-400"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
        spellCheck={false}
      />
    </div>
  );
}

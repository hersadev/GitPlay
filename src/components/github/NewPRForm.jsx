import { useState } from 'react';
import Octicon from './Octicon';
import { DEFAULT_BRANCH } from './utils';
import { BTN_GREEN, BTN_SUBTLE } from './styles';

// Formulario "Comparando cambios" para abrir una nueva Pull Request.
export default function NewPRForm({ repo, onSubmit, onCancel, initialFrom }) {
  // En GitHub un PR compara ramas DEL REMOTO: solo se ofrecen las pusheadas.
  const remoteBranches = [...(repo.remoteBranches?.keys?.() ?? [])];

  const [from, setFrom] = useState(initialFrom ?? remoteBranches.find((b) => b !== DEFAULT_BRANCH) ?? remoteBranches[0] ?? '');
  const [into, setInto] = useState(remoteBranches.includes(DEFAULT_BRANCH) ? DEFAULT_BRANCH : remoteBranches[0] ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [err, setErr] = useState('');

  if (remoteBranches.length === 0) {
    return (
      <div className="p-4 text-sm text-[#8b949e] text-center">
        Necesitas pushear al menos una rama a origin antes de abrir un PR.<br />
        <code className="text-gray-300">git push origin &lt;rama&gt;</code>
      </div>
    );
  }

  function submit() {
    if (!from || !into) return setErr('Selecciona rama origen y destino.');
    if (from === into) return setErr('Origen y destino no pueden ser iguales.');
    const res = onSubmit({ from, into, title, body });
    if (res && !res.ok) setErr(res.output);
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-white font-semibold">Comparando cambios</h3>
      {/* Barra base ← compare como la de GitHub */}
      <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-md px-3 py-2 text-sm flex-wrap">
        <Octicon icon="pullRequest" size={14} className="text-[#8b949e]" />
        <span className="text-xs text-[#8b949e]">base:</span>
        <select
          value={into}
          onChange={(e) => setInto(e.target.value)}
          className="bg-[#21262d] border border-[#30363d] text-white text-xs rounded px-1.5 py-1 font-semibold"
        >
          {remoteBranches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="text-[#8b949e]">←</span>
        <span className="text-xs text-[#8b949e]">compare:</span>
        <select
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="bg-[#21262d] border border-[#30363d] text-white text-xs rounded px-1.5 py-1 font-semibold"
        >
          {remoteBranches.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>
      <label className="text-xs text-[#8b949e] block">
        Título
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`${from} → ${into}`}
          className="w-full mt-1 bg-[#0d1117] border border-[#30363d] text-white text-sm rounded-md px-2 py-1.5 focus:border-[#58a6ff] outline-none"
        />
      </label>
      <label className="text-xs text-[#8b949e] block">
        Descripción (opcional)
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Deja un comentario"
          className="w-full mt-1 bg-[#0d1117] border border-[#30363d] text-white text-sm rounded-md px-2 py-1.5 resize-none focus:border-[#58a6ff] outline-none"
        />
      </label>
      {err && <p className="text-xs text-[#f85149] whitespace-pre-wrap">{err}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className={BTN_SUBTLE}>Cancelar</button>
        <button onClick={submit} className={BTN_GREEN}>Create pull request</button>
      </div>
    </div>
  );
}

export default function Curiosity({ text }) {
  if (!text) return null;

  return (
    <div className="mt-2 rounded-md border border-purple-700/40 bg-purple-900/20 px-3 py-2">
      <h3 className="text-xs font-semibold uppercase text-purple-300 tracking-wider flex items-center gap-1">
        <span>💡</span>
        <span>¿Sabías que…?</span>
      </h3>
      <p className="text-sm text-purple-100/90 mt-1 leading-snug">{text}</p>
    </div>
  );
}

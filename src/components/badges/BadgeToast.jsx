import { motion } from 'framer-motion';

export default function BadgeToast({ badge, onClose }) {
  if (!badge) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="fixed top-16 right-4 z-50 bg-gradient-to-r from-yellow-700 to-amber-600 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[260px] max-w-sm cursor-pointer"
      onClick={onClose}
    >
      <span className="text-3xl">{badge.icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider opacity-80">¡Nuevo logro!</p>
        <p className="font-semibold text-sm leading-tight">{badge.name}</p>
        <p className="text-xs opacity-90 leading-snug mt-0.5">{badge.description}</p>
      </div>
    </motion.div>
  );
}

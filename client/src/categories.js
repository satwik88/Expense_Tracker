export const CATEGORY_META = {
  Salary:      { emoji: '💼', color: '#3b82f6' },
  Freelance:   { emoji: '💻', color: '#8b5cf6' },
  Investment:  { emoji: '📈', color: '#06b6d4' },
  Gift:        { emoji: '🎁', color: '#ec4899' },
  Food:        { emoji: '🍔', color: '#f59e0b' },
  Transport:   { emoji: '🚗', color: '#6366f1' },
  Shopping:    { emoji: '🛍️', color: '#d946ef' },
  Bills:       { emoji: '📄', color: '#64748b' },
  Entertainment:{ emoji: '🎬', color: '#f97316' },
  Health:      { emoji: '🏥', color: '#10b981' },
  Education:   { emoji: '📚', color: '#14b8a6' },
  Other:       { emoji: '📦', color: '#78716c' },
}

export function getCatMeta(cat) {
  return CATEGORY_META[cat] || CATEGORY_META.Other
}

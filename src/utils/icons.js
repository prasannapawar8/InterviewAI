/**
 * Registry of icons referenced *by name* in data (stats, metrics).
 * Importing them explicitly lets Vite tree-shake lucide-react instead of
 * bundling the entire icon set via `import * as Icons`.
 */
import {
  Video,
  Gauge,
  Smile,
  FileText,
  Activity,
  MessageSquareDashed,
  Sparkles,
  Zap,
} from 'lucide-react'

export const iconMap = {
  Video,
  Gauge,
  Smile,
  FileText,
  Activity,
  MessageSquareDashed,
  Sparkles,
  Zap,
}

// Resolve an icon by name with a safe fallback
export function getIcon(name) {
  return iconMap[name] || Activity
}

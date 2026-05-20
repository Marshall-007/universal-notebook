import { systemTemplates, getTemplatesByCategory } from '@/templates';
import type { TemplateType } from '@/types';
import { X } from 'lucide-react';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateType: TemplateType) => void;
}

export function TemplateGallery({ isOpen, onClose, onSelect }: TemplateGalleryProps) {
  if (!isOpen) return null;

  const categories = getTemplatesByCategory();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-surface-900 rounded-xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800">
          <div>
            <h2 className="text-lg font-semibold">Choose a Template</h2>
            <p className="text-sm text-surface-500">Start with a structure that fits your needs</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
            <X size={18} className="text-surface-400" />
          </button>
        </div>

        {/* Templates grid */}
        <div className="overflow-y-auto p-6 max-h-[60vh]">
          {Array.from(categories.entries()).map(([category, templates]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h3 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-3">{category}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => { onSelect(template.id); onClose(); }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-all group"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{template.icon}</span>
                    <span className="text-sm font-medium text-center">{template.name}</span>
                    <span className="text-[10px] text-surface-400 text-center line-clamp-2">{template.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

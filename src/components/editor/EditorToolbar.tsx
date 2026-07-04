import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Minus, Table, Image, Highlighter, Undo, Redo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ComponentType<{ size?: number | string }>;
  title: string;
}

function ToolbarButton({ onClick, isActive, icon: Icon, title }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        isActive
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300'
      )}
    >
      <Icon size={16} />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1" />;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-4 py-2 border-b border-surface-200 dark:border-surface-800 overflow-x-auto flex-shrink-0 bg-white/80 dark:bg-surface-900/80 backdrop-blur-sm sticky top-0 z-10">
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} icon={Undo} title="Undo" />
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} icon={Redo} title="Redo" />
      <Divider />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        icon={Heading1}
        title="Heading 1"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        icon={Heading2}
        title="Heading 2"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        icon={Heading3}
        title="Heading 3"
      />
      <Divider />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        icon={Bold}
        title="Bold"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        icon={Italic}
        title="Italic"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        icon={Underline}
        title="Underline"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        icon={Strikethrough}
        title="Strikethrough"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive('highlight')}
        icon={Highlighter}
        title="Highlight"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive('code')}
        icon={Code}
        title="Code"
      />
      <Divider />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        icon={List}
        title="Bullet List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        icon={ListOrdered}
        title="Numbered List"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        icon={CheckSquare}
        title="Checklist"
      />
      <Divider />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        icon={Quote}
        title="Quote"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        icon={Minus}
        title="Horizontal Rule"
      />
      <ToolbarButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
        icon={Table}
        title="Table"
      />
      <ToolbarButton
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = () => {
            const file = input.files?.[0];
            if (file) {
              // Images are embedded inline as base64 in the note body (which is
              // stored in IndexedDB and synced as JSONB). Cap the size so a
              // large photo can't silently exhaust storage / bloat sync.
              const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
              if (file.size > MAX_IMAGE_BYTES) {
                alert('Image is too large (max 2 MB). Please choose a smaller image.');
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                const src = reader.result as string;
                editor.chain().focus().setImage({ src }).run();
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
        }}
        icon={Image}
        title="Image"
      />
    </div>
  );
}

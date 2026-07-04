import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { useCallback, useEffect, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { VoiceButton } from './VoiceButton';

interface TipTapEditorProps {
  content: Record<string, unknown>;
  onUpdate: (json: Record<string, unknown>, text: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function TipTapEditor({ content, onUpdate, placeholder = 'Start writing...', editable = true }: TipTapEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<{ json: Record<string, unknown>; text: string } | null>(null);
  // Always call the latest onUpdate (it is rebound when the active note changes).
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      Typography,
      Highlight.configure({ multicolor: true }),
      Underline,
    ],
    content: content && Object.keys(content).length > 0 ? content : undefined,
    editable,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as Record<string, unknown>;
      const text = editor.getText();
      pendingRef.current = { json, text };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        pendingRef.current = null;
        onUpdateRef.current(json, text);
      }, 300);
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm sm:prose-base max-w-none focus:outline-none',
      },
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Flush any pending edit so the last <=300ms of typing isn't lost on
      // unmount / note switch / back navigation.
      if (pendingRef.current) {
        onUpdateRef.current(pendingRef.current.json, pendingRef.current.text);
        pendingRef.current = null;
      }
    };
  }, []);

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content && Object.keys(content).length > 0) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  const handleVoiceTranscript = useCallback((text: string) => {
    if (editor) {
      editor.chain().focus().insertContent(text + '\n').run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
        <EditorContent editor={editor} />
      </div>
      <VoiceButton onTranscript={handleVoiceTranscript} />
    </div>
  );
}

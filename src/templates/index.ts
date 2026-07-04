import type { TemplateType } from '@/types';

type Content = Record<string, unknown>;

export interface TemplateDefinition {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
  category: string;
  // Content and title may be factories so date-bearing templates are stamped
  // at note-creation time rather than frozen to app-load time.
  contentJson: Content | (() => Content);
  defaultTitle: string | (() => string);
}

export const systemTemplates: TemplateDefinition[] = [
  {
    id: 'quick-note',
    name: 'Quick Note',
    description: 'A simple, blank note for quick thoughts',
    icon: '📝',
    category: 'Basic',
    defaultTitle: 'Untitled Note',
    contentJson: {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    },
  },
  {
    id: 'checklist',
    name: 'Checklist',
    description: 'Todo items with checkboxes',
    icon: '✅',
    category: 'Basic',
    defaultTitle: 'Checklist',
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Checklist' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 1' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 2' }] }] },
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Task 3' }] }] },
          ],
        },
      ],
    },
  },
  {
    id: 'memo',
    name: 'Memo',
    description: 'Structured memo with header, body, and action items',
    icon: '📋',
    category: 'Professional',
    defaultTitle: 'Memo',
    contentJson: () => ({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Memo' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'To: ' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'From: ' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' }, { type: 'text', text: new Date().toLocaleDateString() }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Subject: ' }] },
        { type: 'horizontalRule' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Summary' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Write your summary here...' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Details' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Action item 1' }] }] },
          ],
        },
      ],
    }),
  },
  {
    id: 'brain-dump',
    name: 'Brain Dump',
    description: 'Freeform stream of consciousness with timestamps',
    icon: '🧠',
    category: 'Creative',
    defaultTitle: 'Brain Dump',
    contentJson: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '🧠 Brain Dump' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Just write. No structure. No judgment. Let it flow.' }] },
        { type: 'horizontalRule' },
        { type: 'paragraph' },
      ],
    },
  },
  {
    id: 'mind-map',
    name: 'Mind Map',
    description: 'Visual node-based diagram for brainstorming',
    icon: '🗺️',
    category: 'Creative',
    defaultTitle: 'Mind Map',
    contentJson: {
      type: 'mindmap',
      nodes: [
        { id: 'center', data: { label: 'Central Idea' }, position: { x: 300, y: 200 }, type: 'default' },
        { id: 'branch1', data: { label: 'Branch 1' }, position: { x: 100, y: 100 }, type: 'default' },
        { id: 'branch2', data: { label: 'Branch 2' }, position: { x: 500, y: 100 }, type: 'default' },
        { id: 'branch3', data: { label: 'Branch 3' }, position: { x: 100, y: 300 }, type: 'default' },
        { id: 'branch4', data: { label: 'Branch 4' }, position: { x: 500, y: 300 }, type: 'default' },
      ],
      edges: [
        { id: 'e1', source: 'center', target: 'branch1' },
        { id: 'e2', source: 'center', target: 'branch2' },
        { id: 'e3', source: 'center', target: 'branch3' },
        { id: 'e4', source: 'center', target: 'branch4' },
      ],
    },
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Attendees, agenda, discussion points, and action items',
    icon: '🤝',
    category: 'Professional',
    defaultTitle: 'Meeting Notes',
    contentJson: () => ({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Meeting Notes' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' }, { type: 'text', text: new Date().toLocaleDateString() }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Attendees: ' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] },
        { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Topic 1' }] }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Discussion' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Action Items' }] },
        {
          type: 'taskList',
          content: [
            { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Follow up on...' }] }] },
          ],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Next Steps' }] },
        { type: 'paragraph' },
      ],
    }),
  },
  {
    id: 'journal',
    name: 'Journal',
    description: 'Daily entry with mood and reflection',
    icon: '📔',
    category: 'Personal',
    defaultTitle: () => `Journal — ${new Date().toLocaleDateString()}`,
    contentJson: () => ({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: `📔 ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Mood: ' }, { type: 'text', text: '😊 / 😐 / 😔' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Energy: ' }, { type: 'text', text: '⚡⚡⚡⚡⚡' }] },
        { type: 'horizontalRule' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Grateful For' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Today\'s Highlights' }] },
        { type: 'paragraph' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Reflections' }] },
        { type: 'paragraph' },
      ],
    }),
  },
  {
    id: 'cornell-notes',
    name: 'Cornell Notes',
    description: 'Classic study format with cues, notes, and summary',
    icon: '🎓',
    category: 'Study',
    defaultTitle: 'Cornell Notes',
    contentJson: () => ({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Cornell Notes' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Topic: ' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Date: ' }, { type: 'text', text: new Date().toLocaleDateString() }] },
        { type: 'horizontalRule' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '❓ Cues / Questions' }] },
        { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Key question 1?' }] }] }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📝 Notes' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Main notes go here...' }] },
        { type: 'horizontalRule' },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '📋 Summary' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'italic' }], text: 'Write a brief summary of the key points...' }] },
      ],
    }),
  },
];

export function getTemplate(type: TemplateType): TemplateDefinition | undefined {
  return systemTemplates.find((t) => t.id === type);
}

// Resolve the (possibly lazy) content/title at the moment a note is created.
export function buildTemplateContent(template: TemplateDefinition): Content {
  return typeof template.contentJson === 'function' ? template.contentJson() : template.contentJson;
}

export function buildTemplateTitle(template: TemplateDefinition): string {
  return typeof template.defaultTitle === 'function' ? template.defaultTitle() : template.defaultTitle;
}

export function getTemplatesByCategory(): Map<string, TemplateDefinition[]> {
  const categories = new Map<string, TemplateDefinition[]>();
  for (const template of systemTemplates) {
    const existing = categories.get(template.category) || [];
    existing.push(template);
    categories.set(template.category, existing);
  }
  return categories;
}

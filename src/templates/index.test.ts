import { describe, it, expect } from 'vitest';
import {
  getTemplate,
  buildTemplateContent,
  buildTemplateTitle,
  systemTemplates,
} from './index';

describe('templates', () => {
  it('exposes all declared template types', () => {
    const ids = systemTemplates.map((t) => t.id);
    expect(ids).toContain('quick-note');
    expect(ids).toContain('mind-map');
    expect(ids).toContain('journal');
  });

  it('static templates return a stable content object', () => {
    const t = getTemplate('quick-note')!;
    expect(buildTemplateContent(t)).toBe(buildTemplateContent(t));
    expect(buildTemplateContent(t).type).toBe('doc');
  });

  it('date-bearing templates rebuild fresh content each call (not frozen)', () => {
    const t = getTemplate('memo')!;
    const a = buildTemplateContent(t);
    const b = buildTemplateContent(t);
    // A factory produces a new object each time it is invoked.
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('journal title is generated at build time and mentions Journal', () => {
    const t = getTemplate('journal')!;
    expect(buildTemplateTitle(t)).toMatch(/Journal/);
  });

  it('mind-map template carries a mindmap content shape', () => {
    const t = getTemplate('mind-map')!;
    const content = buildTemplateContent(t) as { type: string; nodes?: unknown[] };
    expect(content.type).toBe('mindmap');
    expect(Array.isArray(content.nodes)).toBe(true);
  });
});

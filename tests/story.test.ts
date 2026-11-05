import { describe, expect, it } from 'vitest';
import { hasKey } from '../src/i18n';
import { CUTSCENES, NPCS, allStoryKeys, cutsceneAfterLevel, hubChatter } from '../src/story/story';

describe('modo história', () => {
  it('toda fala existe em português e inglês', () => {
    for (const key of allStoryKeys()) {
      expect(hasKey(key, 'pt'), `pt: ${key}`).toBe(true);
      expect(hasKey(key, 'en'), `en: ${key}`).toBe(true);
    }
  });

  it('as cenas só usam personagens conhecidos', () => {
    for (const c of Object.values(CUTSCENES)) {
      for (const l of c.lines) expect(l.speaker === 'pix' || l.speaker in NPCS).toBe(true);
      expect(c.lines.length).toBeGreaterThan(2);
    }
  });

  it('cenas acontecem ao fim dos mundos 1 e 2', () => {
    expect(cutsceneAfterLevel(4)).toBe('world1');
    expect(cutsceneAfterLevel(9)).toBe('world2');
    expect(cutsceneAfterLevel(3)).toBeNull();
    expect(cutsceneAfterLevel(14)).toBeNull();
  });

  it('as falas da vila mudam com o progresso', () => {
    expect(hubChatter('elder', 1, false)[0].key).toBe('story.hub.elder.0');
    expect(hubChatter('elder', 6, false)[0].key).toBe('story.hub.elder.1');
    expect(hubChatter('elder', 11, false)[0].key).toBe('story.hub.elder.2');
    expect(hubChatter('elder', 15, true)[0].key).toBe('story.hub.elder.3');
  });
});

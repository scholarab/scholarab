import { describe, expect, it } from 'vitest';
import { splitDirectoryPage } from '../lib/split-directories';

const card = (id: number, mark = '') => `<div class="sabl-card" data-dir-card${mark} data-id="${id}"><div class="sabl-row-main"><h3>${id}</h3></div></div>`;
const page = (cards: string) => `<html><head><meta name="robots" content="index"></head><body><div class="sabl-grid" data-dir-grid><h2 class="sabl-group-h" data-dir-group="active">Open</h2>${cards}<h2 class="sabl-group-h" data-dir-group="closed" data-dir-shut>Closed</h2></div><div data-dir-more></div></body></html>`;

describe('splitDirectoryPage', () => {
  const html = page(card(1) + card(2) + card(3, ' data-dir-later') + card(4, ' data-dir-shut'));
  const split = splitDirectoryPage(html, '/scholarships/all/')!;

  it('keeps the headings and first-step cards and drops the hidden ones', () => {
    expect(split.moved).toBe(2);
    expect(split.page).toContain(card(1) + card(2));
    expect(split.page).not.toContain('data-id="3"');
    expect(split.page).not.toContain('data-id="4"');
    expect(split.page).toContain('data-dir-group="closed"');
    expect(split.page).toContain('data-dir-grid data-dir-rest="/scholarships/all/"');
  });

  it('ends the grid in a link for readers without JavaScript', () => {
    expect(split.page).toMatch(/<noscript>.*href="\/scholarships\/all\/".*<\/noscript><\/div><div data-dir-more>/);
  });

  it('copies the page whole, with each moved card wrapped and the copy noindexed', () => {
    const unwrapped = split.all.replaceAll(/<!--\/?c-->/g, '').replace('<meta name="robots" content="noindex, follow">', '<meta name="robots" content="index">');
    expect(unwrapped).toBe(html);
    expect([...split.all.matchAll(/<!--c-->([\s\S]*?)<!--\/c-->/g)].map(m => m[1])).toEqual([card(3, ' data-dir-later'), card(4, ' data-dir-shut')]);
    expect(split.all.match(/<meta name="robots"/g)).toHaveLength(1);
  });

  it('leaves a page with nothing hidden, or no grid, alone', () => {
    expect(splitDirectoryPage(page(card(1)), '/x/all/')).toBeNull();
    expect(splitDirectoryPage('<html><body></body></html>', '/x/all/')).toBeNull();
  });
});

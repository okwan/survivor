/**
 * The "New Character" window: pick a class (one card each), type a name and start the run.
 *
 * Markup is deliberately plain with clear class names (create-*, class-card...) so a later skin can restyle it.
 * Character customisation returns once the game has its own hero art.
 */
import './create.css';
import { CLASSES, CLASS_BY_KEY, DEFAULT_CLASS } from '../game/data.ts';
import type { ClassDef, ClassKey } from '../game/data.ts';

export interface CreateResult {
  cls: ClassKey;
  name: string;
}
export interface CreateOptions {
  /** start-skill icons by skill key */
  icons: Record<string, string>;
  onStart(r: CreateResult): void;
  onBack(): void;
}

export const DEFAULT_NAME = 'Wanderer';

/** the class portrait (public/sprites, the same sprites the hero uses in a run) */
/** the class's baked hero sheet (public/baked), shown idling on its card */
const HERO_SHEETS: Record<string, string> = { warrior: 'hero-warrior', magician: 'hero-magician', bowman: 'hero-bowman', thief: 'hero-thief', pirate: 'hero-pirate' };

/** the name as the game stores it */
export const sanitizeName = (n: string) => n.replace(/[<>&"]/g, '').trim().slice(0, 12);

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export class CreateScreen {
  readonly root: HTMLDivElement;
  private o: CreateOptions;
  private cls: ClassKey = DEFAULT_CLASS;
  private name = DEFAULT_NAME;
  private cardsEl: HTMLDivElement;
  private headEl: HTMLDivElement;
  private nameEl: HTMLInputElement;
  private shown = false;

  constructor(parent: HTMLElement, o: CreateOptions) {
    this.o = o;
    const root = (this.root = el('div', 'screen create hidden'));
    const win = el('div', 'win create-win');
    this.headEl = el('div', 'win-head create-head', 'New Character');
    const body = el('div', 'win-body create-body');

    const step = el('div', 'create-step create-step-class');
    step.appendChild(el('p', 'create-lead', 'Choose your class'));
    this.cardsEl = el('div', 'create-classes');
    for (const c of CLASSES) this.cardsEl.appendChild(this.buildCard(c));
    step.appendChild(this.cardsEl);

    this.nameEl = el('input', 'create-name');
    this.nameEl.type = 'text';
    this.nameEl.maxLength = 12;
    this.nameEl.placeholder = 'Name';
    this.nameEl.value = this.name;
    this.nameEl.autocomplete = 'off';
    this.nameEl.spellcheck = false;
    this.nameEl.autocapitalize = 'words';
    this.nameEl.enterKeyHint = 'done';
    this.nameEl.addEventListener('input', () => (this.name = this.nameEl.value));
    this.nameEl.addEventListener('focus', () => this.nameEl.select());
    step.append(el('label', 'create-namelabel', 'Name'), this.nameEl);

    const row = el('div', 'create-buttons');
    row.append(this.btn('Back', 'create-back', () => this.o.onBack()), this.btn('Start', 'primary create-start', () => this.start()));
    step.appendChild(row);

    body.append(step);
    win.append(this.headEl, body);
    root.appendChild(win);
    parent.appendChild(root);
    window.addEventListener('keydown', (e) => {
      if (!this.shown) return;
      if (e.key === 'Escape') this.o.onBack();
      else if (e.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') this.start();
    });
  }

  private btn(text: string, cls: string, fn: () => void): HTMLButtonElement {
    const b = el('button', 'btn ' + cls, text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  private buildCard(c: ClassDef): HTMLElement {
    const card = el('button', 'class-card');
    card.type = 'button';
    card.dataset.cls = c.key;
    const icon = el('img', 'class-skill');
    icon.alt = '';
    icon.dataset.skill = c.skills[0];
    const hero = el('div', 'class-hero');
    hero.style.backgroundImage = `url(baked/${HERO_SHEETS[c.key] ?? 'hero-warrior'}.webp)`;
    card.append(
      hero,
      el('h3', 'class-name', c.name),
      el('p', 'class-blurb', c.blurb),
      el('div', 'class-weapon', `${c.weaponName}`),
      el('div', 'class-stats', `HP ${c.hp} &middot; Speed ${c.speed} &middot; Crit ${Math.round(c.crit * 100)}%`),
    );
    const sk = el('div', 'class-start');
    sk.append(icon, el('span', '', 'Start skill'));
    card.appendChild(sk);
    card.addEventListener('click', () => this.pickClass(c.key));
    return card;
  }

  private pickClass(c: ClassKey) {
    this.cls = c;
    this.refreshCards();
  }

  private refreshCards() {
    for (const card of this.cardsEl.children) card.classList.toggle('selected', (card as HTMLElement).dataset.cls === this.cls);
    this.headEl.textContent = `New Character — ${CLASS_BY_KEY[this.cls].name}`;
  }

  private start() {
    this.o.onStart({ cls: this.cls, name: sanitizeName(this.name) || DEFAULT_NAME });
  }

  show(initial?: { cls: string; name: string } | null) {
    if (initial && CLASS_BY_KEY[initial.cls]) {
      this.cls = initial.cls as ClassKey;
      this.name = initial.name;
      this.nameEl.value = this.name;
    }
    this.refreshCards();
    for (const img of this.cardsEl.querySelectorAll<HTMLImageElement>('img.class-skill')) img.src = this.o.icons[img.dataset.skill!] ?? '';
    this.root.classList.remove('hidden');
    this.shown = true;
  }

  hide() {
    this.shown = false;
    this.root.classList.add('hidden');
  }

  get visible() {
    return this.shown;
  }

  /** current selection (for tests) */
  get selection(): CreateResult {
    return { cls: this.cls, name: this.name };
  }
}

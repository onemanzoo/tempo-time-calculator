const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../app.js'), 'utf8');
const html = readFileSync(join(__dirname, '../index.html'), 'utf8');

// Deliberately small adapter, not a browser DOM. Only the APIs app.js uses are
// implemented; unsupported APIs fail rather than silently passing a test.
class Element {
  constructor(tag, attributes = {}) {
    this.tagName = tag;
    this.attributes = attributes;
    this.children = [];
    this.listeners = new Map();
    this.value = attributes.value ?? '';
    this.textContent = '';
    this.hidden = Object.hasOwn(attributes, 'hidden');
    this.tabIndex = Number(attributes.tabindex ?? -1);
    this.classList = {
      toggle: (name, enabled) => {
        const names = new Set((this.attributes.class ?? '').split(' '));
        if (enabled) names.add(name);
        else names.delete(name);
        this.attributes.class = [...names].join(' ');
      },
      contains: name => (this.attributes.class ?? '').split(' ').includes(name),
    };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  async fire(type, properties = {}) {
    const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...properties };
    for (const callback of this.listeners.get(type) ?? []) await callback(event);
    return event;
  }
}

function attributes(text) {
  return Object.fromEntries([...text.matchAll(/([\w-]+)(?:="([^"]*)")?/g)]
    .map(([, name, value]) => [name, value ?? '']));
}

function loadApp({ saved = null, storageFails = false, clipboardFails = false } = {}) {
  const elements = new Map();
  // Read IDs, initial values and tab attributes from the real page. This only
  // recognizes the project's current double-quoted markup, not arbitrary HTML.
  for (const [, tag, raw] of html.matchAll(/<(\w+)\b([^>]*\bid="[^"]+"[^>]*)>/g)) {
    const attrs = attributes(raw);
    const element = new Element(tag, attrs);
    if (tag === 'select') {
      const body = html.slice(html.indexOf(`<select${raw}>`) + `<select${raw}>`.length).split('</select>')[0];
      const options = [...body.matchAll(/<option\b([^>]*)>/g)].map(match => attributes(match[1]));
      element.value = (options.find(option => Object.hasOwn(option, 'selected')) ?? options[0]).value;
    }
    elements.set(attrs.id, element);
  }
  const document = {
    activeElement: null,
    getElementById: id => elements.get(id) ?? null,
    createElement: tag => new Element(tag),
  };
  for (const element of elements.values()) element.focus = () => { document.activeElement = element; };
  const storage = new Map(saved === null ? [] : [['tempo-time-bpm', String(saved)]]);
  const copied = [];
  let now = 0;
  const context = vm.createContext({
    document,
    performance: { now: () => now },
    navigator: { clipboard: { async writeText(text) {
      if (clipboardFails) throw new Error('Clipboard unavailable');
      copied.push(text);
    } } },
    localStorage: {
      getItem(key) { if (storageFails) throw new Error('Storage unavailable'); return storage.get(key) ?? null; },
      setItem(key, value) { if (storageFails) throw new Error('Storage unavailable'); storage.set(key, value); },
    },
  });
  vm.runInContext(source, context, { filename: 'app.js' });
  return {
    get: id => document.getElementById(id), document, storage, copied,
    evaluate: expression => vm.runInContext(expression, context),
    async change(id, value, type = 'change') {
      const element = document.getElementById(id);
      element.value = String(value);
      return element.fire(type);
    },
    async tap(time) { now = time; await document.getElementById('tap').fire('click'); },
  };
}

module.exports = { loadApp };

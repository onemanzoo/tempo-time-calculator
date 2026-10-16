const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp } = require('./harness.cjs');

const resultIds = ['delays', 'predelays', 'decays', 'presets', 'customTiming'];
const delayButton = (app, row, column, hz = false) =>
  app.get('delays').children[row].children[column + 1].children[Number(hz)];
const cardTime = card => card.children[1].textContent;
const presetTimes = row => row.children.slice(1).map(cell => cell.children[0].textContent);

test('pure timing and display functions retain quarter-note maths and rounding', () => {
  const app = loadApp();
  for (const [expression, expected] of [
    ['timing(120)', 500], ['timing(60, 4)', 4000],
    ['timing(400, 0.0625)', 9.375], ['timing(20)', 3000],
    ['timing(125.5)', 60000 / 125.5],
    ['displayTime(999.999)', '1000 ms'], ['displayTime(1000)', '1.00 s'],
    ['displayTime(31.25)', '31.25 ms'], ['displayTime(4000)', '4.00 s'],
  ]) assert.equal(app.evaluate(expression), expected, expression);
  assert.ok(Math.abs(app.evaluate('timing(120, 2/3)') - 1000 / 3) < 1e-10);
});

test('startup renders all delay subdivisions, frequencies and reverb sections', () => {
  const app = loadApp();
  assert.equal(app.get('bpm').value, '120');
  assert.equal(app.get('bpm').getAttribute('aria-invalid'), 'false');
  assert.deepEqual(resultIds.map(id => app.get(id).children.length), [7, 4, 6, 4, 3]);
  // Independent expected values at 120 BPM: straight, dotted, triplet, Hz.
  assert.equal(delayButton(app, 2, 0).textContent, '500 ms');
  assert.equal(delayButton(app, 2, 1).textContent, '750 ms');
  assert.equal(delayButton(app, 2, 2).textContent, '333.33 ms');
  assert.equal(delayButton(app, 2, 0, true).textContent, '2.00 Hz');
  assert.equal(delayButton(app, 0, 0).textContent, '2.00 s');
  assert.equal(delayButton(app, 6, 0).textContent, '31.25 ms');
  assert.deepEqual(app.get('predelays').children.map(cardTime), ['62.5 ms', '31.25 ms', '15.63 ms', '7.81 ms']);
  assert.deepEqual(presetTimes(app.get('presets').children[0]), ['62.5 ms', '3.94 s', '4.00 s']);
  assert.deepEqual(presetTimes(app.get('presets').children[3]), ['3.91 ms', '496.09 ms', '500 ms']);
  assert.deepEqual(app.get('customTiming').children.map(cardTime), ['31.25 ms', '968.75 ms', '1.00 s']);
});

test('BPM input rejects invalid values, clears stale results and recovers at boundaries', async () => {
  const app = loadApp();
  for (const value of ['', '0', '-1', '19.9', '400.1', 'NaN', 'Infinity']) {
    await app.change('bpm', value, 'input');
    assert.equal(app.get('bpm').getAttribute('aria-invalid'), 'true', value);
    assert.equal(app.get('error').textContent, 'Enter a tempo between 20 and 400 BPM.');
    assert.equal(app.get('error').classList.contains('error'), true);
    assert.deepEqual(resultIds.map(id => app.get(id).children.length), [0, 0, 0, 0, 0]);
    assert.equal(app.get('equation').textContent, '');
    assert.equal(app.storage.get('tempo-time-bpm'), '120');
  }
  for (const [value, expected] of [['20', '3.00 s'], ['400', '150 ms'], ['125.5', '478.09 ms']]) {
    await app.change('bpm', value, 'input');
    assert.equal(app.get('bpm').getAttribute('aria-invalid'), 'false');
    assert.equal(app.get('error').classList.contains('error'), false);
    assert.equal(delayButton(app, 2, 0).textContent, expected);
    assert.equal(app.get('delays').children.length, 7);
    assert.equal(app.storage.get('tempo-time-bpm'), value);
  }
});

test('increment controls retain decimals and clamp to 20–400 BPM', async () => {
  const app = loadApp();
  await app.change('bpm', '120.5', 'input');
  await app.get('up').fire('click');
  assert.equal(app.get('bpm').value, '121.5');
  await app.get('down').fire('click');
  assert.equal(app.get('bpm').value, '120.5');
  for (const [value, control, expected] of [['20', 'down', '20.0'], ['400', 'up', '400.0'], ['', 'up', '121.0']]) {
    await app.change('bpm', value, 'input');
    await app.get(control).fire('click');
    assert.equal(app.get('bpm').value, expected);
  }
});

test('meter, total length and pre-delay changes recalculate reverb timings', async () => {
  const app = loadApp();
  await app.change('meter', '3');
  assert.equal(cardTime(app.get('decays').children[3]), '1.50 s');
  assert.deepEqual(presetTimes(app.get('presets').children[0]), ['62.5 ms', '2.94 s', '3.00 s']);
  await app.change('target', 'bar');
  await app.change('preNote', '32');
  assert.deepEqual(app.get('customTiming').children.map(cardTime), ['62.5 ms', '1.44 s', '1.50 s']);
  assert.equal(app.get('equation').textContent, '1.50 s total − 62.5 ms pre-delay = 1.44 s target decay.');
  await app.change('target', 'twoBars');
  assert.equal(cardTime(app.get('customTiming').children[2]), '3.00 s');
  await app.change('target', '1');
  assert.equal(cardTime(app.get('customTiming').children[1]), '437.5 ms');
});

test('tap tempo needs three taps, averages the last eight and resets after a long gap', async () => {
  const app = loadApp();
  await app.tap(0);
  await app.tap(600);
  assert.equal(app.get('bpm').value, '120');
  assert.equal(app.get('tapHint').textContent, '2 taps · keep tapping…');
  await app.tap(1200);
  assert.equal(app.get('bpm').value, '100.0');
  // The first interval is dropped when the ninth tap arrives.
  for (const time of [1700, 2200, 2700, 3200, 3700, 4200]) await app.tap(time);
  assert.equal(app.get('tapHint').textContent, '8 taps · 116.7 BPM');
  await app.tap(7201);
  assert.equal(app.get('tapHint').textContent, '1 tap · keep tapping…');
  await app.tap(7701);
  await app.tap(8201);
  assert.equal(app.get('bpm').value, '120.0');
});

test('manual entry and step buttons reset tap history; out-of-range tapping does not set BPM', async () => {
  for (const control of ['input', 'up', 'down']) {
    const app = loadApp();
    await app.tap(0);
    await app.tap(500);
    if (control === 'input') await app.change('bpm', '90', 'input');
    else await app.get(control).fire('click');
    await app.tap(1000);
    assert.equal(app.get('tapHint').textContent, '1 tap · keep tapping…');
  }
  const app = loadApp();
  for (const time of [0, 100, 200]) await app.tap(time);
  assert.equal(app.get('bpm').value, '120');
  assert.equal(app.get('tapHint').textContent, 'Tap a steady beat between 20 and 400 BPM.');
});

test('copy handlers send raw milliseconds and Hz; rejected clipboard writes show fallback text', async () => {
  for (const clipboardFails of [false, true]) {
    const app = loadApp({ clipboardFails });
    const button = delayButton(app, 0, 0);
    assert.equal(button.textContent, '2.00 s');
    assert.equal(button.getAttribute('aria-label'), 'Copy 1/1 (whole) straight: 2000.00 milliseconds');
    await button.fire('click');
    assert.equal(app.get('status').textContent, clipboardFails ? 'Copy this value: 2000.00 ms' : 'Copied 2,000.00 ms.');
    await delayButton(app, 2, 0, true).fire('click');
    assert.equal(app.get('status').textContent, clipboardFails ? 'Copy this value: 2.00 Hz' : 'Copied 2.00 Hz.');
    await app.get('customTiming').children[1].fire('click');
    assert.equal(app.get('status').textContent, clipboardFails ? 'Copy this value: 968.75 ms' : 'Copied 968.75 ms.');
    assert.deepEqual(app.copied, clipboardFails ? [] : ['2000.00', '2.00', '968.75']);
    await app.change('bpm', '100', 'input');
    assert.equal(app.get('status').textContent, '');
  }
});

test('saved BPM is restored only in range and storage failures do not prevent rendering', () => {
  for (const [saved, expected] of [[null, 120], ['125.5', 125.5], ['20', 20], ['400', 400], ['', 120], ['abc', 120], ['19', 120], ['401', 120]]) {
    const app = loadApp({ saved });
    assert.equal(Number(app.get('bpm').value), expected);
    assert.equal(app.storage.get('tempo-time-bpm'), String(expected));
  }
  const app = loadApp({ saved: '90', storageFails: true });
  assert.equal(app.get('bpm').value, '120');
  assert.equal(app.get('delays').children.length, 7);
});

test('tab click and keyboard handlers update selection, visibility, tab order and focus requests', async () => {
  const app = loadApp();
  const tabs = [app.get('delayTab'), app.get('reverbTab')];
  function selected(index) {
    tabs.forEach((tab, i) => {
      assert.equal(tab.getAttribute('aria-selected'), String(i === index));
      assert.equal(tab.tabIndex, i === index ? 0 : -1);
      assert.equal(app.get(tab.getAttribute('aria-controls')).hidden, i !== index);
    });
  }
  selected(0);
  await tabs[1].fire('click');
  selected(1);
  for (const [from, key, to] of [[1, 'ArrowRight', 0], [0, 'ArrowLeft', 1], [1, 'Home', 0], [0, 'End', 1]]) {
    app.get('status').textContent = 'Previous copy';
    const event = await tabs[from].fire('keydown', { key });
    assert.equal(event.defaultPrevented, true);
    assert.equal(app.document.activeElement, tabs[to]);
    assert.equal(app.get('status').textContent, '');
    selected(to);
  }
  const event = await tabs[1].fire('keydown', { key: 'Tab' });
  assert.equal(event.defaultPrevented, false);
  selected(1);
});

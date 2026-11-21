import assert from 'node:assert/strict';
import test from 'node:test';

test('rejects cue IDs that can be interpreted as CLI options', async () => {
  const { renderEarshotCue } = await import('./earshot.mjs');
  assert.equal(typeof renderEarshotCue, 'function');
  await assert.rejects(renderEarshotCue({ id: '--help' }), /cue ID/);
});

test('requires a WAV output before resolving the optional executable', async () => {
  const { renderEarshotCue } = await import('./earshot.mjs');
  await assert.rejects(renderEarshotCue({ id: 'whoosh_fast/crisp', output: 'cue.mp3' }), /\.wav extension/);
});

test('requires an approved absolute executable override when supplied', async () => {
  const { earshotBinary } = await import('./earshot.mjs');
  await assert.rejects(earshotBinary('relative-earshot.exe'), /absolute path/);
});

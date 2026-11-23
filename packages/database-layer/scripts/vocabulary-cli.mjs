import { setTimeout as delay } from 'node:timers/promises';
import { syncVocabulary, editVocabulary, vocabularyReport } from './lib/vocabulary-store.mjs';

export async function vocabularyCommand([action, ...args]) {
  if (action === 'review') {
    const [file, subjectId, ...ids] = args;
    let provider;
    if (ids.includes('--provider')) {
      if (ids.indexOf('--provider') !== ids.length - 2) throw new Error('Use --provider jev|openai after the candidate IDs');
      provider = ids.pop();
      ids.pop();
    }
    const { shadowReview } = await import('./lib/vocabulary-shadow.mjs');
    return shadowReview(file, subjectId, ids, provider, async (packet, options) => {
      const { rankVocabulary } = await import('./lib/vocabulary-decision.mjs');
      return rankVocabulary(packet, options);
    });
  }
  if (action === 'edit' && args.length === 2) return vocabularyReport(editVocabulary(...args));
  if (action === 'sync' && args.length === 2) return vocabularyReport(syncVocabulary(...args));
  if (action === 'watch' && args.length === 2) {
    let last;
    let lastError;
    while (true) {
      try {
        const report = JSON.stringify(vocabularyReport(syncVocabulary(...args)));
        if (last !== report || lastError) console.log(report);
        last = report;
        lastError = undefined;
      } catch (error) {
        if (error.message !== lastError) console.error(error.message);
        lastError = error.message;
      }
      await delay(1000);
    }
  }
  throw new Error('Usage: vocabulary sync|watch <source-directory> <state.json> OR vocabulary review <state.json> <subject-id> <candidate-id>... [--provider jev|openai] OR vocabulary edit <state.json> "<instruction>"');
}

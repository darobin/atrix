/**
 * Lexicon plugin interface:
 * {
 *   nsidPrefix: string,           // e.g. 'app.bsky'
 *   displayName: string,          // e.g. 'Bluesky'
 *   renderers: {                  // NSID → React component
 *     'app.bsky.feed.post': PostRenderer,
 *   },
 *   composers: {                  // NSID → React component
 *     'app.bsky.feed.post': PostComposer,
 *   },
 *   defaultComposerType: string,  // default NSID for composing
 *   canHandleEvent(matrixEvent): boolean,
 *   recordToMatrixContent(record): object,
 *   matrixContentToRecord(content): object,
 * }
 */
class LexiconRegistry {
  #plugins = new Map();

  register(plugin) {
    this.#plugins.set(plugin.nsidPrefix, plugin);
  }

  getByPrefix(prefix) {
    return this.#plugins.get(prefix) || null;
  }

  /**
   * Find the best plugin for a Matrix event.
   * Checks io.atrix.lexicon.event $type against registered prefixes (longest match first).
   */
  findForEvent(matrixEvent) {
    const type = typeof matrixEvent.getType === 'function'
      ? matrixEvent.getType()
      : matrixEvent.type;

    const content = typeof matrixEvent.getContent === 'function'
      ? matrixEvent.getContent()
      : matrixEvent.content;

    if (type !== 'io.atrix.lexicon.event') return null;

    const nsid = content?.['$type'];
    if (!nsid) return null;

    // Find longest matching prefix
    let best = null;
    let bestLen = -1;
    for (const [prefix, plugin] of this.#plugins) {
      if ((nsid === prefix || nsid.startsWith(prefix + '.')) && prefix.length > bestLen) {
        best = plugin;
        bestLen = prefix.length;
      }
    }
    return best;
  }

  getAll() {
    return [...this.#plugins.values()];
  }
}

export const registry = new LexiconRegistry();

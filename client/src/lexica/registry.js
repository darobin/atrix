/**
 * Lexicon plugin interface:
 * {
 *   nsidPrefix: string,           // e.g. 'app.bsky'
 *   displayName: string,          // e.g. 'Bluesky'
 *   renderers: {                  // collection NSID → React component
 *     'app.bsky.feed.post': PostRenderer,
 *   },
 *   composers: {                  // collection NSID → React component
 *     'app.bsky.feed.post': PostComposer,
 *   },
 *   defaultComposerType: string,  // default collection NSID for composing
 *   canHandleEvent(matrixEvent): boolean,
 * }
 *
 * Matrix event format (com.atproto.repo.createRecord):
 * {
 *   type: 'com.atproto.repo.createRecord',
 *   content: {
 *     repo: 'did:plc:...',
 *     collection: 'app.bsky.feed.post',
 *     rkey: '<tid>',
 *     record: { $type: 'app.bsky.feed.post', ... }
 *   }
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
   * For com.atproto.repo.createRecord events, matches content.collection against registered prefixes.
   */
  findForEvent(matrixEvent) {
    const type = typeof matrixEvent.getType === 'function'
      ? matrixEvent.getType()
      : matrixEvent.type;

    const content = typeof matrixEvent.getContent === 'function'
      ? matrixEvent.getContent()
      : matrixEvent.content;

    let nsid;
    if (type === 'com.atproto.repo.createRecord') {
      nsid = content?.collection;
    } else {
      return null;
    }

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

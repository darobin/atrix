import { registry } from '../registry.js';
import PostRenderer from './PostRenderer.jsx';
import LikeRenderer from './LikeRenderer.jsx';
import RepostRenderer from './RepostRenderer.jsx';
import PostComposer from './PostComposer.jsx';

const bskyPlugin = {
  nsidPrefix: 'app.bsky',
  displayName: 'Bluesky',

  renderers: {
    'app.bsky.feed.post': PostRenderer,
    'app.bsky.feed.like': LikeRenderer,
    'app.bsky.feed.repost': RepostRenderer,
  },

  composers: {
    'app.bsky.feed.post': PostComposer,
  },

  defaultComposerType: 'app.bsky.feed.post',

  canHandleEvent(matrixEvent) {
    const type = typeof matrixEvent.getType === 'function'
      ? matrixEvent.getType()
      : matrixEvent.type;
    if (type !== 'io.atrix.lexicon.event') return false;
    const content = typeof matrixEvent.getContent === 'function'
      ? matrixEvent.getContent()
      : matrixEvent.content;
    return content?.['$type']?.startsWith('app.bsky.');
  },

  recordToMatrixContent(record) {
    return {
      '$type': record.$type,
      ...record,
    };
  },

  matrixContentToRecord(content) {
    const { '$type': type, ...rest } = content;
    return { $type: type, ...rest };
  },
};

registry.register(bskyPlugin);

export default bskyPlugin;

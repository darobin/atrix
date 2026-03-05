import { registry } from '../registry.js';
import PostRenderer from './PostRenderer.jsx';
import LikeRenderer from './LikeRenderer.jsx';
import RepostRenderer from './RepostRenderer.jsx';
import PostComposer from './PostComposer.jsx';

const bskyPlugin = {
  nsidPrefix: 'app.bsky',
  displayName: 'Bluesky',

  // Keyed by collection NSID
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
    if (type !== 'com.atproto.repo.createRecord') return false;
    const content = typeof matrixEvent.getContent === 'function'
      ? matrixEvent.getContent()
      : matrixEvent.content;
    return content?.collection?.startsWith('app.bsky.');
  },
};

registry.register(bskyPlugin);

export default bskyPlugin;

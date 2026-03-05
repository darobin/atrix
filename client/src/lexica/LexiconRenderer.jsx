import React from 'react';
import { registry } from './registry.js';
import PlainMessageRenderer from './PlainMessageRenderer.jsx';

export default function LexiconRenderer({ event, roomConfig, reactions, matrixClient }) {
  const plugin = registry.findForEvent(event);

  if (plugin) {
    const content = typeof event.getContent === 'function' ? event.getContent() : event.content;
    // The collection (e.g. 'app.bsky.feed.post') is the key into plugin.renderers
    const nsid = content?.collection;
    const Renderer = nsid && plugin.renderers?.[nsid];
    if (Renderer) {
      return (
        <Renderer
          event={event}
          reactions={reactions}
          matrixClient={matrixClient}
          roomConfig={roomConfig}
        />
      );
    }
  }

  // Fallback for m.room.message and unknown events
  return <PlainMessageRenderer event={event} />;
}

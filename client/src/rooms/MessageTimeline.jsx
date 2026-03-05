import React, { useEffect, useRef, useState } from 'react';
import LexiconRenderer from '../lexica/LexiconRenderer.jsx';

export default function MessageTimeline({ room, roomConfig, matrixClient }) {
  const [events, setEvents] = useState([]);
  const bottomRef = useRef(null);

  function loadEvents() {
    if (!room) return;
    const evts = room.getLiveTimeline().getEvents().filter(e =>
      e.getType() === 'm.room.message' ||
      e.getType() === 'com.atproto.repo.createRecord' ||
      e.getType() === 'com.atproto.repo.deleteRecord'
    );
    setEvents([...evts]);
  }

  useEffect(() => {
    loadEvents();
    const onTimeline = (event, r) => {
      if (r?.roomId === room?.roomId) loadEvents();
    };
    matrixClient?.on('Room.timeline', onTimeline);
    return () => matrixClient?.off('Room.timeline', onTimeline);
  }, [room, matrixClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // --- ATProto-semantic grouping ---

  // 1. Build AT URI → Matrix event ID map for all post createRecords
  const atUriToEventId = {};
  for (const event of events) {
    if (event.getType() !== 'com.atproto.repo.createRecord') continue;
    const c = event.getContent();
    if (c.repo && c.collection && c.rkey) {
      atUriToEventId[`at://${c.repo}/${c.collection}/${c.rkey}`] = event.getId();
    }
  }

  // 2. Build set of deleted records: "repo/collection/rkey"
  const deleted = new Set();
  for (const event of events) {
    if (event.getType() !== 'com.atproto.repo.deleteRecord') continue;
    const c = event.getContent();
    if (c.repo && c.collection && c.rkey) {
      deleted.add(`${c.repo}/${c.collection}/${c.rkey}`);
    }
  }

  // 3. Separate reactions (likes/reposts) from main events
  const reactions = {}; // eventId → [reaction events]
  const mainEvents = [];

  for (const event of events) {
    const type = event.getType();

    // deleteRecord events are never shown directly — they suppress createRecords
    if (type === 'com.atproto.repo.deleteRecord') continue;

    if (type === 'com.atproto.repo.createRecord') {
      const c = event.getContent();
      const key = c.repo && c.collection && c.rkey
        ? `${c.repo}/${c.collection}/${c.rkey}`
        : null;

      // Skip records that have been deleted
      if (key && deleted.has(key)) continue;

      // Likes and reposts are reactions — group them with their parent post
      if (c.collection === 'app.bsky.feed.like' || c.collection === 'app.bsky.feed.repost') {
        const subjectUri = c.record?.subject?.uri;
        const parentEventId = subjectUri ? atUriToEventId[subjectUri] : null;
        if (parentEventId) {
          if (!reactions[parentEventId]) reactions[parentEventId] = [];
          reactions[parentEventId].push(event);
        }
        // If no parent found in timeline (e.g. history not loaded), skip silently
        continue;
      }
    }

    mainEvents.push(event);
  }

  if (mainEvents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No messages yet
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-4 space-y-2">
      {mainEvents.map(event => (
        <LexiconRenderer
          key={event.getId()}
          event={event}
          roomConfig={roomConfig}
          reactions={reactions[event.getId()] || []}
          matrixClient={matrixClient}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

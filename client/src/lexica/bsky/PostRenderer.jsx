import React, { useState } from 'react';
import { useProfile } from '../../hooks/useProfile.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import Timestamp from '../../components/Timestamp.jsx';
import { genTID } from './tid.js';

function mxcToHttp(url) {
  if (!url?.startsWith('mxc://')) return url;
  const [server, mediaId] = url.slice(6).split('/');
  return `/_matrix/media/v3/download/${server}/${mediaId}`;
}

function HeartIcon({ filled }) {
  return (
    <svg className="w-4 h-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function RepostIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export default function PostRenderer({ event, reactions = [], matrixClient }) {
  const content = typeof event.getContent === 'function' ? event.getContent() : event.content;
  const sender = typeof event.getSender === 'function' ? event.getSender() : event.sender;
  const ts = typeof event.getTs === 'function' ? event.getTs() : event.origin_server_ts;
  const eventId = typeof event.getId === 'function' ? event.getId() : event.event_id;
  const roomId = typeof event.getRoomId === 'function' ? event.getRoomId() : event.room_id;

  // Support both new format (content.record) and legacy (content directly)
  const record = content?.record ?? content;
  const postUri = content?.repo && content?.rkey
    ? `at://${content.repo}/app.bsky.feed.post/${content.rkey}`
    : null;

  const profile = useProfile(sender, matrixClient);
  const { user } = useAuth();

  // null = no pending action; 'like'/'unlike' = optimistic state
  const [pendingLike, setPendingLike] = useState(null);
  const [pendingRepost, setPendingRepost] = useState(null);

  const currentUserMxid = matrixClient?.getUserId?.();

  const myLike = reactions.find(e => {
    const c = e.getContent?.() ?? e.content;
    const s = e.getSender?.() ?? e.sender;
    return c?.collection === 'app.bsky.feed.like' && s === currentUserMxid;
  });
  const myRepost = reactions.find(e => {
    const c = e.getContent?.() ?? e.content;
    const s = e.getSender?.() ?? e.sender;
    return c?.collection === 'app.bsky.feed.repost' && s === currentUserMxid;
  });

  const hasLiked = !!myLike;
  const hasReposted = !!myRepost;

  const likeCount = reactions.filter(e => (e.getContent?.() ?? e.content)?.collection === 'app.bsky.feed.like').length;
  const repostCount = reactions.filter(e => (e.getContent?.() ?? e.content)?.collection === 'app.bsky.feed.repost').length;

  const isLiked = pendingLike !== null ? pendingLike === 'like' : hasLiked;
  const isReposted = pendingRepost !== null ? pendingRepost === 'repost' : hasReposted;
  const totalLikes = likeCount
    + (pendingLike === 'like' && !hasLiked ? 1 : 0)
    + (pendingLike === 'unlike' && hasLiked ? -1 : 0);
  const totalReposts = repostCount
    + (pendingRepost === 'repost' && !hasReposted ? 1 : 0)
    + (pendingRepost === 'unrepost' && hasReposted ? -1 : 0);

  async function handleLike() {
    if (!matrixClient || !user?.did) return;
    if (isLiked && myLike) {
      // Unlike: send deleteRecord for the existing like
      const likeContent = myLike.getContent?.() ?? myLike.content;
      if (!likeContent?.rkey) return;
      setPendingLike('unlike');
      try {
        await matrixClient.sendEvent(roomId, 'com.atproto.repo.deleteRecord', {
          repo: user.did,
          collection: 'app.bsky.feed.like',
          rkey: likeContent.rkey,
        });
      } catch {
        setPendingLike(null);
      }
    } else if (!isLiked) {
      // Like: send createRecord
      setPendingLike('like');
      try {
        await matrixClient.sendEvent(roomId, 'com.atproto.repo.createRecord', {
          repo: user.did,
          collection: 'app.bsky.feed.like',
          rkey: genTID(),
          record: {
            $type: 'app.bsky.feed.like',
            subject: { uri: postUri ?? eventId, cid: eventId },
            createdAt: new Date().toISOString(),
          },
        });
      } catch {
        setPendingLike(null);
      }
    }
  }

  async function handleRepost() {
    if (!matrixClient || !user?.did) return;
    if (isReposted && myRepost) {
      // Un-repost: send deleteRecord for the existing repost
      const repostContent = myRepost.getContent?.() ?? myRepost.content;
      if (!repostContent?.rkey) return;
      setPendingRepost('unrepost');
      try {
        await matrixClient.sendEvent(roomId, 'com.atproto.repo.deleteRecord', {
          repo: user.did,
          collection: 'app.bsky.feed.repost',
          rkey: repostContent.rkey,
        });
      } catch {
        setPendingRepost(null);
      }
    } else if (!isReposted) {
      // Repost: send createRecord
      setPendingRepost('repost');
      try {
        await matrixClient.sendEvent(roomId, 'com.atproto.repo.createRecord', {
          repo: user.did,
          collection: 'app.bsky.feed.repost',
          rkey: genTID(),
          record: {
            $type: 'app.bsky.feed.repost',
            subject: { uri: postUri ?? eventId, cid: eventId },
            createdAt: new Date().toISOString(),
          },
        });
      } catch {
        setPendingRepost(null);
      }
    }
  }

  const displayName = profile?.displayName || profile?.handle || sender;
  const handle = profile?.handle || sender;
  const images = record?.embed?.['$type'] === 'app.bsky.embed.images' ? (record.embed.images || []) : [];
  const external = record?.embed?.['$type'] === 'app.bsky.embed.external' ? record.embed.external : null;

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50/30 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile?.avatar ? (
            <img src={profile.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-bold">
              {(handle[0] || '?').toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name / handle / time */}
          <div className="flex items-baseline gap-1 flex-wrap">
            <span className="font-bold text-gray-900 text-[0.9rem]">{displayName}</span>
            <span className="text-gray-500 text-sm">@{handle}</span>
            <span className="text-gray-400 text-xs ml-auto whitespace-nowrap">
              <Timestamp ts={ts} />
            </span>
          </div>

          {/* Text */}
          <div className="text-gray-900 text-sm leading-relaxed mt-1 whitespace-pre-wrap break-words">
            {record?.text}
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div className={`mt-2 grid gap-1 rounded-xl overflow-hidden ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={mxcToHttp(img.image?.ref)}
                  alt={img.alt || ''}
                  className="w-full h-52 object-cover bg-gray-100"
                />
              ))}
            </div>
          )}

          {/* Link card */}
          {external && (
            <a
              href={external.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex flex-col border border-gray-200 rounded-xl overflow-hidden hover:bg-gray-100 transition-colors"
            >
              {external.thumb && (
                <img src={mxcToHttp(external.thumb)} alt="" className="w-full h-36 object-cover bg-gray-100" />
              )}
              <div className="px-3 py-2">
                <div className="text-xs text-gray-400 mb-0.5 truncate">
                  {(() => { try { return new URL(external.uri).hostname; } catch { return external.uri; } })()}
                </div>
                {external.title && <div className="font-semibold text-gray-900 text-sm truncate">{external.title}</div>}
                {external.description && (
                  <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{external.description}</div>
                )}
              </div>
            </a>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs transition-colors ${isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
            >
              <HeartIcon filled={isLiked} />
              {totalLikes > 0 && <span>{totalLikes}</span>}
            </button>
            <button
              onClick={handleRepost}
              className={`flex items-center gap-1.5 text-xs transition-colors ${isReposted ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
            >
              <RepostIcon />
              {totalReposts > 0 && <span>{totalReposts}</span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

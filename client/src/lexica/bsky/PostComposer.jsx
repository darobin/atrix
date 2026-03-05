import React, { useRef, useState } from 'react';
import { useMatrix } from '../../matrix/MatrixProvider.jsx';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { genTID } from './tid.js';

const MAX_LENGTH = 300;
const MAX_IMAGES = 4;
const URL_RE = /https?:\/\/[^\s]+/i;

function ImageIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 20.25h18A.75.75 0 0021.75 19.5v-15A.75.75 0 0021 3.75H3A.75.75 0 002.25 4.5v15c0 .414.336.75.75.75z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  );
}

async function uploadToMatrix(file, matrixClient) {
  const accessToken = matrixClient.getAccessToken();
  const resp = await fetch(
    `/_matrix/media/v3/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': file.type,
      },
      body: file,
    }
  );
  if (!resp.ok) throw new Error('Upload failed');
  const { content_uri } = await resp.json();
  return content_uri; // mxc://...
}

export default function PostComposer({ onSend }) {
  const { matrixClient } = useMatrix();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [images, setImages] = useState([]); // [{file, localUrl, mxc, alt}]
  const [linkUrl, setLinkUrl] = useState('');
  const [linkCard, setLinkCard] = useState(null); // {uri, title, description, image}
  const [linkLoading, setLinkLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const remaining = MAX_LENGTH - text.length;

  function handleTextChange(e) {
    const val = e.target.value;
    setText(val);
    if (images.length === 0 && !linkCard) {
      const match = val.match(URL_RE);
      if (match) setLinkUrl(match[0]);
    }
  }

  async function handleImagePick(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES - images.length);
    const newImages = files.map(file => ({
      file,
      localUrl: URL.createObjectURL(file),
      mxc: null,
      alt: '',
    }));
    setImages(prev => [...prev, ...newImages].slice(0, MAX_IMAGES));
    setLinkUrl('');
    setLinkCard(null);
    e.target.value = '';
  }

  function removeImage(i) {
    setImages(prev => {
      URL.revokeObjectURL(prev[i].localUrl);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  async function fetchLinkPreview() {
    if (!linkUrl) return;
    setLinkLoading(true);
    try {
      const r = await fetch(`/api/link-preview?url=${encodeURIComponent(linkUrl)}`, { credentials: 'include' });
      if (r.ok) setLinkCard(await r.json());
    } catch { /* non-fatal */ }
    setLinkLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() && images.length === 0) return;
    if (remaining < 0) return;
    if (!user?.did) return;
    setSending(true);

    try {
      const record = {
        $type: 'app.bsky.feed.post',
        text: text.trim(),
        createdAt: new Date().toISOString(),
        langs: ['en'],
      };

      // Upload images
      if (images.length > 0 && matrixClient) {
        const uploaded = await Promise.all(
          images.map(async img => {
            const mxc = await uploadToMatrix(img.file, matrixClient);
            return {
              image: { '$type': 'blob', ref: mxc, mimeType: img.file.type, size: img.file.size },
              alt: img.alt || '',
            };
          })
        );
        record.embed = { '$type': 'app.bsky.embed.images', images: uploaded };
      } else if (linkCard) {
        record.embed = {
          '$type': 'app.bsky.embed.external',
          external: {
            uri: linkCard.uri,
            title: linkCard.title || '',
            description: linkCard.description || '',
          },
        };
      }

      await onSend({
        type: 'com.atproto.repo.createRecord',
        repo: user.did,
        collection: 'app.bsky.feed.post',
        rkey: genTID(),
        record,
      });

      setText('');
      images.forEach(img => URL.revokeObjectURL(img.localUrl));
      setImages([]);
      setLinkUrl('');
      setLinkCard(null);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4">
      <div className="border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 bg-white">
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder="What's happening?"
          rows={3}
          className="w-full px-4 pt-3 pb-1 text-sm resize-none focus:outline-none"
          disabled={sending}
        />

        {/* Image previews */}
        {images.length > 0 && (
          <div className={`px-4 pb-2 grid gap-1 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {images.map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden">
                <img src={img.localUrl} alt="" className="w-full h-40 object-cover bg-gray-100" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/80"
                >
                  ×
                </button>
                <input
                  type="text"
                  placeholder="Alt text"
                  value={img.alt}
                  onChange={e => setImages(prev => prev.map((im, idx) => idx === i ? { ...im, alt: e.target.value } : im))}
                  className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 placeholder-white/60 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {/* Link card preview */}
        {linkUrl && !linkCard && images.length === 0 && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <span className="text-xs text-gray-500 truncate flex-1">{linkUrl}</span>
            <button
              type="button"
              onClick={fetchLinkPreview}
              disabled={linkLoading}
              className="text-xs text-sky-600 hover:text-sky-700 flex-shrink-0"
            >
              {linkLoading ? 'Loading…' : 'Add card'}
            </button>
            <button type="button" onClick={() => setLinkUrl('')} className="text-xs text-gray-400">×</button>
          </div>
        )}
        {linkCard && (
          <div className="px-4 pb-2">
            <div className="border border-gray-200 rounded-xl overflow-hidden flex items-center gap-3 pr-3">
              {linkCard.image && (
                <img src={linkCard.image} alt="" className="w-16 h-16 object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 py-2 flex-1">
                <div className="font-semibold text-gray-900 text-xs truncate">{linkCard.title}</div>
                {linkCard.description && (
                  <div className="text-gray-500 text-xs truncate">{linkCard.description}</div>
                )}
              </div>
              <button type="button" onClick={() => { setLinkCard(null); setLinkUrl(''); }} className="text-gray-400 text-sm flex-shrink-0">×</button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <div className="flex items-center gap-3 text-sky-500">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImagePick}
              disabled={images.length >= MAX_IMAGES}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              className="hover:text-sky-600 disabled:opacity-40 transition-colors"
              title="Add images"
            >
              <ImageIcon />
            </button>
            {linkUrl && !linkCard && (
              <button
                type="button"
                onClick={fetchLinkPreview}
                disabled={linkLoading}
                className="hover:text-sky-600 disabled:opacity-40 transition-colors"
                title="Add link card"
              >
                <LinkIcon />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${remaining < 0 ? 'text-red-500' : remaining < 20 ? 'text-amber-500' : 'text-gray-400'}`}>
              {remaining}
            </span>
            <button
              type="submit"
              disabled={sending || (!text.trim() && images.length === 0) || remaining < 0}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            >
              {sending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

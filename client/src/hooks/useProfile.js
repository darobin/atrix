import { useState, useEffect } from 'react';

const BSKY_API = 'https://public.api.bsky.app/xrpc';
const cache = new Map();

// Extract ATProto handle from Matrix MXID via the client's user store,
// falling back to a best-effort parse of the localpart.
function getHandleFromMxid(mxid, matrixClient) {
  const matrixUser = matrixClient?.getUser(mxid);
  if (matrixUser?.displayName) return matrixUser.displayName;
  // @atproto_did_plc_xxx:server → strip prefix, won't be a real handle but better than nothing
  return mxid?.replace(/^@/, '').split(':')[0].replace(/^atproto_/, '') || mxid;
}

export function useProfile(mxid, matrixClient) {
  const [profile, setProfile] = useState(() => cache.get(mxid) || null);

  useEffect(() => {
    if (!mxid) return;
    if (cache.has(mxid)) {
      setProfile(cache.get(mxid));
      return;
    }

    const handle = getHandleFromMxid(mxid, matrixClient);

    fetch(`${BSKY_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const p = data
          ? { handle: data.handle, displayName: data.displayName || data.handle, avatar: data.avatar }
          : { handle, displayName: handle };
        cache.set(mxid, p);
        setProfile(p);
      })
      .catch(() => {
        const p = { handle, displayName: handle };
        cache.set(mxid, p);
        setProfile(p);
      });
  }, [mxid]);

  return profile;
}

/**
 * Validate that an ATProto NSID is well-formed.
 * NSID format: reversed-domain-segment.name (e.g. app.bsky.feed.post)
 */
export function isValidNsid(nsid) {
  if (typeof nsid !== 'string') return false;
  // Must have at least 3 segments
  const parts = nsid.split('.');
  if (parts.length < 3) return false;
  // Each segment must be alphanumeric (+ hyphens, except first char)
  return parts.every(p => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(p) || /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(p));
}

/**
 * Check if an NSID matches a prefix.
 * Prefix "app.bsky" matches "app.bsky.feed.post" but not "app.bskyfoo".
 */
export function nsidMatchesPrefix(nsid, prefix) {
  if (!isValidNsid(nsid)) return false;
  if (nsid === prefix) return true;
  return nsid.startsWith(prefix + '.');
}

/**
 * Validate a lexicon event against allowed prefixes.
 */
export function validateLexiconEvent(content, allowedPrefixes) {
  const nsid = content?.['$type'];
  if (!nsid) return { valid: false, error: 'Missing $type field' };
  if (!isValidNsid(nsid)) return { valid: false, error: `Invalid NSID: ${nsid}` };

  if (!allowedPrefixes || allowedPrefixes.length === 0) return { valid: true };

  const matches = allowedPrefixes.some(prefix => nsidMatchesPrefix(nsid, prefix));
  if (!matches) {
    return { valid: false, error: `NSID ${nsid} not allowed in this room` };
  }

  return { valid: true };
}

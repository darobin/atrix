import * as sdk from 'matrix-js-sdk';

let _client = null;

export function createMatrixClient({ mxid, accessToken, homeserverUrl }) {
  if (_client) {
    _client.stopClient();
    _client = null;
  }

  _client = sdk.createClient({
    baseUrl: homeserverUrl,
    userId: mxid,
    accessToken,
    timelineSupport: true,
  });

  return _client;
}

export function getMatrixClient() {
  return _client;
}

export function destroyMatrixClient() {
  if (_client) {
    _client.stopClient();
    _client = null;
  }
}

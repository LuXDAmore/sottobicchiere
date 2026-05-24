import type { ServerMessage } from '../../shared/types/ws';

type PeerLike = { send: (data: string) => void };

const peersBySession = new Map<string, Map<string, PeerLike>>();

export function registerTablePeer(tableSessionId: string, peerId: string, peer: PeerLike) {
  if (!peersBySession.has(tableSessionId)) peersBySession.set(tableSessionId, new Map());
  peersBySession.get(tableSessionId)?.set(peerId, peer);
}

export function unregisterTablePeer(tableSessionId: string, peerId: string) {
  const peers = peersBySession.get(tableSessionId);
  if (!peers) return;
  peers.delete(peerId);
  if (peers.size === 0) peersBySession.delete(tableSessionId);
}

export function emitTableEvent(tableSessionId: string, message: ServerMessage) {
  const peers = peersBySession.get(tableSessionId);
  if (!peers) return;
  const payload = JSON.stringify(message);
  peers.forEach(peer => peer.send(payload));
}

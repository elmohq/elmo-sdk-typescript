import type { AnyTransport, Binding, Interaction } from './types';

export type Protocol = 'channel' | 'rest' | 'websocket';

export interface ProtocolSetup {
  binding: Binding;
  transport: AnyTransport;
}

export type Protocols = Partial<Record<Protocol, ProtocolSetup>>;

export function onlyProtocol(
  protocols: Protocols,
  _interaction: Interaction | undefined,
): ProtocolSetup {
  return Object.values(protocols)[0]!;
}

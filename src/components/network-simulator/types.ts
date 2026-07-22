export interface Packet {
  id: number;
  from: "trusted" | "dmz" | "external";
  to: "trusted" | "dmz" | "external";
  protocol: "TCP" | "UDP" | "ICMP" | "HTTPS";
  srcIP: string;
  dstIP: string;
  srcPort: number;
  dstPort: number;
  payload: string;
  status: "Allowed" | "Denied";
  matchedPolicy: string;
  timestamp: string;
  reason: string;
}

export type Zone = Packet["from"];
export type Protocol = Packet["protocol"];

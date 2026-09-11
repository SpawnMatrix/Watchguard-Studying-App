export function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) throw new Error('Invalid IPv4 address');
  return parts.reduce((n, part) => n * 256 + Number(part), 0);
}
export function numberToIPv4(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Invalid IPv4 value');
  return [24, 16, 8, 0].map(shift => (value >>> shift) & 255).join('.');
}
export function subnet(ip: string, prefix: number) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error('Invalid prefix');
  const size = 2 ** (32 - prefix);
  const network = Math.floor(ipv4ToNumber(ip) / size) * size;
  return { network, broadcast: network + size - 1, size, mask: numberToIPv4(2 ** 32 - size),
    // /31 is point-to-point; /32 is a host route. Templates state their context.
    usable: prefix >= 31 ? size : size - 2 };
}
export function contains(cidr: string, ip: string) {
  const [base, bits] = cidr.split('/');
  const range = subnet(base, Number(bits));
  const value = ipv4ToNumber(ip);
  return value >= range.network && value <= range.broadcast;
}
export function smallestLanPrefix(hosts: number): number {
  if (!Number.isInteger(hosts) || hosts < 1 || hosts > 2 ** 32 - 2) throw new Error('Invalid host requirement');
  return 32 - Math.ceil(Math.log2(hosts + 2));
}
export function longestPrefix(routes: { cidr: string; gateway: string }[], destination: string) {
  return routes.filter(r => contains(r.cidr, destination)).sort((a, b) => Number(b.cidr.split('/')[1]) - Number(a.cidr.split('/')[1]))[0];
}

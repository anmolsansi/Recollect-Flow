export type SourceDestinationDecision =
  | { allowed: true; url: URL }
  | { allowed: false; reason: 'SOURCE_DESTINATION_BLOCKED' };

const BLOCKED_HOST_SUFFIXES = [
  '.localhost',
  '.local',
  '.localdomain',
  '.internal',
  '.home.arpa',
  '.test',
  '.invalid',
  '.onion',
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

function normalizeHostname(hostname: string): string {
  const unwrapped =
    hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname;
  return unwrapped.toLowerCase().replace(/\.$/, '');
}

function parseIpv4(hostname: string): [number, number, number, number] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;

  const numbers = parts.map((part) => Number(part));
  if (
    numbers.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return null;
  }
  return numbers as [number, number, number, number];
}

function ipv4ToInt(parts: [number, number, number, number]): number {
  return (
    ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
  );
}

function inIpv4Cidr(value: number, network: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (network & mask);
}

function isBlockedIpv4(parts: [number, number, number, number]): boolean {
  const value = ipv4ToInt(parts);
  const ranges: Array<[number, number]> = [
    [ipv4ToInt([0, 0, 0, 0]), 8],
    [ipv4ToInt([10, 0, 0, 0]), 8],
    [ipv4ToInt([100, 64, 0, 0]), 10],
    [ipv4ToInt([127, 0, 0, 0]), 8],
    [ipv4ToInt([169, 254, 0, 0]), 16],
    [ipv4ToInt([172, 16, 0, 0]), 12],
    [ipv4ToInt([192, 0, 0, 0]), 24],
    [ipv4ToInt([192, 0, 2, 0]), 24],
    [ipv4ToInt([192, 88, 99, 0]), 24],
    [ipv4ToInt([192, 168, 0, 0]), 16],
    [ipv4ToInt([198, 18, 0, 0]), 15],
    [ipv4ToInt([198, 51, 100, 0]), 24],
    [ipv4ToInt([203, 0, 113, 0]), 24],
    [ipv4ToInt([224, 0, 0, 0]), 4],
    [ipv4ToInt([240, 0, 0, 0]), 4],
  ];
  return ranges.some(([network, prefix]) => inIpv4Cidr(value, network, prefix));
}

type Ipv6Parts = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

function parseIpv6(hostname: string): Ipv6Parts | null {
  let value = hostname;
  if (!value.includes(':')) return null;

  if (value.includes('.')) {
    const lastColon = value.lastIndexOf(':');
    const ipv4 = parseIpv4(value.slice(lastColon + 1));
    if (!ipv4) return null;
    const high = (ipv4[0] << 8) | ipv4[1];
    const low = (ipv4[2] << 8) | ipv4[3];
    value = `${value.slice(0, lastColon)}:${high.toString(16)}:${low.toString(16)}`;
  }

  const halves = value.split('::');
  if (halves.length > 2) return null;

  const parseHalf = (half: string): number[] | null => {
    if (!half) return [];
    const groups = half.split(':');
    const parsed = groups.map((group) => Number.parseInt(group, 16));
    if (
      groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group)) ||
      parsed.some((group) => !Number.isInteger(group))
    ) {
      return null;
    }
    return parsed;
  };

  const left = parseHalf(halves[0] ?? '');
  const right = parseHalf(halves[1] ?? '');
  if (!left || !right) return null;

  if (halves.length === 1) {
    return left.length === 8 ? (left as Ipv6Parts) : null;
  }

  const missing = 8 - left.length - right.length;
  if (missing < 1) return null;
  const expanded = [...left, ...Array<number>(missing).fill(0), ...right];
  return expanded.length === 8 ? (expanded as Ipv6Parts) : null;
}

function isBlockedIpv6(parts: Ipv6Parts): boolean {
  if (parts.length !== 8) return true;

  const firstSevenZero = parts.slice(0, 7).every((part) => part === 0);
  if (firstSevenZero && (parts[7] === 0 || parts[7] === 1)) return true;

  if ((parts[0] & 0xfe00) === 0xfc00) return true;
  if ((parts[0] & 0xffc0) === 0xfe80) return true;
  if ((parts[0] & 0xffc0) === 0xfec0) return true;
  if ((parts[0] & 0xff00) === 0xff00) return true;

  if (parts[0] === 0x0064 && parts[1] === 0xff9b && parts[2] === 0x0001) {
    return true;
  }
  if (
    parts[0] === 0x0100 &&
    parts[1] === 0 &&
    parts[2] === 0 &&
    parts[3] === 0
  ) {
    return true;
  }
  if (parts[0] === 0x2001 && parts[1] === 0x0000) return true;
  if (parts[0] === 0x2001 && parts[1] >= 0x0010 && parts[1] <= 0x002f) {
    return true;
  }
  if (parts[0] === 0x2001 && parts[1] === 0x0db8) return true;
  if (parts[0] === 0x2002) return true;

  const isMappedIpv4 =
    parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  if (isMappedIpv4) {
    return isBlockedIpv4([
      parts[6] >> 8,
      parts[6] & 0xff,
      parts[7] >> 8,
      parts[7] & 0xff,
    ]);
  }

  const isDeprecatedCompatibleIpv4 = parts
    .slice(0, 6)
    .every((part) => part === 0);
  return isDeprecatedCompatibleIpv4;
}

function isBlockedHostname(hostname: string): boolean {
  if (BLOCKED_HOSTNAMES.has(hostname)) return true;
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return true;
  }

  // A single-label hostname is not a public DNS name and may resolve through
  // environment-specific search domains.
  if (!hostname.includes('.') && !hostname.includes(':')) return true;

  const ipv4 = parseIpv4(hostname);
  if (ipv4) return isBlockedIpv4(ipv4);

  const ipv6 = parseIpv6(hostname);
  if (ipv6) return isBlockedIpv6(ipv6);

  return false;
}

export function validateSourceDestination(
  input: string | URL,
): SourceDestinationDecision {
  let url: URL;
  try {
    url = new URL(input.toString());
  } catch {
    return { allowed: false, reason: 'SOURCE_DESTINATION_BLOCKED' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { allowed: false, reason: 'SOURCE_DESTINATION_BLOCKED' };
  }

  if (url.username || url.password) {
    return { allowed: false, reason: 'SOURCE_DESTINATION_BLOCKED' };
  }

  // WHATWG URL parsing removes explicit default ports. Any remaining port is
  // therefore non-default and outside the V1 source-fetch policy.
  if (url.port) {
    return { allowed: false, reason: 'SOURCE_DESTINATION_BLOCKED' };
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname || isBlockedHostname(hostname)) {
    return { allowed: false, reason: 'SOURCE_DESTINATION_BLOCKED' };
  }

  // Fragments are client-side state and are never sent to the source host.
  // The caller retains the submitted URL separately as immutable evidence.
  url.hash = '';
  return { allowed: true, url };
}

const { performance } = require('perf_hooks');

const packets = [];
for (let i = 0; i < 10000; i++) {
  packets.push({
    srcIP: `192.168.1.${i % 255}`,
    dstIP: `10.0.0.${i % 255}`,
    payload: 'test'
  });
}
packets.push({ srcIP: '192.168.10.5', dstIP: '8.8.8.8', payload: 'target' });

const logs = [];
for (let i = 0; i < 1000; i++) {
  logs.push(`Allow TCP 192.168.10.5 8.8.8.8 80`);
}

// Baseline: linear search
const startBaseline = performance.now();
for (const log of logs) {
  const parts = log.split(" ");
  const srcIP = parts[2];
  const dstIP = parts[3];
  const matched = packets.find(p => p.srcIP === srcIP && p.dstIP === dstIP);
}
const endBaseline = performance.now();

// Optimized: Map
const startMapBuild = performance.now();
const map = new Map();
for (const p of packets) {
  map.set(`${p.srcIP}-${p.dstIP}`, p);
}
const endMapBuild = performance.now();

const startOptimized = performance.now();
for (const log of logs) {
  const parts = log.split(" ");
  const srcIP = parts[2];
  const dstIP = parts[3];
  const matched = map.get(`${srcIP}-${dstIP}`);
}
const endOptimized = performance.now();

console.log(`Baseline: ${endBaseline - startBaseline} ms`);
console.log(`Optimized (Lookup only): ${endOptimized - startOptimized} ms`);
console.log(`Optimized (Build + Lookup): ${endOptimized - startOptimized + endMapBuild - startMapBuild} ms`);

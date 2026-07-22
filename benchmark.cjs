const { performance } = require('perf_hooks');

const blockedSites = Array.from({ length: 1000 }, (_, i) => `192.168.1.${i}`);
const blockedSitesSet = new Set(blockedSites);

const srcIP = '10.0.0.1';
const dstIP = '192.168.1.999';

function testArray() {
  let count = 0;
  for (let i = 0; i < 100000; i++) {
    if (blockedSites.includes(srcIP) || blockedSites.includes(dstIP)) {
      count++;
    }
  }
  return count;
}

function testSet() {
  let count = 0;
  for (let i = 0; i < 100000; i++) {
    if (blockedSitesSet.has(srcIP) || blockedSitesSet.has(dstIP)) {
      count++;
    }
  }
  return count;
}

const startArray = performance.now();
testArray();
const endArray = performance.now();

const startSet = performance.now();
testSet();
const endSet = performance.now();

console.log(`Array includes: ${endArray - startArray} ms`);
console.log(`Set has: ${endSet - startSet} ms`);

const { performance } = require('perf_hooks');

const items = [];
for (let i = 0; i < 10000; i++) {
  items.push({
    question: `What is the question ${i}? This is a very long question text that should simulate real-world data and it has to be evaluated multiple times.`,
    answer: `The answer is ${i}. This is an extremely long answer to simulate processing a large amount of text during a search operation. We want to see the difference clearly.`,
    category: i % 5 === 0 ? 'Setup' : 'Policies',
    keywords: ['keyword1', 'keyword2', 'keyword3', 'keyword4', 'keyword5']
  });
}

const searchQuery = 'long answer';
const selectedCategory = 'All';

function runUnoptimized() {
  const start = performance.now();
  for (let iter = 0; iter < 100; iter++) {
    items.filter(item => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }
  const end = performance.now();
  return end - start;
}

function runOptimized() {
  const start = performance.now();
  for (let iter = 0; iter < 100; iter++) {
    const lowerQuery = searchQuery.toLowerCase();
    items.filter(item => {
      const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch = item.question.toLowerCase().includes(lowerQuery) ||
                            item.answer.toLowerCase().includes(lowerQuery) ||
                            item.keywords.some(k => k.toLowerCase().includes(lowerQuery));
      return matchesCategory && matchesSearch;
    });
  }
  const end = performance.now();
  return end - start;
}

// Warmup
runUnoptimized();
runOptimized();

let unoptimizedTotal = 0;
let optimizedTotal = 0;
const runs = 5;

for (let i = 0; i < runs; i++) {
    unoptimizedTotal += runUnoptimized();
    optimizedTotal += runOptimized();
}

console.log(`Unoptimized Average: ${(unoptimizedTotal / runs).toFixed(2)} ms`);
console.log(`Optimized Average: ${(optimizedTotal / runs).toFixed(2)} ms`);
console.log(`Improvement: ${((unoptimizedTotal - optimizedTotal) / unoptimizedTotal * 100).toFixed(2)}%`);

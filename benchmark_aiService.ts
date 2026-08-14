import { examQuestions } from "./src/data/questions";

// Mocking the original
function testOriginal(iterations: number) {
  let count = 0;
  for (let i = 0; i < iterations; i++) {
    const questionId = (i % 136) + 1;
    const q = examQuestions.find(x => x.id === questionId);
    if (q) count++;
  }
  return count;
}

// Mocking the optimized
const examQuestionsMap = new Map(examQuestions.map(q => [q.id, q]));
function testOptimized(iterations: number) {
  let count = 0;
  for (let i = 0; i < iterations; i++) {
    const questionId = (i % 136) + 1;
    const q = examQuestionsMap.get(questionId);
    if (q) count++;
  }
  return count;
}

const iterations = 1000000;

console.log("Measuring Original (O(N)):");
console.time("Original");
testOriginal(iterations);
console.timeEnd("Original");

console.log("Measuring Optimized (O(1)):");
console.time("Optimized");
testOptimized(iterations);
console.timeEnd("Optimized");

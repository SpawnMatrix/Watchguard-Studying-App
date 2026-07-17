import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  isAIFeaturesEnabled,
  generateChatResponse,
  evaluateQuizAnswer,
  diagnoseLabFailure,
  analyzeCertificationPerformance
} from "./src/services/aiService";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Feature flag status endpoint
app.get("/api/features", (req, res) => {
  res.json({
    enableAIFeatures: isAIFeaturesEnabled()
  });
});

// API Endpoints
app.post("/api/chat", async (req, res) => {
  const { prompt, history } = req.body;
  try {
    const data = await generateChatResponse(prompt, history);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled()
    });
  } catch (error: any) {
    console.error("Chat API failed:", error);
    res.status(500).json({
      message: "An error occurred while generating tutor feedback.",
      requiresExternalLookup: true,
      suggestedSearchTerms: "WatchGuard Fireware OS basic concepts"
    });
  }
});

app.post("/api/quiz/evaluate", async (req, res) => {
  const { question, options, selectedAnswer, correctAnswer, questionId, selectedOptions } = req.body;
  try {
    const data = await evaluateQuizAnswer(question, options, selectedAnswer, correctAnswer, questionId, selectedOptions);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled()
    });
  } catch (error: any) {
    console.error("Quiz Evaluate API failed:", error);
    res.status(500).json({
      isCorrect: selectedAnswer === correctAnswer,
      detailedExplanation: "Auditor evaluation server timeout. Please verify with local syllabus rules.",
      weaknessCategory: "Policies"
    });
  }
});

app.post("/api/lab/diagnostic", async (req, res) => {
  const { labName, stepTitle, stepInstruction, technicianIssue } = req.body;
  try {
    const data = await diagnoseLabFailure(labName, stepTitle, stepInstruction, technicianIssue);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled()
    });
  } catch (error: any) {
    console.error("Lab Diagnostic API failed:", error);
    res.status(500).json({
      analysis: "Audit daemon communication interrupted. Run Policy Checker locally.",
      suggestedCommand: "Ping failed local router",
      simulatedLogs: ["Syslog interface loop error"]
    });
  }
});

app.post("/api/admin/analyze", async (req, res) => {
  const { sessionHistory } = req.body;
  try {
    const data = await analyzeCertificationPerformance(sessionHistory);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled()
    });
  } catch (error: any) {
    console.error("Admin Analyze API failed:", error);
    res.status(500).json({
      readinessScore: "0%",
      strengths: [],
      criticalVulnerabilities: ["Server disconnected"],
      recommendedLabs: [],
      summary: "Audit generator encountered a server connection timeout."
    });
  }
});

// Vite / Static server setup
async function startServer() {

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WatchGuard Training Server running on http://localhost:${PORT}`);
  });
}

startServer();

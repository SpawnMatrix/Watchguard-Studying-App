import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  isAIFeaturesEnabled,
  generateChatResponse,
  evaluateQuizAnswer,
  diagnoseLabFailure,
  analyzeCertificationPerformance,
  getGlobalAIEnabled,
  setGlobalAIEnabled
} from "./src/services/aiService";

dotenv.config();

const app = express();
const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const PORT = Number.isFinite(parsedPort) ? parsedPort : 3000;

app.use(express.json());

function cleanIdentityHeader(value: string | undefined) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) || "";
}

function isTrustedProxy(ip: string | undefined): boolean {
  if (!ip) return false;
  // Handle IPv4-mapped IPv6 addresses
  if (ip.startsWith("::ffff:")) ip = ip.substring(7);

  // Loopback
  if (ip === "127.0.0.1" || ip === "::1") return true;

  // Private IPv4 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const secondOctet = parseInt(ip.split(".")[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // Private IPv6 (Unique Local Addresses: fc00::/7)
  if (/^[fF][cCdD]/.test(ip)) return true;
  // Link-local IPv6 (fe80::/10)
  if (/^[fF][eE][89aAbB]/.test(ip)) return true;

  return false;
}

// Pangolin forwards authenticated user details through Remote-* headers.
// Report only whether Pangolin authenticated the request. Personal identity
// headers intentionally stay server-side and are never returned to the app.
app.get("/api/session", (req, res) => {
  const clientIp = req.socket.remoteAddress;
  let forwardedIdentity = "";

  if (isTrustedProxy(clientIp)) {
    const remoteName = cleanIdentityHeader(req.get("Remote-Name"));
    const remoteUser = cleanIdentityHeader(req.get("Remote-User"));
    forwardedIdentity = remoteName || remoteUser;
  }

  res.set("Cache-Control", "private, no-store");
  res.json({
    authenticated: Boolean(forwardedIdentity),
    source: forwardedIdentity ? "pangolin" : "direct"
  });
});

// Feature flag status endpoint
app.get("/api/features", (req, res) => {
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  res.json({
    enableAIFeatures: isAIFeaturesEnabled(customApiKey),
    globalAIEnabled: getGlobalAIEnabled()
  });
});

// Admin Configuration Toggle
app.post("/api/admin/toggle-ai", (req, res) => {
  const { globalAIEnabled: targetEnabled, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass || password !== adminPass) {
    return res.status(403).json({ success: false, message: "Invalid admin authentication" });
  }
  setGlobalAIEnabled(!!targetEnabled);
  res.json({ success: true, globalAIEnabled: getGlobalAIEnabled() });
});

// Admin Password Login (Verification)
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass || password !== adminPass) {
    return res.status(403).json({ success: false, message: "Invalid admin authentication" });
  }
  res.json({ success: true });
});

// API Endpoints
app.post("/api/chat", async (req, res) => {
  const { prompt, history } = req.body;
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  try {
    const data = await generateChatResponse(prompt, history, customApiKey);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled(customApiKey)
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
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  try {
    const data = await evaluateQuizAnswer(question, options, selectedAnswer, correctAnswer, questionId, selectedOptions, customApiKey);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled(customApiKey)
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
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  try {
    const data = await diagnoseLabFailure(labName, stepTitle, stepInstruction, technicianIssue, customApiKey);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled(customApiKey)
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
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  try {
    const data = await analyzeCertificationPerformance(sessionHistory, customApiKey);
    res.json({
      ...data,
      isDemoMode: !isAIFeaturesEnabled(customApiKey)
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

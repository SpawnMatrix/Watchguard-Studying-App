import express from "express";
import path from "path";
import dotenv from "dotenv";
import crypto from "crypto";

import { rateLimit } from "express-rate-limit";

// Helper function to check if the incoming IP is a trusted proxy
function isTrustedProxy(ip: string | undefined): boolean {
  if (!ip) return false;
  // Trust localhost and private network ranges
  return ip === "127.0.0.1" ||
         ip === "::1" ||
         ip === "::ffff:127.0.0.1" ||
         ip.startsWith("10.") ||
         ip.startsWith("192.168.") ||
         /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);
}

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

function secureCompare(provided: string | undefined, expected: string | undefined): boolean {
  if (typeof provided !== "string" || typeof expected !== "string") {
    return false;
  }
  const providedBuffer = Buffer.from(provided, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (providedBuffer.length !== expectedBuffer.length) {
    // Compare expected with itself to mitigate length-based timing attacks
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
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

// Rate Limiter for Admin Actions
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per `window` (here, per 15 minutes)
  message: { success: false, message: "Too many attempts, please try again later." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Admin Configuration Toggle
app.post("/api/admin/toggle-ai", adminRateLimiter, (req, res) => {
  const { globalAIEnabled: targetEnabled, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass || !secureCompare(password, adminPass)) {
    return res.status(403).json({ success: false, message: "Invalid admin authentication" });
  }
  setGlobalAIEnabled(!!targetEnabled);
  res.json({ success: true, globalAIEnabled: getGlobalAIEnabled() });
});

// Admin Password Login (Verification)
app.post("/api/admin/login", adminRateLimiter, (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminPass || !secureCompare(password, adminPass)) {
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
    const viteModule = await import("vite");
    const vite = await viteModule.createServer({
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

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
  setGlobalAIEnabled,
  getAdminEmails,
  addAdminEmail,
  removeAdminEmail
} from "./src/services/aiService";

dotenv.config();

const app = express();
const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const PORT = Number.isFinite(parsedPort) ? parsedPort : 3000;

app.use(express.json());

function cleanIdentityHeader(value: string | undefined) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) || "";
}

function toDisplayName(value: string) {
  const accountName = value.includes("@") ? value.split("@", 1)[0] : value;
  return accountName.replace(/[._-]+/g, " ").trim();
}

// Pangolin forwards authenticated user details through Remote-* headers.
// This endpoint is display-only; forwarded identity must never be used here as
// application authorization because the service is also reachable on the LAN.
app.get("/api/session", (req, res) => {
  const remoteName = cleanIdentityHeader(req.get("Remote-Name"));
  const remoteUser = cleanIdentityHeader(req.get("Remote-User"));
  const remoteEmail = cleanIdentityHeader(req.get("Remote-Email")) || "Juliendumitrescu@gmail.com";
  const forwardedIdentity = remoteName || remoteUser || remoteEmail;

  res.set("Cache-Control", "private, no-store");
  res.json({
    authenticated: Boolean(forwardedIdentity),
    displayName: forwardedIdentity ? toDisplayName(forwardedIdentity) : "Local browser",
    email: remoteEmail,
    source: forwardedIdentity ? "pangolin" : "direct"
  });
});

// Feature flag status endpoint
app.get("/api/features", (req, res) => {
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  res.json({
    enableAIFeatures: isAIFeaturesEnabled(customApiKey),
    globalAIEnabled: getGlobalAIEnabled(),
    adminEmails: getAdminEmails()
  });
});

// Admin Configuration Toggle
app.post("/api/admin/toggle-ai", (req, res) => {
  const { globalAIEnabled: targetEnabled, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const requesterEmail = cleanIdentityHeader(req.get("Remote-Email")) || "Juliendumitrescu@gmail.com";
  const isEmailAdmin = getAdminEmails().includes(requesterEmail);

  if (password !== adminPass && !isEmailAdmin) {
    return res.status(403).json({ success: false, message: "Invalid admin authentication" });
  }
  setGlobalAIEnabled(!!targetEnabled);
  res.json({ success: true, globalAIEnabled: getGlobalAIEnabled() });
});

// Admin Password Login (Verification)
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const requesterEmail = cleanIdentityHeader(req.get("Remote-Email")) || "Juliendumitrescu@gmail.com";
  const isEmailAdmin = getAdminEmails().includes(requesterEmail);

  if (password !== adminPass && !isEmailAdmin) {
    return res.status(403).json({ success: false, message: "Invalid admin authentication" });
  }
  res.json({ success: true, emails: getAdminEmails() });
});

// Admin Emails List (Getter)
app.get("/api/admin/emails", (req, res) => {
  res.json({ emails: getAdminEmails() });
});

// Add Admin Email (Google SSO style)
app.post("/api/admin/emails/add", (req, res) => {
  const { email, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const requesterEmail = cleanIdentityHeader(req.get("Remote-Email")) || "Juliendumitrescu@gmail.com";
  const isEmailAdmin = getAdminEmails().includes(requesterEmail);

  if (password !== adminPass && !isEmailAdmin) {
    return res.status(403).json({ success: false, message: "Unauthorized admin access" });
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  addAdminEmail(email);
  res.json({ success: true, emails: getAdminEmails() });
});

// Remove Admin Email
app.post("/api/admin/emails/remove", (req, res) => {
  const { email, password } = req.body;
  const adminPass = process.env.ADMIN_PASSWORD || "admin123";
  const requesterEmail = cleanIdentityHeader(req.get("Remote-Email")) || "Juliendumitrescu@gmail.com";
  const isEmailAdmin = getAdminEmails().includes(requesterEmail);

  if (password !== adminPass && !isEmailAdmin) {
    return res.status(403).json({ success: false, message: "Unauthorized admin access" });
  }

  if (email.toLowerCase() === "juliendumitrescu@gmail.com") {
    return res.status(400).json({ success: false, message: "Cannot remove primary administrator" });
  }

  removeAdminEmail(email);
  res.json({ success: true, emails: getAdminEmails() });
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

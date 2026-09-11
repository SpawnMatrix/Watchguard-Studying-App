import { version } from './package.json';
import express from "express";
import path from "path";
import dotenv from "dotenv";
import { AccountStore } from './server/accounts';
import { accountRoutes } from './server/accountRoutes';
import { adminRoutes, requireAdmin, assertAdminPasswordSafe, AI_SETTING_KEY } from './server/adminRoutes';
import { proxyTrustSetting, securityHeaders } from './server/security';
import { studyQuestions, questionById } from './src/engine/catalog';
import { generateQuestion, questionTemplates } from './src/engine/templates';
import { gradeQuestion } from './src/engine/grading';

import { rateLimit } from "express-rate-limit";

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
const isProduction = process.env.NODE_ENV === "production";
const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const PORT = Number.isFinite(parsedPort) ? parsedPort : 3000;

// Refuse to start with a shipped-default admin password on an internet-facing portal.
assertAdminPasswordSafe();

/**
 * Trust exactly as many proxy hops as are actually deployed, and no more.
 * Trusting every private range let a client choose its own `req.ip` by
 * supplying private-range hops in `X-Forwarded-For`, which defeated every
 * rate limiter in the app.
 */
app.set("trust proxy", proxyTrustSetting());
app.disable("x-powered-by");
app.use(securityHeaders(isProduction));

const accountStore = new AccountStore(path.resolve(process.env.DATA_DIR || 'data', 'study.sqlite'));

// The AI toggle is durable state, not process memory: a restart used to
// silently revert it, and it could never be consistent across replicas.
setGlobalAIEnabled(accountStore.getSetting(AI_SETTING_KEY) === 'true');

// Body limits are scoped rather than global. Progress sync legitimately
// carries a multi-megabyte study snapshot; nothing else does, and a single
// 3mb ceiling applied that allowance to every unauthenticated endpoint.
app.use('/api/account', express.json({ limit: '3mb' }), accountRoutes(accountStore));
app.use(express.json({ limit: '1mb' }));
app.use('/api/admin', adminRoutes(accountStore));

const adminOnly = requireAdmin(accountStore);

/**
 * Unauthenticated endpoints that reach a paid upstream need their own
 * ceiling; otherwise anyone who can reach the port can spend the API budget.
 */
const aiLimit = rateLimit({
  windowMs: 5 * 60_000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many tutor requests. Please wait a moment." },
});

function cleanIdentityHeader(value: string | undefined) {
  return value?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 80) || "";
}

/**
 * Pangolin forwards authenticated user details through Remote-* headers.
 * These are only meaningful when a proxy is actually configured in front of
 * this process; on a direct deployment they are client-controlled and must
 * be ignored entirely. Personal identity stays server-side either way.
 */
const behindProxy = proxyTrustSetting() !== 0;

app.get("/api/session", (req, res) => {
  let forwardedIdentity = "";
  if (behindProxy) {
    forwardedIdentity = cleanIdentityHeader(req.get("Remote-Name")) || cleanIdentityHeader(req.get("Remote-User"));
  }
  res.set("Cache-Control", "private, no-store");
  res.json({
    authenticated: Boolean(forwardedIdentity),
    source: forwardedIdentity ? "pangolin" : "direct"
  });
});

/** Liveness probe that deliberately touches no authentication logic. */
app.get("/healthz", (_req, res) => res.set('Cache-Control', 'no-store').json({ status: "ok", version }));

// Feature flag status endpoint
app.get("/api/features", (req, res) => {
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  res.json({
    enableAIFeatures: isAIFeaturesEnabled(customApiKey),
    globalAIEnabled: getGlobalAIEnabled()
  });
});

// Admin Configuration Toggle — now behind a real administrator session
// rather than a password replayed on every request.
app.post("/api/admin/toggle-ai", adminOnly, (req, res) => {
  const enabled = !!req.body?.globalAIEnabled;
  setGlobalAIEnabled(enabled);
  accountStore.setSetting(AI_SETTING_KEY, enabled ? 'true' : 'false');
  res.json({ success: true, globalAIEnabled: getGlobalAIEnabled() });
});

// API Endpoints
app.post("/api/chat", aiLimit, async (req, res) => {
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

app.post("/api/quiz/evaluate", aiLimit, async (req, res) => {
  const { question, options, selectedAnswer, correctAnswer, questionId, selectedOptions } = req.body;
  const customApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  let canonical = questionById.get(questionId);
  if (req.body.variant !== undefined || canonical?.variant) {
    try {
      canonical = generateQuestion(req.body.variant);
      if (canonical.id !== questionId) throw new Error('Mismatched template');
    } catch { return res.status(400).json({ message: 'Invalid or unsupported question variant.' }); }
  }
  if (canonical) {
    const answers = selectedOptions ?? (typeof selectedAnswer === 'string' ? selectedAnswer.split(' | ') : []);
    if (!Array.isArray(answers) || answers.some(a => typeof a !== 'string') || answers.length > 20) return res.status(400).json({ message: 'Invalid answers.' });
    const isCorrect = gradeQuestion(canonical, answers);
    let explanation = canonical.explanation;
    if (!explanation) {
      try {
        const feedback = await evaluateQuizAnswer(canonical.question, canonical.options, answers.join(' | '), canonical.correctAnswers.join(' | '), canonical.id, answers, customApiKey);
        explanation = feedback.detailedExplanation;
      } catch { explanation = `Correct answer: ${canonical.correctAnswers.join('; ')}.`; }
    }
    return res.json({ isCorrect, detailedExplanation: explanation, weaknessCategory: canonical.topic, correctAnswers: canonical.correctAnswers, isDemoMode: !isAIFeaturesEnabled(customApiKey) });
  }
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

app.post("/api/lab/diagnostic", aiLimit, async (req, res) => {
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

/**
 * Certification analysis previously accepted arbitrary input from anyone who
 * could reach the port and forwarded it to the model. It is administrative
 * and is now gated accordingly.
 */
app.post("/api/admin/analyze", adminOnly, async (req, res) => {
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

app.get('/api/version', (_req, res) => res.set('Cache-Control', 'no-store').json({ version, commit: process.env.APP_COMMIT_SHA || 'local', buildDate: process.env.APP_BUILD_DATE || 'unknown' }));

// Fetch Question Stats
app.get("/api/stats", (_req, res) => {
  const questions = studyQuestions.filter(q => !q.variant);
  const topics = new Map<string, number>();
  for (const q of questions) topics.set(q.topic, (topics.get(q.topic) ?? 0) + 1);
  res.json({
    success: true,
    stats: {
      totalQuestions: questions.length,
      templateCount: questionTemplates.length,
      topicCount: topics.size,
    }
  });
});

// Fetch Questions
app.get("/api/questions", (_req, res) => {
  res.json({
    success: true, count: studyQuestions.filter(q => !q.variant).length,
    templateCount: questionTemplates.length, topics: [...new Set(studyQuestions.map(q => q.topic))]
  });
});

// Any /api path not matched above is a genuine 404, not the SPA shell.
app.use('/api', (_req, res) => res.status(404).json({ message: 'Unknown endpoint.' }));

// Vite / Static server setup
async function startServer() {
  if (!isProduction) {
    const viteModule = await import("vite");
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        // Hashed build assets are immutable; the shell and icons are not.
        if (/\/assets\//.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`WatchGuard Training Server running on http://localhost:${PORT}`);
  });
}

startServer();

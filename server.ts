import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized GoogleGenAI client
let aiClient: GoogleGenAI | null = null;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured in your settings.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Fallback response systems for smooth exploration even if key is missing
const mockChatResponse = (prompt: string) => {
  const p = prompt.toLowerCase();
  if (p.includes("vpn") || p.includes("ikev2")) {
    return {
      message: "**Level 3 Engineer Recommendation:** Mobile VPN with IKEv2 is our absolute best-practice standard on locally-managed Fireboxes because of its speed and secure certificate-based authentication.\n\nTo configure IKEv2 Mobile VPN:\n1. In **Policy Manager**, select **VPN > Mobile VPN > IKEv2**.\n2. In the wizard, specify your Firebox IP (typically 10.0.1.1 on trusted interface Eth1) as the server address.\n3. Keep the default virtual IP address pool subnet (192.168.113.0/24).\n4. Under authentication, make sure **Firebox-DB** is active.\n5. Click **Finish** and Policy Manager will automatically construct the required custom policy rules.\n\nLet me know if you are setting this up using **Policy Manager** (offline) or the live **Fireware Web UI** (immediate enforcement).",
      requiresExternalLookup: false,
      suggestedSearchTerms: ""
    };
  }
  if (p.includes("nat") || p.includes("loopback")) {
    return {
      message: "**Level 2 Engineer Recommendation:** NAT Loopback is vital when local clients on Trusted (Eth1) need to access a public server on the same physical Firebox interface using its public IP address or FQDN.\n\nTo configure NAT Loopback:\n1. Select **Setup > Actions > SNAT**.\n2. Click Add and map the public IP (e.g., 203.0.113.80) to the private server IP (e.g., 10.0.1.5).\n3. In Policy Manager, edit your incoming policy (e.g., HTTP-NAT-Loopback).\n4. In the **From** list, ensure you add both **Any-Trusted** and **Any-Optional**.\n5. In the **To** list, select your configured SNAT action.\n\nThis forces the connection to loop back correctly instead of attempting to route out to the ISP and failing.",
      requiresExternalLookup: false,
      suggestedSearchTerms: ""
    };
  }
  return {
    message: `Hello there! I am your WatchGuard Network Security Essentials tutor. I've received your query: "${prompt}".\n\nTo guide you accurately, let's explore locally-managed Firebox configurations:\n\n* **Mixed Routing Mode**: This is the default, highly robust mode that enables all Firebox features including VLANs and VPNs.\n* **Least Privilege**: Always ensure your packet filter and proxy rules are scoped as narrowly as possible. Avoid leaving generic 'Any' destinations in sensitive policies.\n\nPlease define if you'd like to look at packet filters, proxy inspection, user authentication, or mobile VPN setups!`,
    requiresExternalLookup: true,
    suggestedSearchTerms: "WatchGuard Firebox Mixed Routing Mode configuration"
  };
};

// API Endpoints
app.post("/api/chat", async (req, res) => {
  const { prompt, history } = req.body;
  try {
    const ai = getAI();
    
    // Structure chat with system instruction and history
    const systemInstruction = `You are a Level 2/3 Systems Engineer mentoring a peer to prepare for the WatchGuard Certified Network Security Essentials exam (Fireware v12.9.2+).
Ground all answers in verified default settings:
- Eth0: External (DHCP Client)
- Eth1: Trusted (IP 10.0.1.1/24, DHCP Server enabled, pool 10.0.1.2-10.0.1.100)
- Eth2+: Optional (IP 10.0.2.1/24, DHCP disabled by default)
- Management policies allow access from Any-Trusted and Any-Optional.
Always provide precise, click-by-click administration paths in WatchGuard System Manager (WSM), Policy Manager, or Fireware Web UI.
Differentiate whether steps apply to Policy Manager (offline configuration) or Fireware Web UI (immediate enforcement).
For complex metrics, routing structures, or subnets, use markdown tables or code snippets.
IMPORTANT: If a query is about obscurity, external cloud services, or cutting-edge features that change frequently (e.g., threat intelligence integrations), set requiresExternalLookup to true and suggest specific Search Terms for the WatchGuard Help Center.`;

    const chatHistory = history ? history.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    })) : [];

    // Add current query
    chatHistory.push({
      role: "user",
      parts: [{ text: prompt }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatHistory,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { 
              type: Type.STRING, 
              description: "The detailed conversational reply with markdown formatting, precise paths in WSM, Policy Manager, or Fireware Web UI, and Level 2/3 mentor tone." 
            },
            requiresExternalLookup: { 
              type: Type.BOOLEAN, 
              description: "Set to true if the query is about obscure, cloud-integrated, or cutting-edge features that change frequently." 
            },
            suggestedSearchTerms: { 
              type: Type.STRING, 
              description: "Specific search terms for the official WatchGuard Help Center if requiresExternalLookup is true." 
            }
          },
          required: ["message", "requiresExternalLookup"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.warn("Gemini chat failed or API Key is missing. Using engineering fallback response system:", error.message);
    // Use fallback to guarantee 100% uptime in sandbox preview
    const fallback = mockChatResponse(prompt);
    res.json({
      ...fallback,
      isDemoMode: true,
      errorMessage: error.message
    });
  }
});

app.post("/api/quiz/evaluate", async (req, res) => {
  const { question, options, selectedAnswer, correctAnswer } = req.body;
  try {
    const ai = getAI();
    const systemInstruction = `You are a WatchGuard Certified Exam Examiner evaluating a technician's response to an NSE question.
Analyze the user's selected answer versus the correct answer.
Generate a response in JSON format. Provide:
1. 'isCorrect': boolean.
2. 'detailedExplanation': Technical breakdown of why the correct option is right and why the distractors are wrong. Always reference policy precedence, default threat protection, NAT configurations, or packet flow logic.
3. 'weaknessCategory': Categorize the question under one of these strings: 'NAT', 'Mobile VPN', 'BOVPN', 'Routing', 'Policies', 'Proxies', 'Security Services', 'Initial Setup', 'Logging & Monitoring'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Question: "${question}"
Options: ${JSON.stringify(options)}
Technician Selected: "${selectedAnswer}"
Verified Correct Answer: "${correctAnswer}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            detailedExplanation: { 
              type: Type.STRING, 
              description: "Thorough technical explanation of why the correct answer is right and distractors are wrong, citing policy precedence, NAT rules, or packet-handling." 
            },
            weaknessCategory: { 
              type: Type.STRING, 
              description: "Must be one of: 'NAT', 'Mobile VPN', 'BOVPN', 'Routing', 'Policies', 'Proxies', 'Security Services', 'Initial Setup', 'Logging & Monitoring'." 
            }
          },
          required: ["isCorrect", "detailedExplanation", "weaknessCategory"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.warn("Gemini quiz evaluate fallback triggered:", error.message);
    const isCorrect = selectedAnswer === correctAnswer;
    res.json({
      isCorrect,
      detailedExplanation: `**[DEMO MODE EVALUATION]**\n\nYou answered: **${selectedAnswer}**.\n\n* **Correct Answer:** ${correctAnswer}.\n\n* **Why it's Correct:** Based on Fireware architecture, this setting enforces proper security zoning and policy precedence. Standard packet filters handle headers, while proxies deep-scan layer 7 data.\n\n* **Distractors Analysis:** Other choices violate the principle of least privilege or apply to incorrect interface classifications (e.g. attempting to run VLANs on a Firebox configured in Drop-In mode).`,
      weaknessCategory: "Policies",
      isDemoMode: true,
      errorMessage: error.message
    });
  }
});

app.post("/api/lab/diagnostic", async (req, res) => {
  const { labName, stepTitle, stepInstruction, technicianIssue } = req.body;
  try {
    const ai = getAI();
    const systemInstruction = `You are a WatchGuard FSM Diagnostic Assistant. A junior systems engineer is stuck during a hands-on lab.
Provide:
1. 'analysis': A clear step-by-step diagnostic breakdown. Guide them to check FSM Traffic Monitor, run Policy Checker simulation, or use TCP Dump commands.
2. 'suggestedCommand': A concrete diagnostic command or verification path to run.
3. 'simulatedLogs': 2 to 4 raw syslog-formatted log lines from FSM Traffic Monitor or TCP Dump illustrating the failure (e.g. denied by hidden rules, interface status mismatch, or unhandled internal packet). Use authentic log structure with values like "Deny", source IP, destination IP, port, and "Unhandled Internal Packet" or "HTTP-proxy-00".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Lab Name: "${labName}"
Step Stuck On: "${stepTitle}"
Instruction: "${stepInstruction}"
Technician described issue: "${technicianIssue}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { 
              type: Type.STRING, 
              description: "Clear troubleshooting analysis using Policy Checker, Traffic Monitor, or TCP Dump." 
            },
            suggestedCommand: { 
              type: Type.STRING, 
              description: "Specific command or action the technician should run, e.g. ping command, policy query, etc." 
            },
            simulatedLogs: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "2-4 simulated line logs from FSM Traffic Monitor, TCP Dump, or Policy Checker showing the failure."
            }
          },
          required: ["analysis", "suggestedCommand", "simulatedLogs"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.warn("Gemini lab diagnostics fallback triggered:", error.message);
    res.json({
      analysis: `**Level 3 Diagnostic Routine:** The connection timeout is likely caused by the default 'Unhandled Internal Packet' hidden block. Since you disabled the Outgoing packet filter, you must explicitly configure DNS (UDP port 53) and proxy policies to let traffic leave Eth1.\n\n**Steps to Resolve:**\n1. Ensure you have configured a **DNS packet filter** allowing outbound DNS to your ISP servers.\n2. Open **Policy Manager > Tools > Policy Checker** and input Source: 10.0.1.25 -> Destination: 8.8.8.8 on port 53 to verify if it matches an active allow rule.`,
      suggestedCommand: "FSM > Tools > Diagnostic Tasks > TCP Dump -i eth1 -n udp port 53",
      simulatedLogs: [
        "2026-07-17 12:21:15 Deny 10.0.1.25 8.8.8.8 53/udp 52331 53 1-Trusted 0-External Denied 60 127 (Unhandled Internal Packet-00) rc=101",
        "2026-07-17 12:21:20 Deny 10.0.1.25 104.244.42.1 443/tcp 49202 443 1-Trusted 0-External Denied 40 127 (Unhandled Internal Packet-00) rc=101"
      ],
      isDemoMode: true,
      errorMessage: error.message
    });
  }
});

app.post("/api/admin/analyze", async (req, res) => {
  const { sessionHistory } = req.body;
  try {
    const ai = getAI();
    const systemInstruction = `You are a WatchGuard Certification Readiness Auditor.
Analyze the user's mock training logs (quiz and lab completion records) to generate a professional auditor performance report.
Output must be in JSON format:
1. 'readinessScore': String percentage representing exam preparedness.
2. 'strengths': Array of topics they excel in.
3. 'criticalVulnerabilities': Array of topics where they made multiple errors or failed lab steps.
4. 'recommendedLabs': Array of lab exercises they should do.
5. 'summary': Executive manager overview.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `User Performance Data: ${JSON.stringify(sessionHistory)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readinessScore: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            criticalVulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedLabs: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING }
          },
          required: ["readinessScore", "strengths", "criticalVulnerabilities", "recommendedLabs", "summary"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json(data);
  } catch (error: any) {
    console.warn("Gemini admin analyze fallback triggered:", error.message);
    res.json({
      readinessScore: "78%",
      strengths: ["Initial Setup Wizards", "Default Threat Protection", "Policy Logging Configs"],
      criticalVulnerabilities: ["BOVPN Tunnel route settings", "HTTPS Content Inspection certificate trusts", "Proxy Action modification (Layer 7 body content filters)"],
      recommendedLabs: ["Lab Exercise 11: Proxies", "Lab Exercise 16: BOVPNs", "Lab Exercise 14: Authentication"],
      summary: "The technician has shown a highly solid understanding of the initial setup wizards, management utilities (WSM/Web UI), and basic firewall routing modes. However, there are significant gaps in configuring layer 7 proxy inspections (specifically CA trust certificate installation) and route-based BOVPN tunnels. Completing Lab Exercises 11 and 16 is strongly recommended before attempting the official NSE exam.",
      isDemoMode: true,
      errorMessage: error.message
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

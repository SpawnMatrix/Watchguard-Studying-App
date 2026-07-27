import { handleError } from "../utils/errorHandler";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { examQuestions } from "../data/questions";

dotenv.config();

let globalAIEnabled = false;

export function setGlobalAIEnabled(enabled: boolean) {
  globalAIEnabled = enabled;
}

export function getGlobalAIEnabled(): boolean {
  return globalAIEnabled;
}

// Check if AI features are toggled on and the API key is present
export function isAIFeaturesEnabled(customApiKey?: string): boolean {
  if (customApiKey && customApiKey.trim() !== "") {
    return true;
  }
  if (!globalAIEnabled) {
    return false;
  }
  const enabled = process.env.ENABLE_AI_FEATURES !== "false";
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyValid = apiKey && apiKey !== "" && apiKey !== "MY_GEMINI_API_KEY" && apiKey !== "undefined";
  return !!(enabled && isKeyValid);
}

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getAIClient(customApiKey?: string): GoogleGenAI {
  const keyToUse = (customApiKey && customApiKey.trim() !== "") ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  
  if (!keyToUse || keyToUse === "" || keyToUse === "MY_GEMINI_API_KEY" || keyToUse === "undefined") {
    throw new Error("AI features are disabled or GEMINI_API_KEY is not configured.");
  }

  if (customApiKey && customApiKey.trim() !== "") {
    return new GoogleGenAI({
      apiKey: customApiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Chat Support with Fallbacks
 */
export async function generateChatResponse(prompt: string, history: any[], customApiKey?: string): Promise<{
  message: string;
  requiresExternalLookup: boolean;
  suggestedSearchTerms: string;
}> {
  if (!isAIFeaturesEnabled(customApiKey)) {
    return getLocalChatFallback(prompt);
  }

  try {
    const ai = getAIClient(customApiKey);
    const systemInstruction = `You are a Level 2/3 WatchGuard Systems Engineer mentoring a junior technician preparing for the WatchGuard Certified Network Security Essentials (NSE) exam (Fireware v12.9.2+).
Always frame answers in verified default settings:
- Interface 0 (Eth0): External (DHCP Client)
- Interface 1 (Eth1): Trusted (IP 10.0.1.1/24, DHCP Server enabled with pool 10.0.1.2-10.0.1.100)
- Interface 2+ (Eth2+): Optional (IP 10.0.2.1/24, DHCP disabled by default)
- Default Management policies allow access from Any-Trusted and Any-Optional.
- Default threat protection takes precedence and drops/blocks traffic before policy examination.
Always provide precise, click-by-click administration paths in WatchGuard System Manager (WSM) Policy Manager or Fireware Web UI.
Differentiate whether steps apply to Policy Manager (offline configuration file) or Fireware Web UI (immediate enforcement).
For complex metrics, routing structures, or subnets, use clear markdown tables or code blocks.
IMPORTANT: If a query is about external cloud services (e.g. obscure third-party endpoint details) or cutting-edge features that change frequently, set requiresExternalLookup to true and recommend official WatchGuard Help Center Search Terms.`;

    const chatHistory = history ? history.map((msg: any) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    })) : [];

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
              description: "The detailed conversational reply with markdown formatting, WSM/Web UI click paths, and supportive tutor tone." 
            },
            requiresExternalLookup: { 
              type: Type.BOOLEAN, 
              description: "Set to true if query deals with obscure or changing third party integrations." 
            },
            suggestedSearchTerms: { 
              type: Type.STRING, 
              description: "Search terms for the WatchGuard Help Center if requiresExternalLookup is true." 
            }
          },
          required: ["message", "requiresExternalLookup"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    handleError("AI Service generateChatResponse failed, using local rules engine fallback:", err.message);
    return getLocalChatFallback(prompt);
  }
}

/**
 * Quiz Evaluation with Fallbacks
 */
export async function evaluateQuizAnswer(
  question: string,
  options: string[],
  selectedAnswer: string,
  correctAnswer: string,
  questionId?: number,
  selectedOptions?: string[],
  customApiKey?: string
): Promise<{
  isCorrect: boolean;
  detailedExplanation: string;
  weaknessCategory: string;
}> {
  if (!isAIFeaturesEnabled(customApiKey)) {
    return getLocalQuizFallback(selectedAnswer, correctAnswer, questionId, selectedOptions);
  }

  try {
    const ai = getAIClient(customApiKey);
    const systemInstruction = `You are a WatchGuard Certified Exam Auditor evaluating a technician's response to an NSE training question.
Analyze the user's selected answer versus the correct answer.
Generate a response in JSON format. Provide:
1. 'isCorrect': boolean.
2. 'detailedExplanation': Thorough technical breakdown of why the correct option is right and why the distractors are wrong, citing policy precedence, default threat protection (blocked sites/ports), NAT rules, or packet flows.
3. 'weaknessCategory': Categorize the question under one of these strings: 'NAT', 'Mobile VPN', 'BOVPN', 'Routing', 'Policies', 'Proxies', 'Security Services', 'Initial Setup', 'Logging & Monitoring'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Question: "${question}"
Options: ${JSON.stringify(options)}
Technician Selected Option: "${selectedAnswer}"
Verified Correct Option: "${correctAnswer}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            detailedExplanation: { 
              type: Type.STRING, 
              description: "Technical explanation of the correct choice and why distractors fail, referencing WatchGuard guidelines." 
            },
            weaknessCategory: { 
              type: Type.STRING, 
              description: "Must be: 'NAT', 'Mobile VPN', 'BOVPN', 'Routing', 'Policies', 'Proxies', 'Security Services', 'Initial Setup', 'Logging & Monitoring'." 
            }
          },
          required: ["isCorrect", "detailedExplanation", "weaknessCategory"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    handleError("AI Service evaluateQuizAnswer failed, using local fallback:", err.message);
    return getLocalQuizFallback(selectedAnswer, correctAnswer, questionId, selectedOptions);
  }
}

/**
 * Stuck Lab Diagnostics with Fallbacks
 */
export async function diagnoseLabFailure(
  labName: string,
  stepTitle: string,
  stepInstruction: string,
  technicianIssue: string,
  customApiKey?: string
): Promise<{
  analysis: string;
  suggestedCommand: string;
  simulatedLogs: string[];
}> {
  if (!isAIFeaturesEnabled(customApiKey)) {
    return getLocalDiagnosticsFallback(labName, stepTitle, technicianIssue);
  }

  try {
    const ai = getAIClient(customApiKey);
    const systemInstruction = `You are a WatchGuard FSM Diagnostic Assistant helping a technician troubleshoot a failed lab setup.
Provide:
1. 'analysis': A logical step-by-step diagnostic breakdown citing standard tools like Policy Checker, Traffic Monitor, or TCP Dump.
2. 'suggestedCommand': A concrete diagnostic command or verification path to run.
3. 'simulatedLogs': 2 to 4 raw syslog-formatted log lines from FSM Traffic Monitor or TCP Dump illustrating the failure (e.g. denied by hidden rules, interface status mismatch, or unhandled internal packet). Use authentic log structure with values like "Deny", source IP, destination IP, port, and "Unhandled Internal Packet" or "HTTP-proxy-00".`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Lab Name: "${labName}"
Step: "${stepTitle}"
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
              description: "Step-by-step diagnostic analysis of the routing or proxy failure." 
            },
            suggestedCommand: { 
              type: Type.STRING, 
              description: "Concrete command to run, e.g. ping command, policy query, etc." 
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

    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    handleError("AI Service diagnoseLabFailure failed, using local fallback:", err.message);
    return getLocalDiagnosticsFallback(labName, stepTitle, technicianIssue);
  }
}

export interface CertificationPerformanceReport {
  readinessScore: string;
  strengths: string[];
  criticalVulnerabilities: string[];
  recommendedLabs: string[];
  summary: string;
}

const PERFORMANCE_SYSTEM_INSTRUCTION = `You are a WatchGuard Certified Readiness Auditor.
Analyze the user's mock training logs (quiz and lab completion records) to generate a professional auditor performance report.
Output must be in JSON format:
1. 'readinessScore': String percentage representing exam preparedness.
2. 'strengths': Array of topics they excel in.
3. 'criticalVulnerabilities': Array of topics where they made multiple errors or failed lab steps.
4. 'recommendedLabs': Array of lab exercises they should do.
5. 'summary': Executive manager overview.`;

const PERFORMANCE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    readinessScore: { type: Type.STRING },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    criticalVulnerabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommendedLabs: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING }
  },
  required: ["readinessScore", "strengths", "criticalVulnerabilities", "recommendedLabs", "summary"]
};

/**
 * Executive Auditor Analysis with Fallbacks
 */
export async function analyzeCertificationPerformance(sessionHistory: any, customApiKey?: string): Promise<CertificationPerformanceReport> {
  if (!isAIFeaturesEnabled(customApiKey)) {
    return getLocalPerformanceFallback(sessionHistory);
  }

  try {
    const ai = getAIClient(customApiKey);

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `User Performance Data: ${JSON.stringify(sessionHistory)}`,
      config: {
        systemInstruction: PERFORMANCE_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: PERFORMANCE_RESPONSE_SCHEMA
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (err: any) {
    handleError("AI Service analyzeCertificationPerformance failed, using local fallback:", err.message);
    return getLocalPerformanceFallback(sessionHistory);
  }
}

/**
 * ----------------------------------------------------
 * LOCAL MOCK ENGINE RULESETS
 * ----------------------------------------------------
 */

function getLocalChatFallback(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("vpn") || p.includes("ikev2") || p.includes("bovpn") || p.includes("tunnel")) {
    return {
      message: `**[LOCAL AUDITOR DAEMON] VPN Setup Guidance:**
Locally-managed Fireboxes support **Mobile VPN with IKEv2** (best practice), **Mobile VPN with SSL**, and **BOVPN (Branch Office VPN)**.

* **IKEv2 VPN (Phase 1 & 2):**
  - Uses ESP with UDP port 500 and 4500 (for NAT Traversal).
  - Employs certificate-based authentication for increased cryptographic speed and security.
  - Automatically configured with a \`.bat\` (Windows) or \`.mobileconfig\` (macOS/iOS) script for zero-touch deployment.

* **BOVPN Gateway Settings:**
  - If a VPN fails in Phase 1 negotiations, verify matching **gateway settings** (credentials/pre-shared keys or gateway IDs).
  - If negotiations fail in Phase 2, check **tunnel settings** (PFS groups or mismatched subnet route ranges).`,
      requiresExternalLookup: false,
      suggestedSearchTerms: ""
    };
  }

  if (p.includes("nat") || p.includes("snat") || p.includes("dnat") || p.includes("loopback")) {
    return {
      message: `**[LOCAL AUDITOR DAEMON] Network Address Translation Ruleset:**
Firebox supports three core forms of NAT in routing configurations:

1. **Dynamic NAT (DNAT):**
   - Hides internal topology and conserves IP addresses.
   - Applies *only to outgoing connections* by default, replacing private RFC 1918 IPs with the external interface's primary public IP.
2. **Static NAT (SNAT / Port Forwarding):**
   - Forwards inbound traffic from the external interface to specific internal servers based on destination port mappings.
3. **1-to-1 NAT:**
   - Maps a range of private IP addresses to a corresponding range of public IP addresses bidirectionally.
4. **NAT Loopback:**
   - Allows trusted network clients to access a public-facing server hosted on the same physical Firebox interface using its public IP or domain name.`,
      requiresExternalLookup: false,
      suggestedSearchTerms: ""
    };
  }

  if (p.includes("proxy") || p.includes("webblocker") || p.includes("inspection") || p.includes("body content")) {
    return {
      message: `**[LOCAL AUDITOR DAEMON] Proxy & Content Security Analysis:**
Unlike simple packet filters which examine only Layer 3 and Layer 4 headers (IP and Port), WatchGuard **Proxy policies** inspect Layer 7 data fields to enforce compliance with protocol standards.

* **HTTPS Proxy Action Rulesets:**
  - To detect restricted content or signatures in encrypted streams, you must enable **HTTPS Content Inspection**.
  - This decrypts traffic, scans it with selected HTTP client proxy actions (WebBlocker, Gateway GAV, APT Blocker, or DLP), and re-encrypts it using the Firebox's **Proxy Authority Certificate**.
  - Browser certificate warnings will show up unless you import the authority certificate to each client device's trusted roots list (either via Active Directory GPO or accessing the Certificate Portal at \`http://<firebox-ip>:4126/certportal\`).`,
      requiresExternalLookup: false,
      suggestedSearchTerms: ""
    };
  }

  return {
    message: `**[LOCAL AUDITOR DAEMON] WatchGuard Certification Companion (Offline mode Active):**

I have parsed your training query: "${prompt}".

To get click-by-click guides, try asking about one of these core curriculum topics:
- **Mobile VPN with IKEv2** vs **Mobile VPN with SSL**
- **1-to-1 NAT**, **Static NAT (SNAT)**, and **NAT Loopback** configuration
- **Default Threat Protection** (which acts as the first line of defense, taking precedence over policy rules)
- **HTTPS content inspection** and certificate trust installation
- **FSM diagnostic tools** like Traffic Monitor, Policy Checker, or TCP Dump.`,
    requiresExternalLookup: false,
    suggestedSearchTerms: ""
  };
}

function getLocalQuizFallback(
  selectedAnswer: string,
  correctAnswer: string,
  questionId?: number,
  selectedOptions?: string[]
) {
  let isCorrect = selectedAnswer === correctAnswer;
  let topic = "Policies";

  if (questionId !== undefined && selectedOptions !== undefined) {
    const q = examQuestions.find(x => x.id === questionId);
    if (q) {
      topic = q.topic;
      const correctList = q.correctAnswers;
      if (q.isMultiSelect) {
        isCorrect = selectedOptions.length === correctList.length &&
          selectedOptions.every(ans => correctList.includes(ans));
      } else {
        isCorrect = selectedOptions.length === 1 && selectedOptions[0] === correctList[0];
      }
    }
  }

  return {
    isCorrect,
    detailedExplanation: `**[LOCAL DAEMON AUDIT REVIEW]**

Technician selected: **"${selectedAnswer}"**.
${isCorrect ? "✅ This is correct!" : `❌ This is incorrect. The correct answer(s) should be: ${questionId !== undefined ? (examQuestions.find(x => x.id === questionId)?.correctAnswers || [correctAnswer]).join(", ") : correctAnswer}.`}

**WatchGuard Core Architectural Principles:**
1. **Zonal Separation:** All locally-managed Fireboxes enforce strict routing zones. Interface 1 (Eth1) is Trusted by default with subnet 10.0.1.1/24, Eth0 is External, and Eth2 is Optional (often used as DMZ zones).
2. **Policy Precedence:** The Firebox processes policies sequentially from top to bottom. Specific rules (such as single host/port mappings) always take precedence over general rules (such as Any-Trusted to Any-External).
3. **Layer 7 Inspection:** Proxies operate at the Application layer, intercepting connection handshakes and parsing body contents to enforce RFC standards. Packet filters bypass deeper contents, focusing purely on speed.
4. **Disaster Recovery:** A Backup Image (.fxi) is unique to the physical Firebox hardware that created it, containing feature keys, certificates, passwords, and the configuration file. It cannot be restored on different hardware, unlike a raw Configuration (.xml) file.`,
    weaknessCategory: topic
  };
}

function getLocalDiagnosticsFallback(labName: string, stepTitle: string, technicianIssue: string) {
  const issue = technicianIssue.toLowerCase();
  
  let analysis = `**FSM Auditor Analysis:** Junior engineer is stuck during **"${stepTitle}"** in **"${labName}"**.
The described problem ("${technicianIssue}") points to a configuration discrepancy in security policies or routing modes.`;

  let suggestedCommand = "FSM > Tools > Diagnostic Tasks > Ping -n 10.0.1.1";
  let simulatedLogs = [
    `2026-07-17 12:28:44 Deny 10.0.1.25 10.0.1.1 icmp 1-Trusted 0-External Denied 60 (Unhandled Internal Packet-00) rc=101`,
    `2026-07-17 12:28:49 Deny 10.0.1.25 192.168.10.200 tcp/8080 1-Trusted 2-DMZ Denied 40 (Unhandled Internal Packet-00) rc=101`
  ];

  if (issue.includes("vpn") || issue.includes("bovpn") || issue.includes("tunnel") || issue.includes("phase")) {
    analysis = `**FSM Auditor Analysis:** The Branch Office VPN tunnel fails to negotiate correctly. This is usually caused by mismatched pre-shared keys, Phase 1 proposals (expecting AES but finding 3DES), or incorrect Gateway ID naming conventions.

**Action Plan:**
1. Open **Policy Manager > VPN > BOVPN Tunnels**.
2. Select your gateway and verify Phase 1 Settings are set to **IKEv2** (preferred) or that Phase 1 encryption/DH key groups match the remote peer exactly.
3. Check the **Traffic Monitor** tab for 'No Proposal Chosen' (initiator) or 'proposes phase two failed' (responder) log streams.`;
    suggestedCommand = "FSM > Tools > Diagnostic Tasks > VPN Diagnostic Report";
    simulatedLogs = [
      `2026-07-17 12:30:02 iked (203.0.113.10<->203.0.113.20) Peer proposes Phase 1 encryption 3DES, expecting AES.`,
      `2026-07-17 12:30:05 iked (203.0.113.10<->203.0.113.20) Phase 1 SA negotiation failed. No proposal chosen.`
    ];
  } else if (issue.includes("ping") || issue.includes("timeout") || issue.includes("icmp")) {
    analysis = `**FSM Auditor Analysis:** Ping timeouts occur because default threat protection or implicit policy boundaries drop the ICMP packets. In locally-managed Fireboxes, once the default **Outgoing** policy is disabled, all ping and routing packets to custom interfaces are dropped unless a dedicated **Ping packet filter** allows it.

**Action Plan:**
1. Create or enable a **Ping** policy template in Policy Manager.
2. Ensure the **From** list includes **Any-Trusted** and the **To** list has **Any-External** or specific gateway IPs.
3. Validate link monitor targets to ensure interfaces aren't marked logically dead.`;
    suggestedCommand = "FSM > Tools > Diagnostic Tasks > Ping 10.0.100.2";
    simulatedLogs = [
      `2026-07-17 12:31:12 Deny 10.0.100.1 10.0.100.2 icmp 3-Optional 3-Optional Denied (Unhandled Internal Packet-00) rc=101`,
      `2026-07-17 12:31:17 Deny 10.0.100.1 10.0.100.2 icmp 3-Optional 3-Optional Denied (Unhandled Internal Packet-00) rc=101`
    ];
  } else if (issue.includes("proxy") || issue.includes("http") || issue.includes("certificate") || issue.includes("cert")) {
    analysis = `**FSM Auditor Analysis:** The client browser throws TLS/SSL validation warnings. This is expected because HTTPS Content Inspection is active. The Firebox intercepts the HTTPS handshakes, decrypts payload for AV/WebBlocker/APT checks, and re-encrypts utilizing its self-signed **Proxy Authority Certificate**.

**Action Plan:**
1. Direct the user to download the authority certificate from the portal at \`http://10.0.1.1:4126/certportal\`.
2. Install this certificate on the client's local computer under **Trusted Root Certification Authorities**.
3. Alternatively, check **HTTP Response > Body Content Types** in the HTTP proxy action to see if the file extension download (e.g. .pdf or .exe) is set to Deny instead of AV Scan.`;
    suggestedCommand = "FSM > Tools > Diagnostic Tasks > TCP Dump -i eth1 port 4126";
    simulatedLogs = [
      `2026-07-17 12:32:04 Allow 10.0.1.25 10.0.1.1 4126/tcp 1-Trusted Firebox HTTP-Certificate-Portal-00`,
      `2026-07-17 12:32:10 Deny 10.0.1.25 104.244.42.1 443/tcp 1-Trusted 0-External HTTP-proxy-00 matched cats="Adult Content" action=Deny`
    ];
  }

  return {
    analysis,
    suggestedCommand,
    simulatedLogs
  };
}

function getLocalPerformanceFallback(sessionHistory: any) {
  const quizAttempts = sessionHistory.totalQuizAttempts || 0;
  const quizScoreStr = sessionHistory.quizScore || "0%";
  const quizScoreNum = parseInt(quizScoreStr.replace("%", ""), 10) || 0;

  let readinessScore = "65%";
  let strengths = ["Initial Setup Wizards", "Default Threat Protection Settings"];
  let criticalVulnerabilities = ["BOVPN Mismatched Proposals", "HTTPS Proxy Content Inspection Certificates"];
  let recommendedLabs = ["Lab Exercise 11: Proxies", "Lab Exercise 16: BOVPNs"];
  let summary = "Local diagnostic telemetry indicates stable fundamentals in initial deployment setup. However, advanced tasks like route failovers, multi-WAN configurations, and Layer 7 deep content filters need immediate study. Practicing the hands-on lab guides will rapidly improve the readiness score.";

  if (quizAttempts >= 3) {
    if (quizScoreNum >= 75) {
      readinessScore = `${Math.min(95, quizScoreNum + 5)}%`;
      strengths = ["Policy Precedence Rules", "Static Routing Mappings", "RFC 1918 Private Ranges"];
      criticalVulnerabilities = ["Complex Multi-WAN routing tables"];
      recommendedLabs = ["Lab Exercise 8: Link Monitor and SD-WAN"];
      summary = "Excellent comprehension shown. Your quiz accuracy scores exceed the 75% standard goal. Core security zoning, DNS query resolutions, and packet filters are fully understood. Focus on reviewing high-availability SD-WAN multi-WAN routing tables before attempting the official certification.";
    } else {
      readinessScore = `${quizScoreNum}%`;
    }
  }

  return {
    readinessScore,
    strengths,
    criticalVulnerabilities,
    recommendedLabs,
    summary
  };
}

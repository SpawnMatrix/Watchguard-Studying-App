export interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  requiresExternalLookup?: boolean;
  suggestedSearchTerms?: string;
  isDemo?: boolean;
}

export interface QAItem {
  id: number;
  question: string;
  answer: string;
  category: "Setup" | "Policies" | "Routing" | "VPN" | "Diagnostics" | "All";
  keywords: string[];
  refLink?: string;
}

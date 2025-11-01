export interface ReviewResponse {
  id: number;
  timestamp: string;
  codeSnapshot: string;
  llmResponse: string;
  effortEstimation: string | null;
  projectId: number;
  userId: number;
}

export interface ReviewFinding {
  line: number;
  type: 'bug' | 'style' | 'performance' | 'security';
  message: string;
  suggestion: string;
}

export interface ParsedReview {
  summary: string;
  findings: ReviewFinding[];
  effortEstimation: string;
}


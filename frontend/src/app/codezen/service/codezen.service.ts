import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectRequest } from '../../models/project-request';
import { ProjectResponse } from '../../models/project-response';
import { ReviewRequest } from '../../models/review-request';
import { ReviewResponse } from '../../models/review-response';
import { GuidelineRequest } from '../../models/guideline-request';
import { GuidelineResponse } from '../../models/guideline-response';
import { CommentRequest } from '../../models/comment-request';
import { CommentResponse } from '../../models/comment-response';
import {StorageService} from '../../services/storage/storage.service';

/**
 * CodeZenService - Handles all communication with CodeZen backend API.
 * Manages projects, reviews, and guidelines.
 */
@Injectable({
  providedIn: 'root'
})
export class CodezenService {
  private baseUrl = 'http://localhost:8080/api/v1/projects';

  constructor(private http: HttpClient) { }

  /**
   * Get authorization headers with JWT token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = StorageService.getToken();
    if (!token) {
      console.error('No token found in storage');
      return new HttpHeaders();
    }
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
  /**
   * Create a new project
   */
  createProject(request: ProjectRequest): Observable<ProjectResponse> {
    return this.http.post<ProjectResponse>(
      this.baseUrl,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get all projects for the current user
   */
  getAllProjects(): Observable<ProjectResponse[]> {
    return this.http.get<ProjectResponse[]>(
      this.baseUrl,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get a specific project by ID
   */
  getProject(id: number): Observable<ProjectResponse> {
    return this.http.get<ProjectResponse>(
      `${this.baseUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a project
   */
  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Submit code for review
   */
  createReview(projectId: number, request: ReviewRequest): Observable<ReviewResponse> {
    return this.http.post<ReviewResponse>(
      `${this.baseUrl}/${projectId}/reviews`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get all reviews for a project
   */
  getReviews(projectId: number): Observable<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(
      `${this.baseUrl}/${projectId}/reviews`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get a specific review by ID
   */
  getReview(projectId: number, reviewId: number): Observable<ReviewResponse> {
    return this.http.get<ReviewResponse>(
      `${this.baseUrl}/${projectId}/reviews/${reviewId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Add a custom guideline to a project
   */
  addGuideline(projectId: number, request: GuidelineRequest): Observable<GuidelineResponse> {
    return this.http.post<GuidelineResponse>(
      `${this.baseUrl}/${projectId}/guidelines`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get all guidelines for a project
   */
  getGuidelines(projectId: number): Observable<GuidelineResponse[]> {
    return this.http.get<GuidelineResponse[]>(
      `${this.baseUrl}/${projectId}/guidelines`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Parse LLM response from JSON string to structured object
   * Handles cases where Ollama returns text instead of pure JSON
   */
  parseLLMResponse(llmResponse: string): any {
    if (!llmResponse || !llmResponse.trim()) {
      return {
        summary: 'No review response received',
        findings: [],
        effortEstimation: 'N/A'
      };
    }

    try {
      // Try to parse as direct JSON first
      const directParse = JSON.parse(llmResponse.trim());
      if (directParse && typeof directParse === 'object') {
        return this.validateAndEnhanceResponse(directParse);
      }
    } catch (e) {
      // Not direct JSON, continue to extraction
    }

    try {
      // Extract JSON object from response (may be wrapped in markdown or text)
      // Match first { ... } that contains valid JSON
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndEnhanceResponse(parsed);
      }
    } catch (error) {
      console.warn('Failed to extract JSON from response:', error);
    }

    // If JSON parsing fails, try to extract summary from text
    console.warn('Ollama did not return valid JSON. Attempting to extract summary from text response.');
    
    // Try to extract a meaningful summary from text
    const lines = llmResponse.split('\n').filter(line => line.trim().length > 0);
    const firstMeaningfulLine = lines.find(line => 
      line.trim().length > 20 && 
      !line.includes('```') && 
      !line.includes('{') && 
      !line.includes('}')
    );

    return {
      summary: firstMeaningfulLine || llmResponse.substring(0, 200) || 'Review response received but could not be parsed as JSON',
      findings: this.extractFindingsFromText(llmResponse),
      effortEstimation: this.extractEffortFromText(llmResponse)
    };
  }

  /**
   * Validate and enhance parsed JSON response
   */
  private validateAndEnhanceResponse(parsed: any): any {
    // Ensure required fields exist
    const response: any = {
      summary: parsed.summary || 'Code review completed',
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      effortEstimation: parsed.effort_estimation || parsed.effortEstimation || 'N/A'
    };

    // Validate findings structure
    response.findings = response.findings.map((finding: any) => ({
      line: finding.line || null,
      type: finding.type || 'style',
      message: finding.message || finding.issue || 'Issue found',
      suggestion: finding.suggestion || finding.fix || 'Consider reviewing this'
    }));

    return response;
  }

  /**
   * Try to extract findings from text response (fallback)
   */
  private extractFindingsFromText(text: string): any[] {
    const findings: any[] = [];
    
    // Look for patterns like "Line X:", "Issue:", "Problem:", etc.
    const lines = text.split('\n');
    let currentFinding: any = null;

    for (const line of lines) {
      const lineMatch = line.match(/line\s+(\d+)/i);
      if (lineMatch) {
        if (currentFinding) {
          findings.push(currentFinding);
        }
        currentFinding = {
          line: parseInt(lineMatch[1]),
          type: 'style',
          message: line.trim(),
          suggestion: ''
        };
      } else if (currentFinding && line.trim().length > 10) {
        if (!currentFinding.message || currentFinding.message === line.trim()) {
          currentFinding.suggestion = line.trim();
        }
      }
    }

    if (currentFinding) {
      findings.push(currentFinding);
    }

    return findings.length > 0 ? findings : [];
  }

  /**
   * Try to extract effort estimation from text response (fallback)
   */
  private extractEffortFromText(text: string): string {
    // Look for patterns like "3/10", "5 out of 10", "low effort", etc.
    const effortPatterns = [
      /(\d+)\s*\/\s*10/i,
      /effort[:\s]+(\d+)/i,
      /(\d+)\s*out\s*of\s*10/i,
      /rating[:\s]+(\d+)/i
    ];

    for (const pattern of effortPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return `${match[1]}/10`;
      }
    }

    // Try to infer from keywords
    const lowerText = text.toLowerCase();
    if (lowerText.includes('minor') || lowerText.includes('simple') || lowerText.includes('easy')) {
      return '2/10';
    } else if (lowerText.includes('moderate') || lowerText.includes('medium')) {
      return '5/10';
    } else if (lowerText.includes('major') || lowerText.includes('significant') || lowerText.includes('complex')) {
      return '8/10';
    }

    return 'N/A';
  }

  /**
   * Post a comment/question on a review and get AI response
   */
  postComment(projectId: number, reviewId: number, request: CommentRequest): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(
      `${this.baseUrl}/${projectId}/reviews/${reviewId}/comments`,
      request,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Get all comments/conversation for a review
   */
  getComments(projectId: number, reviewId: number): Observable<CommentResponse[]> {
    return this.http.get<CommentResponse[]>(
      `${this.baseUrl}/${projectId}/reviews/${reviewId}/comments`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Delete a guideline from a project
   */
  deleteGuideline(projectId: number, guidelineId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${projectId}/guidelines/${guidelineId}`,
      { headers: this.getAuthHeaders() }
    );
  }
}

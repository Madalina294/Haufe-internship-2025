import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProjectRequest } from '../../models/project-request';
import { ProjectResponse } from '../../models/project-response';
import { ReviewRequest } from '../../models/review-request';
import { ReviewResponse } from '../../models/review-response';
import { GuidelineRequest } from '../../models/guideline-request';
import { GuidelineResponse } from '../../models/guideline-response';
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
   */
  parseLLMResponse(llmResponse: string): any {
    try {
      // Try to extract JSON from response if it's wrapped in text
      const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(llmResponse);
    } catch (error) {
      console.error('Error parsing LLM response:', error);
      return {
        summary: 'Unable to parse review response',
        findings: [],
        effortEstimation: 'N/A'
      };
    }
  }
}

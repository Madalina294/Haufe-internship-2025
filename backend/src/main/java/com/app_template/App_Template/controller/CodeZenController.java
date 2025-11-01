package com.app_template.App_Template.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.app_template.App_Template.dto.CommentRequest;
import com.app_template.App_Template.dto.CommentResponse;
import com.app_template.App_Template.dto.GuidelineRequest;
import com.app_template.App_Template.dto.GuidelineResponse;
import com.app_template.App_Template.dto.ProjectRequest;
import com.app_template.App_Template.dto.ProjectResponse;
import com.app_template.App_Template.dto.ReviewRequest;
import com.app_template.App_Template.dto.ReviewResponse;
import com.app_template.App_Template.entity.User;
import com.app_template.App_Template.repository.UserRepository;
import com.app_template.App_Template.service.codezen.CodeZenService;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

/**
 * CodeZenController - REST API endpoints for code review functionality.
 * All endpoints require authentication.
 */
@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
public class CodeZenController {

    private final CodeZenService codeZenService;
    private final UserRepository userRepository;

    /**
     * Get the authenticated user from security context.
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * POST /api/v1/projects
     * Create a new project.
     */
    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@RequestBody ProjectRequest request) {
        User user = getCurrentUser();
        ProjectResponse response = codeZenService.createProject(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/v1/projects
     * Get all projects for the current user.
     */
    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getAllProjects() {
        User user = getCurrentUser();
        List<ProjectResponse> projects = codeZenService.getAllProjects(user);
        return ResponseEntity.ok(projects);
    }

    /**
     * GET /api/v1/projects/{id}
     * Get a specific project by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProject(@PathVariable Long id) {
        User user = getCurrentUser();
        ProjectResponse project = codeZenService.getProject(id, user);
        return ResponseEntity.ok(project);
    }

    /**
     * DELETE /api/v1/projects/{id}
     * Delete a project.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        User user = getCurrentUser();
        codeZenService.deleteProject(id, user);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/v1/projects/{id}/reviews
     * Submit code for review.
     */
    @PostMapping("/{id}/reviews")
    public Mono<ResponseEntity<ReviewResponse>> createReview(
            @PathVariable Long id,
            @RequestBody ReviewRequest request) {
        User user = getCurrentUser();
        return codeZenService.createReview(id, request, user)
                .map(review -> ResponseEntity.status(HttpStatus.CREATED).body(review));
    }

    /**
     * GET /api/v1/projects/{id}/reviews
     * Get all reviews for a project.
     */
    @GetMapping("/{id}/reviews")
    public ResponseEntity<List<ReviewResponse>> getReviews(@PathVariable Long id) {
        User user = getCurrentUser();
        List<ReviewResponse> reviews = codeZenService.getReviews(id, user);
        return ResponseEntity.ok(reviews);
    }

    /**
     * GET /api/v1/projects/{id}/reviews/{reviewId}
     * Get a specific review by ID.
     */
    @GetMapping("/{id}/reviews/{reviewId}")
    public ResponseEntity<ReviewResponse> getReview(
            @PathVariable Long id,
            @PathVariable Long reviewId) {
        User user = getCurrentUser();
        ReviewResponse review = codeZenService.getReview(id, reviewId, user);
        return ResponseEntity.ok(review);
    }

    /**
     * POST /api/v1/projects/{id}/guidelines
     * Add a custom guideline to a project.
     */
    @PostMapping("/{id}/guidelines")
    public ResponseEntity<GuidelineResponse> addGuideline(
            @PathVariable Long id,
            @RequestBody GuidelineRequest request) {
        User user = getCurrentUser();
        GuidelineResponse guideline = codeZenService.addGuideline(id, request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(guideline);
    }

    /**
     * GET /api/v1/projects/{id}/guidelines
     * Get all guidelines for a project.
     */
    @GetMapping("/{id}/guidelines")
    public ResponseEntity<List<GuidelineResponse>> getGuidelines(@PathVariable Long id) {
        User user = getCurrentUser();
        List<GuidelineResponse> guidelines = codeZenService.getGuidelines(id, user);
        return ResponseEntity.ok(guidelines);
    }

    /**
     * DELETE /api/v1/projects/{id}/guidelines/{guidelineId}
     * Delete a guideline from a project.
     */
    @DeleteMapping("/{id}/guidelines/{guidelineId}")
    public ResponseEntity<Void> deleteGuideline(
            @PathVariable Long id,
            @PathVariable Long guidelineId) {
        User user = getCurrentUser();
        codeZenService.deleteGuideline(id, guidelineId, user);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/v1/projects/{id}/reviews/{reviewId}/comments
     * Post a question/comment on a review and get AI response.
     */
    @PostMapping("/{id}/reviews/{reviewId}/comments")
    public Mono<ResponseEntity<CommentResponse>> postComment(
            @PathVariable Long id,
            @PathVariable Long reviewId,
            @RequestBody CommentRequest request) {
        User user = getCurrentUser();
        return codeZenService.postComment(id, reviewId, request, user)
                .map(comment -> ResponseEntity.status(HttpStatus.CREATED).body(comment));
    }

    /**
     * GET /api/v1/projects/{id}/reviews/{reviewId}/comments
     * Get all comments/conversation for a review.
     */
    @GetMapping("/{id}/reviews/{reviewId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable Long id,
            @PathVariable Long reviewId) {
        User user = getCurrentUser();
        List<CommentResponse> comments = codeZenService.getComments(id, reviewId, user);
        return ResponseEntity.ok(comments);
    }
}
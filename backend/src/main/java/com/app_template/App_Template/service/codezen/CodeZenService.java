package com.app_template.App_Template.service.codezen;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.app_template.App_Template.dto.CommentRequest;
import com.app_template.App_Template.dto.CommentResponse;
import com.app_template.App_Template.dto.GuidelineRequest;
import com.app_template.App_Template.dto.GuidelineResponse;
import com.app_template.App_Template.dto.ProjectRequest;
import com.app_template.App_Template.dto.ProjectResponse;
import com.app_template.App_Template.dto.ReviewRequest;
import com.app_template.App_Template.dto.ReviewResponse;
import com.app_template.App_Template.entity.CustomGuideline;
import com.app_template.App_Template.entity.Project;
import com.app_template.App_Template.entity.Review;
import com.app_template.App_Template.entity.ReviewComment;
import com.app_template.App_Template.entity.User;
import com.app_template.App_Template.repository.CustomGuidelineRepository;
import com.app_template.App_Template.repository.ProjectRepository;
import com.app_template.App_Template.repository.ReviewCommentRepository;
import com.app_template.App_Template.repository.ReviewRepository;
import com.app_template.App_Template.service.ollama.OllamaService;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

/**
 * CodeZenService - Main business logic for code review functionality.
 * Handles project management, code reviews, and custom guidelines.
 */
@Service
@RequiredArgsConstructor
public class CodeZenService {

    private final ProjectRepository projectRepository;
    private final ReviewRepository reviewRepository;
    private final CustomGuidelineRepository guidelineRepository;
    private final ReviewCommentRepository commentRepository;
    private final OllamaService ollamaService;

    /**
     * Create a new project for the authenticated user.
     */
    @Transactional
    public ProjectResponse createProject(ProjectRequest request, User user) {
        Project project = Project.builder()
                .name(request.getName())
                .language(request.getLanguage())
                .owner(user)
                .createdAt(LocalDateTime.now())
                .build();

        Project saved = projectRepository.save(project);
        return mapToProjectResponse(saved);
    }

    /**
     * Get all projects for the authenticated user.
     */
    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects(User user) {
        List<Project> projects = projectRepository.findByOwnerOrderByCreatedAtDesc(user);
        return projects.stream()
                .map(this::mapToProjectResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific project by ID (must belong to user).
     */
    @Transactional(readOnly = true)
    public ProjectResponse getProject(Long id, User user) {
        Project project = projectRepository.findByIdAndOwner(id, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));
        return mapToProjectResponse(project);
    }

    /**
     * Delete a project (must belong to user).
     */
    @Transactional
    public void deleteProject(Long id, User user) {
        if (!projectRepository.existsByIdAndOwner(id, user)) {
            throw new EntityNotFoundException("Project not found");
        }
        projectRepository.deleteById(id);
    }

    /**
     * Submit code for review and get AI feedback from Ollama.
     */
    @Transactional
    public Mono<ReviewResponse> createReview(Long projectId, ReviewRequest request, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        // Create review entity first
        Review review = Review.builder()
                .codeSnapshot(request.getCode())
                .timestamp(LocalDateTime.now())
                .project(project)
                .user(user)
                .build();

        Review savedReview = reviewRepository.save(review);

        // Call Ollama asynchronously
        return ollamaService.reviewCode(request.getCode(), project)
                .map(response -> {
                    // Parse effort estimation from response (if possible)
                    String effort = extractEffortEstimation(response);

                    // Update review with response
                    savedReview.setLlmResponse(response);
                    savedReview.setEffortEstimation(effort);
                    reviewRepository.save(savedReview);

                    return mapToReviewResponse(savedReview);
                });
    }

    /**
     * Get all reviews for a project.
     */
    @Transactional(readOnly = true)
    public List<ReviewResponse> getReviews(Long projectId, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        List<Review> reviews = reviewRepository.findByProjectOrderByTimestampDesc(project);
        return reviews.stream()
                .map(this::mapToReviewResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific review by ID.
     */
    @Transactional(readOnly = true)
    public ReviewResponse getReview(Long projectId, Long reviewId, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        Review review = reviewRepository.findByIdAndProject(reviewId, project)
                .orElseThrow(() -> new EntityNotFoundException("Review not found"));

        return mapToReviewResponse(review);
    }

    /**
     * Add a custom guideline to a project.
     */
    @Transactional
    public GuidelineResponse addGuideline(Long projectId, GuidelineRequest request, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        CustomGuideline guideline = CustomGuideline.builder()
                .ruleText(request.getRuleText())
                .project(project)
                .build();

        CustomGuideline saved = guidelineRepository.save(guideline);
        return mapToGuidelineResponse(saved);
    }

    /**
     * Get all guidelines for a project.
     */
    @Transactional(readOnly = true)
    public List<GuidelineResponse> getGuidelines(Long projectId, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        List<CustomGuideline> guidelines = guidelineRepository.findByProjectOrderById(project);
        return guidelines.stream()
                .map(this::mapToGuidelineResponse)
                .collect(Collectors.toList());
    }

    /**
     * Delete a guideline from a project (must belong to user's project).
     */
    @Transactional
    public void deleteGuideline(Long projectId, Long guidelineId, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        CustomGuideline guideline = guidelineRepository.findByIdAndProject(guidelineId, project)
                .orElseThrow(() -> new EntityNotFoundException("Guideline not found"));

        guidelineRepository.delete(guideline);
    }

    // Helper methods for mapping entities to DTOs

    private ProjectResponse mapToProjectResponse(Project project) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .language(project.getLanguage())
                .createdAt(project.getCreatedAt())
                .ownerId(project.getOwner().getId())
                .ownerEmail(project.getOwner().getEmail())
                .build();
    }

    private ReviewResponse mapToReviewResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .timestamp(review.getTimestamp())
                .codeSnapshot(review.getCodeSnapshot())
                .llmResponse(review.getLlmResponse())
                .effortEstimation(review.getEffortEstimation())
                .projectId(review.getProject().getId())
                .userId(review.getUser().getId())
                .build();
    }

    private GuidelineResponse mapToGuidelineResponse(CustomGuideline guideline) {
        return GuidelineResponse.builder()
                .id(guideline.getId())
                .ruleText(guideline.getRuleText())
                .projectId(guideline.getProject().getId())
                .build();
    }

    /**
     * Extract effort estimation from LLM response (if present).
     * Handles both JSON and text responses.
     */
    private String extractEffortEstimation(String response) {
        if (response == null || response.trim().isEmpty()) {
            return null;
        }

        try {
            // Try JSON extraction first
            if (response.contains("\"effort_estimation\"")) {
                // Extract from JSON: "effort_estimation": "X/10"
                int start = response.indexOf("\"effort_estimation\"") + 20;
                int quoteStart = response.indexOf("\"", start);
                if (quoteStart > start) {
                    int quoteEnd = response.indexOf("\"", quoteStart + 1);
                    if (quoteEnd > quoteStart) {
                        String value = response.substring(quoteStart + 1, quoteEnd);
                        if (!value.trim().isEmpty()) {
                            return value;
                        }
                    }
                }
            }

            // Try alternative JSON key
            if (response.contains("\"effortEstimation\"")) {
                int start = response.indexOf("\"effortEstimation\"") + 18;
                int quoteStart = response.indexOf("\"", start);
                if (quoteStart > start) {
                    int quoteEnd = response.indexOf("\"", quoteStart + 1);
                    if (quoteEnd > quoteStart) {
                        String value = response.substring(quoteStart + 1, quoteEnd);
                        if (!value.trim().isEmpty()) {
                            return value;
                        }
                    }
                }
            }

            // Try text pattern extraction (fallback)
            // Look for patterns like "3/10", "5 out of 10", "effort: 4", etc.
            String lowerResponse = response.toLowerCase();
            
            // Pattern: "X/10" or "X out of 10"
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d+)\\s*(?:/|out\\s+of)\\s*10", java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher matcher = pattern.matcher(response);
            if (matcher.find()) {
                String effort = matcher.group(1) + "/10";
                return effort;
            }

            // Pattern: "effort: X" or "effort rating: X"
            pattern = java.util.regex.Pattern.compile("effort[\\s:]+(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE);
            matcher = pattern.matcher(response);
            if (matcher.find()) {
                String effort = matcher.group(1) + "/10";
                return effort;
            }

            // Infer from keywords
            if (lowerResponse.contains("minor") || lowerResponse.contains("simple") || lowerResponse.contains("easy")) {
                return "2/10";
            } else if (lowerResponse.contains("moderate") || lowerResponse.contains("medium")) {
                return "5/10";
            } else if (lowerResponse.contains("major") || lowerResponse.contains("significant") || lowerResponse.contains("complex")) {
                return "8/10";
            }

        } catch (Exception e) {
            // Ignore parsing errors
        }
        return null;
    }

    /**
     * Post a comment/question on a review and get AI response.
     */
    @Transactional
    public Mono<CommentResponse> postComment(Long projectId, Long reviewId, CommentRequest request, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        Review review = reviewRepository.findByIdAndProject(reviewId, project)
                .orElseThrow(() -> new EntityNotFoundException("Review not found"));

        // Save user's question
        ReviewComment userComment = ReviewComment.builder()
                .review(review)
                .user(user)
                .message(request.getMessage())
                .role("USER")
                .timestamp(LocalDateTime.now())
                .build();

        ReviewComment savedUserComment = commentRepository.save(userComment);

        // Get conversation history
        List<ReviewComment> history = commentRepository.findByReviewOrderByTimestampAsc(review);

        // Get AI response
        return ollamaService.answerReviewQuestion(request.getMessage(), review, history)
                .map(aiResponse -> {
                    // Save AI response
                    ReviewComment aiComment = ReviewComment.builder()
                            .review(review)
                            .user(user)
                            .message(aiResponse)
                            .role("AI")
                            .timestamp(LocalDateTime.now())
                            .build();

                    ReviewComment savedAiComment = commentRepository.save(aiComment);
                    return mapToCommentResponse(savedAiComment);
                });
    }

    /**
     * Get all comments/conversation for a review.
     */
    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long projectId, Long reviewId, User user) {
        Project project = projectRepository.findByIdAndOwner(projectId, user)
                .orElseThrow(() -> new EntityNotFoundException("Project not found"));

        Review review = reviewRepository.findByIdAndProject(reviewId, project)
                .orElseThrow(() -> new EntityNotFoundException("Review not found"));

        List<ReviewComment> comments = commentRepository.findByReviewOrderByTimestampAsc(review);
        return comments.stream()
                .map(this::mapToCommentResponse)
                .collect(Collectors.toList());
    }

    /**
     * Map ReviewComment entity to CommentResponse DTO.
     */
    private CommentResponse mapToCommentResponse(ReviewComment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .message(comment.getMessage())
                .role(comment.getRole())
                .timestamp(comment.getTimestamp())
                .reviewId(comment.getReview().getId())
                .userId(comment.getUser().getId())
                .build();
    }
}
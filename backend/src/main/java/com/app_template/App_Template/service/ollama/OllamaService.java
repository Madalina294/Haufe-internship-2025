package com.app_template.App_Template.service.ollama;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.app_template.App_Template.entity.CustomGuideline;
import com.app_template.App_Template.entity.Project;
import com.app_template.App_Template.entity.Review;
import com.app_template.App_Template.entity.ReviewComment;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

/**
 * OllamaService - Handles communication with the local Ollama API for code reviews.
 * This service sends code snippets to Ollama and processes the AI-generated feedback.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OllamaService {

    /**
     * Internal DTO for Ollama API request.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    private static class OllamaRequest {
        private String model;
        private String prompt;
        private Boolean stream;
    }

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper;

    @Value("${ollama.api.url:http://localhost:11434/api/generate}")
    private String ollamaApiUrl;

    @Value("${ollama.model:codellama:7b}")
    private String ollamaModel;

    private WebClient webClient;

    /**
     * Initialize WebClient if not already initialized.
     * Extracts base URL from ollama.api.url configuration.
     */
    private WebClient getWebClient() {
        if (webClient == null) {
            // Extract base URL from ollamaApiUrl (e.g., "http://localhost:11434/api/generate" -> "http://localhost:11434")
            String baseUrl = ollamaApiUrl;
            if (baseUrl.contains("/api/generate")) {
                baseUrl = baseUrl.substring(0, baseUrl.indexOf("/api/generate"));
            } else if (baseUrl.contains("/api/")) {
                baseUrl = baseUrl.substring(0, baseUrl.indexOf("/api/"));
            }
            log.info("Initializing Ollama WebClient with base URL: {}", baseUrl);
            webClient = webClientBuilder.baseUrl(baseUrl).build();
        }
        return webClient;
    }

    /**
     * Generate code review using Ollama.
     *
     * @param code The code snippet to review
     * @param project The project containing custom guidelines
     * @return JSON response as string from Ollama
     */
    public Mono<String> reviewCode(String code, Project project) {
        // Build prompt with guidelines
        String prompt = buildReviewPrompt(code, project);

        // Prepare request body
        OllamaRequest request = OllamaRequest.builder()
                .model(ollamaModel)
                .prompt(prompt)
                .stream(false)
                .build();

        log.info("Sending review request to Ollama for project: {}", project.getId());

        // Make async call to Ollama
        return getWebClient()
                .post()
                .uri("/api/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(String.class)
                .map(response -> {
                    try {
                        // Parse Ollama response
                        JsonNode jsonNode = objectMapper.readTree(response);
                        String responseText = jsonNode.path("response").asText();
                        return responseText;
                    } catch (Exception e) {
                        log.error("Error parsing Ollama response", e);
                        return "Error parsing response: " + e.getMessage();
                    }
                })
                .onErrorResume(error -> {
                    log.error("Error calling Ollama API", error);
                    return Mono.just("Error: Unable to connect to Ollama. Please ensure Ollama is running on http://localhost:11434");
                });
    }

    /**
     * Build the review prompt including custom guidelines.
     */
    private String buildReviewPrompt(String code, Project project) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("You are a senior software engineer performing a professional code review.\n");
        prompt.append("Analyze the following code and provide structured feedback.\n\n");

        // Add custom guidelines if they exist
        List<CustomGuideline> guidelines = project.getGuidelines();
        if (guidelines != null && !guidelines.isEmpty()) {
            prompt.append("IMPORTANT PROJECT-SPECIFIC GUIDELINES:\n");
            for (CustomGuideline guideline : guidelines) {
                prompt.append("- ").append(guideline.getRuleText()).append("\n");
            }
            prompt.append("\n");
        }

        prompt.append("CODE TO REVIEW:\n");
        prompt.append("```").append(project.getLanguage()).append("\n");
        prompt.append(code);
        prompt.append("\n```\n\n");

        prompt.append("CRITICAL INSTRUCTION: You MUST respond with ONLY valid JSON. No text before or after the JSON object.\n\n");
        prompt.append("REQUIRED JSON STRUCTURE (copy this format exactly):\n");
        prompt.append("{\n");
        prompt.append("  \"summary\": \"A brief one-sentence overview identifying main issues (e.g., 'Type mismatch error on line 3 where string type is assigned to number result')\",\n");
        prompt.append("  \"findings\": [\n");
        prompt.append("    {\"line\": 3, \"type\": \"type-error\", \"message\": \"Type mismatch: function add() returns number but result is typed as string\", \"suggestion\": \"Change 'const result: string = add(5, 10);' to 'const result: number = add(5, 10);' or use type inference 'const result = add(5, 10);'\"},\n");
        prompt.append("    {\"line\": 15, \"type\": \"bug\", \"message\": \"Description of the bug\", \"suggestion\": \"Fixed code: 'corrected code here'\"},\n");
        prompt.append("    {\"line\": 42, \"type\": \"performance\", \"message\": \"Performance concern\", \"suggestion\": \"Optimization suggestion with example code if applicable\"}\n");
        prompt.append("  ],\n");
        prompt.append("  \"effort_estimation\": \"X/10\"\n");
        prompt.append("}\n\n");
        prompt.append("REVIEW CRITERIA (analyze for):\n");
        prompt.append("- Type errors (especially in TypeScript: type mismatches, incorrect type annotations)\n");
        prompt.append("- Syntax errors and compilation issues\n");
        prompt.append("- Logic errors and bugs\n");
        prompt.append("- Code quality and best practices\n");
        prompt.append("- Performance optimizations\n");
        prompt.append("- Security vulnerabilities\n");
        prompt.append("- Style consistency and maintainability\n");
        prompt.append("- Potential edge cases\n\n");
        prompt.append("CRITICAL: You MUST identify ALL type errors, syntax errors, and bugs. For EACH finding, provide:\n");
        prompt.append("1. Exact line number where the error occurs\n");
        prompt.append("2. Type of issue (bug, type-error, security, performance, style)\n");
        prompt.append("3. Clear description of the problem\n");
        prompt.append("4. A COMPLETE CODE FIX or improvement suggestion in the 'suggestion' field.\n");
        prompt.append("   The suggestion MUST include the corrected code if it's a bug or type error.\n");
        prompt.append("   Example: \"Change 'const result: string = add(5, 10);' to 'const result: number = add(5, 10);'\"\n");
        prompt.append("   Or: \"Use 'const result = add(5, 10);' (let TypeScript infer the type)\"\n\n");
        prompt.append("EFFORT ESTIMATION GUIDE:\n");
        prompt.append("- 1-3/10: Minor style issues, very easy to fix\n");
        prompt.append("- 4-6/10: Some bugs or refactoring needed, moderate effort\n");
        prompt.append("- 7-9/10: Multiple issues, significant refactoring required\n");
        prompt.append("- 10/10: Major rewrite needed\n\n");
        prompt.append("IMPORTANT: Start your response directly with { and end with }. No markdown code blocks, no explanations, ONLY the JSON object.");

        return prompt.toString();
    }

    /**
     * Answer user question about a review.
     * Provides context-aware responses based on the original review.
     * 
     * @param question User's question
     * @param review The review context
     * @param conversationHistory Previous messages for context
     * @return AI's response
     */
    public Mono<String> answerReviewQuestion(String question, Review review, List<ReviewComment> conversationHistory) {
        String prompt = buildChatPrompt(question, review, conversationHistory);

        OllamaRequest request = OllamaRequest.builder()
                .model(ollamaModel)
                .prompt(prompt)
                .stream(false)
                .build();

        log.info("Sending chat question to Ollama for review: {}", review.getId());

        return getWebClient()
                .post()
                .uri("/api/generate")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(request)
                .retrieve()
                .bodyToMono(String.class)
                .map(response -> {
                    try {
                        JsonNode jsonNode = objectMapper.readTree(response);
                        return jsonNode.path("response").asText();
                    } catch (Exception e) {
                        log.error("Error parsing Ollama response", e);
                        return "I apologize, but I encountered an error processing your question.";
                    }
                })
                .onErrorResume(error -> {
                    log.error("Error calling Ollama API for chat", error);
                    return Mono.just("I apologize, but I'm currently unable to answer. Please try again later.");
                });
    }

    /**
     * Build chat prompt with review context and conversation history.
     */
    private String buildChatPrompt(String question, Review review, List<ReviewComment> conversationHistory) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("You are an AI code review assistant. The user is asking a question about a code review you previously performed.\n\n");

        prompt.append("ORIGINAL CODE THAT WAS REVIEWED:\n");
        prompt.append("```\n");
        prompt.append(review.getCodeSnapshot());
        prompt.append("\n```\n\n");

        prompt.append("YOUR PREVIOUS REVIEW:\n");
        prompt.append(review.getLlmResponse());
        prompt.append("\n\n");

        // Add conversation history for context
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            prompt.append("CONVERSATION HISTORY:\n");
            for (ReviewComment comment : conversationHistory) {
                if ("USER".equals(comment.getRole())) {
                    prompt.append("User: ").append(comment.getMessage()).append("\n");
                } else {
                    prompt.append("You: ").append(comment.getMessage()).append("\n");
                }
            }
            prompt.append("\n");
        }

        prompt.append("USER'S QUESTION:\n");
        prompt.append(question);
        prompt.append("\n\n");

        prompt.append("Please provide a helpful, clear, and concise answer to the user's question. ");
        prompt.append("Base your response on the code and review above. ");
        prompt.append("If the question asks for code examples or fixes, provide them in a clear format. ");
        prompt.append("Keep your response focused and relevant to the code review context.");

        return prompt.toString();
    }
}
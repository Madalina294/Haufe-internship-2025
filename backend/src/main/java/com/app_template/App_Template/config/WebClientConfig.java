package com.app_template.App_Template.config;

import java.time.Duration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import reactor.netty.http.client.HttpClient;

/**
 * Configuration for WebClient used in OllamaService.
 */
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        // Configure HttpClient with extended timeouts for Ollama (AI can take time)
        HttpClient httpClient = HttpClient.create()
            .responseTimeout(Duration.ofMinutes(5)); // 5 minutes for complex code reviews
        
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient));
    }

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Enable Java 8 date/time support
        mapper.registerModule(new JavaTimeModule());
        // Serialize dates as ISO-8601 strings instead of timestamps
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
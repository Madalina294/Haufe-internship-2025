package com.app_template.App_Template.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for project response data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectResponse {
    private Long id;
    private String name;
    private String language;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    private Long ownerId;
    private String ownerEmail;
}
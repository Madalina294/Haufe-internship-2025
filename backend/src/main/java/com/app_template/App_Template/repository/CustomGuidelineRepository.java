package com.app_template.App_Template.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.app_template.App_Template.entity.CustomGuideline;
import com.app_template.App_Template.entity.Project;

/**
 * Repository interface for CustomGuideline entity operations.
 */
@Repository
public interface CustomGuidelineRepository extends JpaRepository<CustomGuideline, Long> {

    /**
     * Find all guidelines for a specific project.
     */
    List<CustomGuideline> findByProjectOrderById(Project project);

    /**
     * Find a guideline by ID and project (for security verification).
     */
    java.util.Optional<CustomGuideline> findByIdAndProject(Long id, Project project);
}
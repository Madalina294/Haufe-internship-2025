import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { CodezenService } from '../service/codezen.service';
import { ProjectRequest } from '../../models/project-request';
import { ProjectResponse } from '../../models/project-response';

/**
 * ProjectListComponent - Displays all user projects and allows creation/deletion.
 * Uses Angular Signals for reactive state management.
 */
@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzIconModule,
    NzSpinModule,
    NzEmptyModule
  ],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  // Signals for reactive state
  projects = signal<ProjectResponse[]>([]);
  loading = signal(false);
  isModalVisible = signal(false);

  // Form data
  newProject: ProjectRequest = {
    name: '',
    language: 'java'
  };

  // Programming languages
  languages = [
    { value: 'java', label: 'Java' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'csharp', label: 'C#' },
    { value: 'cpp', label: 'C++' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' }
  ];

  constructor(
    private codezenService: CodezenService,
    private router: Router,
    private message: NzMessageService,
    private modal: NzModalService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  /**
   * Load all projects from backend
   */
  loadProjects(): void {
    this.loading.set(true);
    this.codezenService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading projects:', error);
        this.message.error('Failed to load projects');
        this.loading.set(false);
      }
    });
  }

  /**
   * Show modal for creating new project
   */
  showCreateModal(): void {
    this.newProject = { name: '', language: 'java' };
    this.isModalVisible.set(true);
  }

  /**
   * Handle modal cancel
   */
  handleCancel(): void {
    this.isModalVisible.set(false);
  }

  /**
   * Create a new project
   */
  createProject(): void {
    if (!this.newProject.name.trim()) {
      this.message.warning('Please enter a project name');
      return;
    }

    this.loading.set(true);
    this.codezenService.createProject(this.newProject).subscribe({
      next: (project) => {
        this.message.success('Project created successfully!');
        this.isModalVisible.set(false);
        this.loadProjects();
      },
      error: (error) => {
        console.error('Error creating project:', error);
        this.message.error(this.translate.instant('codezen.projects.createFailed'));
        this.loading.set(false);
      }
    });
  }

  /**
   * Navigate to project details
   */
  openProject(projectId: number): void {
    this.router.navigate(['/codezen/project', projectId]);
  }

  /**
   * Delete a project with confirmation
   */
  deleteProject(project: ProjectResponse, event: Event): void {
    event.stopPropagation(); // Prevent navigation

    this.modal.confirm({
      nzTitle: this.translate.instant('codezen.projects.deleteProject'),
      nzContent: this.translate.instant('codezen.projects.deleteConfirm', { name: project.name }),
      nzOkText: this.translate.instant('codezen.projects.delete'),
      nzOkDanger: true,
      nzOnOk: () => {
        this.codezenService.deleteProject(project.id).subscribe({
          next: () => {
            this.message.success(this.translate.instant('codezen.projects.projectDeleted'));
            this.loadProjects();
          },
          error: (error) => {
            console.error('Error deleting project:', error);
            this.message.error(this.translate.instant('codezen.projects.deleteFailed'));
          }
        });
      }
    });
  }

  /**
   * Get formatted date
   */
  getFormattedDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

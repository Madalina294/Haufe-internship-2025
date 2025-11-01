import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzDividerModule } from 'ng-zorro-antd/divider';

import { CodezenService } from '../service/codezen.service';
import { ProjectResponse } from '../../models/project-response';
import { ReviewResponse } from '../../models/review-response';
import { GuidelineResponse } from '../../models/guideline-response';

/**
 * ProjectDetailComponent - Main component for code review functionality.
 * Displays project details, code editor, review history, and custom guidelines.
 * Uses Angular Signals for reactive state management.
 */
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzTabsModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    NzListModule,
    NzEmptyModule,
    NzTagModule,
    NzModalModule,
    NzDividerModule
  ],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  projectId!: number;

  // Signals for reactive state
  project = signal<ProjectResponse | null>(null);
  reviews = signal<ReviewResponse[]>([]);
  guidelines = signal<GuidelineResponse[]>([]);
  loading = signal(false);
  reviewLoading = signal(false);
  selectedTabIndex = signal(0);

  // Code editor
  code = signal('');

  // Guidelines
  newGuideline = signal('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private codezenService: CodezenService,
    private message: NzMessageService,
    private translate: TranslateService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = +params['id'];
      this.loadProjectData();
    });
  }

  /**
   * Load all project data
   */
  loadProjectData(): void {
    this.loading.set(true);

    this.codezenService.getProject(this.projectId).subscribe({
      next: (project) => {
        this.project.set(project);
        this.loadReviews();
        this.loadGuidelines();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading project:', error);
        this.message.error(this.translate.instant('codezen.projects.createFailed'));
        this.loading.set(false);
        this.router.navigate(['/codezen/projects']);
      }
    });
  }

  /**
   * Load reviews for this project
   */
  loadReviews(): void {
    this.codezenService.getReviews(this.projectId).subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
      }
    });
  }

  /**
   * Load guidelines for this project
   */
  loadGuidelines(): void {
    this.codezenService.getGuidelines(this.projectId).subscribe({
      next: (guidelines) => {
        this.guidelines.set(guidelines);
      },
      error: (error) => {
        console.error('Error loading guidelines:', error);
      }
    });
  }

  /**
   * Submit code for AI review
   */
  submitCodeForReview(): void {
    if (!this.code().trim()) {
      this.message.warning(this.translate.instant('codezen.projectDetail.pleaseEnterCode'));
      return;
    }

    this.reviewLoading.set(true);
    this.codezenService.createReview(this.projectId, { code: this.code() }).subscribe({
      next: (review) => {
        this.message.success(this.translate.instant('codezen.projectDetail.reviewSuccess'));
        this.reviews.update(reviews => [review, ...reviews]);
        this.selectedTabIndex.set(1); // Switch to reviews tab
        this.reviewLoading.set(false);
      },
      error: (error) => {
        console.error('Error creating review:', error);
        this.message.error(this.translate.instant('codezen.projectDetail.reviewFailed'));
        this.reviewLoading.set(false);
      }
    });
  }

  /**
   * Add a new guideline
   */
  addGuideline(): void {
    if (!this.newGuideline().trim()) {
      this.message.warning(this.translate.instant('codezen.projectDetail.guidelinePlaceholder'));
      return;
    }

    this.codezenService.addGuideline(this.projectId, { ruleText: this.newGuideline() }).subscribe({
      next: (guideline) => {
        this.message.success(this.translate.instant('codezen.projectDetail.guidelineAdded'));
        this.guidelines.update(guidelines => [...guidelines, guideline]);
        this.newGuideline.set('');
      },
      error: (error) => {
        console.error('Error adding guideline:', error);
        this.message.error(this.translate.instant('codezen.projectDetail.guidelineFailed'));
      }
    });
  }

  /**
   * Delete a guideline with confirmation
   */
  deleteGuideline(guideline: GuidelineResponse, event: Event): void {
    event.stopPropagation(); // Prevent any other action

    this.modal.confirm({
      nzTitle: this.translate.instant('codezen.projectDetail.deleteGuideline'),
      nzContent: this.translate.instant('codezen.projectDetail.deleteGuidelineConfirm', { text: guideline.ruleText.substring(0, 50) }),
      nzOkText: this.translate.instant('codezen.projects.delete'),
      nzOkDanger: true,
      nzCancelText: this.translate.instant('codezen.projects.cancel'),
      nzOnOk: () => {
        this.codezenService.deleteGuideline(this.projectId, guideline.id).subscribe({
          next: () => {
            this.message.success(this.translate.instant('codezen.projectDetail.guidelineDeleted'));
            this.guidelines.update(guidelines => guidelines.filter(g => g.id !== guideline.id));
          },
          error: (error) => {
            console.error('Error deleting guideline:', error);
            this.message.error(this.translate.instant('codezen.projectDetail.guidelineDeleteFailed'));
          }
        });
      }
    });
  }

  /**
   * View review details
   */
  viewReview(review: ReviewResponse): void {
    this.router.navigate(['/codezen/project', this.projectId, 'review', review.id]);
  }

  /**
   * Get formatted date
   */
  getFormattedDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Navigate back to projects list
   */
  goBack(): void {
    this.router.navigate(['/codezen/projects']);
  }

  /**
   * Get language for Prism highlighting
   */
  getPrismLanguage(): string {
    const proj = this.project();
    if (!proj) return 'javascript';

    const languageMap: { [key: string]: string } = {
      'java': 'java',
      'typescript': 'typescript',
      'javascript': 'javascript',
      'python': 'python',
      'csharp': 'csharp',
      'cpp': 'cpp',
      'go': 'go',
      'rust': 'rust',
      'php': 'php',
      'ruby': 'ruby'
    };

    return languageMap[proj.language] || 'javascript';
  }

  /**
   * Load sample code for testing
   */
  loadSampleCode(): void {
    const proj = this.project();

    const samples: { [key: string]: string } = {
      'java': `public class UserService {
    private Map<String, User> users = new HashMap<>();

    public User getUser(String id) {
        return users.get(id); // Potential NullPointerException
    }

    public void addUser(User user) {
        users.put(user.getId(), user);
    }
}`,
      'typescript': `function calculateTotal(items: any[]) {
    let total = 0;
    for (let i = 0; i <= items.length; i++) { // Off-by-one error
        total += items[i].price;
    }
    return total;
}`,
      'python': `def process_data(data):
    result = []
    for item in data:
        if item != None: # Should use 'is not'
            result.append(item * 2)
    return result`,
      'javascript': `function fetchUserData(userId) {
    fetch('/api/users/' + userId)
        .then(response => response.json())
        .then(data => console.log(data));
    // Missing error handling
}`
    };

    this.code.set(samples[proj?.language || 'java'] || samples['java']);
    this.message.info(this.translate.instant('codezen.projectDetail.loadSample'));
  }
}

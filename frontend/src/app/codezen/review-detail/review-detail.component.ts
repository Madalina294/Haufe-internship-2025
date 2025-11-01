import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';

import { CodezenService } from '../service/codezen.service';
import { ReviewResponse, ParsedReview } from '../../models/review-response';
import { CommentResponse } from '../../models/comment-response';

/**
 * ReviewDetailComponent - Displays detailed code review results from AI.
 * Shows code snapshot, findings, and effort estimation.
 * Uses Angular Signals for reactive state management.
 */
@Component({
  selector: 'app-review-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
    NzDescriptionsModule,
    NzAlertModule,
    NzDividerModule,
    NzInputModule,
    NzListModule
  ],
  templateUrl: './review-detail.component.html',
  styleUrls: ['./review-detail.component.scss']
})
export class ReviewDetailComponent implements OnInit {
  projectId!: number;
  reviewId!: number;

  // Signals for reactive state
  review = signal<ReviewResponse | null>(null);
  parsedReview = signal<ParsedReview | null>(null);
  loading = signal(false);

  // Chat signals
  comments = signal<CommentResponse[]>([]);
  userQuestion = '';
  sendingQuestion = signal(false);
  loadingComments = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private codezenService: CodezenService,
    private message: NzMessageService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = +params['projectId'];
      this.reviewId = +params['reviewId'];
      this.loadReview();
      this.loadComments();
    });
  }

  /**
   * Load review details
   */
  loadReview(): void {
    this.loading.set(true);

    this.codezenService.getReview(this.projectId, this.reviewId).subscribe({
      next: (review) => {
        this.review.set(review);
        if (review.llmResponse) {
          this.parsedReview.set(this.codezenService.parseLLMResponse(review.llmResponse));
        }
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading review:', error);
        this.message.error(this.translate.instant('codezen.projectDetail.reviewFailed'));
        this.loading.set(false);
        this.goBack();
      }
    });
  }

  /**
   * Navigate back to project details
   */
  goBack(): void {
    this.router.navigate(['/codezen/project', this.projectId]);
  }

  /**
   * Get formatted date
   */
  getFormattedDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get tag color based on finding type
   */
  getTagColor(type: string): string {
    const colors: { [key: string]: string } = {
      'bug': 'red',
      'type-error': 'magenta',
      'security': 'volcano',
      'performance': 'orange',
      'style': 'blue'
    };
    return colors[type] || 'default';
  }

  /**
   * Get icon based on finding type
   */
  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'bug': 'bug',
      'type-error': 'close-circle',
      'security': 'shield',
      'performance': 'thunderbolt',
      'style': 'file-text'
    };
    return icons[type] || 'info-circle';
  }

  /**
   * Load comments/chat history for this review
   */
  loadComments(): void {
    this.loadingComments.set(true);
    this.codezenService.getComments(this.projectId, this.reviewId).subscribe({
      next: (comments) => {
        this.comments.set(comments);
        this.loadingComments.set(false);
      },
      error: (error) => {
        console.error('Error loading comments:', error);
        this.loadingComments.set(false);
      }
    });
  }

  /**
   * Handle Enter key press in textarea
   */
  onEnterPress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.ctrlKey) {
      keyboardEvent.preventDefault();
      this.askQuestion();
    }
  }

  /**
   * Send a question to AI about the review
   */
  askQuestion(): void {
    if (!this.userQuestion.trim()) {
      this.message.warning(this.translate.instant('codezen.reviewDetail.enterQuestion'));
      return;
    }

    this.sendingQuestion.set(true);
    const question = this.userQuestion.trim();

    // Add user question to UI immediately
    this.comments.update(comments => [...comments, {
      id: Date.now(),
      message: question,
      role: 'USER',
      timestamp: new Date().toISOString(),
      reviewId: this.reviewId,
      userId: 0
    }]);

    this.codezenService.postComment(this.projectId, this.reviewId, { message: question }).subscribe({
      next: (aiResponse) => {
        // Replace temporary user comment with actual response from server
        this.loadComments();
        this.userQuestion = '';
        this.sendingQuestion.set(false);
      },
      error: (error) => {
        console.error('Error asking question:', error);
        this.message.error(this.translate.instant('codezen.reviewDetail.questionFailed'));
        // Remove temporary user comment on error
        this.comments.update(comments => comments.filter(c => c.id !== Date.now()));
        this.sendingQuestion.set(false);
      }
    });
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzMessageService } from 'ng-zorro-antd/message';

import { CodezenService } from '../service/codezen.service';
import { ReviewResponse, ParsedReview } from '../../models/review-response';

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
    NzCardModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
    NzDescriptionsModule,
    NzAlertModule,
    NzDividerModule
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private codezenService: CodezenService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.projectId = +params['projectId'];
      this.reviewId = +params['reviewId'];
      this.loadReview();
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
        this.message.error('Failed to load review');
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
      'security': 'volcano',
      'performance': 'orange',
      'style': 'blue'
    };
    return colors[type] || 'default';
  }

  /**
   * Get icon for finding type
   */
  getTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'bug': 'bug',
      'security': 'lock',
      'performance': 'dashboard',
      'style': 'highlight'
    };
    return icons[type] || 'info-circle';
  }
}

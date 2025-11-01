import { TestBed } from '@angular/core/testing';

import { CodezenService } from './codezen.service';

describe('CodezenService', () => {
  let service: CodezenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CodezenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

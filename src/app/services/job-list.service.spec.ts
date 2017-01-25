/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { JobListService } from './job-list.service';

describe('JobListService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JobListService]
    });
  });

  it('should ...', inject([JobListService], (service: JobListService) => {
    expect(service).toBeTruthy();
  }));
});

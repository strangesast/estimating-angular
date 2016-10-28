/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { TreeBuilderService } from './tree-builder.service';

describe('Service: TreeBuilder', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TreeBuilderService]
    });
  });

  it('should ...', inject([TreeBuilderService], (service: TreeBuilderService) => {
    expect(service).toBeTruthy();
  }));
});

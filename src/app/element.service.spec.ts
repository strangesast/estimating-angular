/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ElementService } from './element.service';

import {
  ComponentElement,
  FolderDef,
  Location,
  BasedOn,
  Folder,
  Child,
  User,
  Job
} from './classes';

import { initObjectStore } from './util';
import { STORE_NAME, STORE_VERSION, STORES } from './indexedDB';

const TEST_OWNER = {
  email: 'test@example.com',
  name: 'Test',
  username: 'test'
};

describe('retrieval', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ElementService]
    });
  });

  //it('should create new job', inject([ElementService], (elementService: ElementService) => {
  //  return initObjectStore(STORE_NAME, STORE_VERSION, STORES).then(db => {
  //    elementService.db = db;

  //    let ob = elementService.baseJob({
  //      name: 'Test Job 123',
  //      description: '',
  //      owner: TEST_OWNER
  //    });

  //    ob.take(1).subscribe(job=>{
  //      expect(job.owner).toEqual(TEST_OWNER);
  //      console.log('job', job);
  //      ob.next(null);
  //    });

  //  });
  //}));
});

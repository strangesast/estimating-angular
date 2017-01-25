/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ElementService } from './element.service';

import { Observable } from 'rxjs';

import {
  ComponentElement,
  FolderDefinition,
  LocationElement,
  BasedOn,
  FolderElement,
  ChildElement,
  User,
  Collection
} from '../models';

import { initObjectStore } from '../resources/util';
import { DB_NAME, DB_VERSION, STORES } from '../resources/indexedDB';

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

  /*
  it('should create new job', inject([ElementService], (elementService: ElementService) => {
    return initObjectStore(DB_NAME, DB_VERSION, STORES).then(db => {
      elementService.db = db;

      let ob = elementService.baseJob({
        name: 'Test Job 123',
        description: '',
        owner: TEST_OWNER
      });
      
      ob.subscribe(job => {
        console.log('job state', job);
      },(err) => {
        // error
        console.log('val', ob._value);
        console.log('job error state', err);
      },() => {
        // complete
        console.log('complete');
      });

    });
  }));
  */
});

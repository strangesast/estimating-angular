/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { JobListPageComponent } from './job-list-page.component';

describe('JobListPageComponent', () => {
  let component: JobListPageComponent;
  let fixture: ComponentFixture<JobListPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JobListPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JobListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

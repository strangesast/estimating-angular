/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EstimatingPageComponent } from './estimating-page.component';

describe('EstimatingPageComponent', () => {
  let component: EstimatingPageComponent;
  let fixture: ComponentFixture<EstimatingPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EstimatingPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EstimatingPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

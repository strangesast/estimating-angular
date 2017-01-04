/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { BuildPageComponent } from './build-page.component';

describe('BuildPageComponent', () => {
  let component: BuildPageComponent;
  let fixture: ComponentFixture<BuildPageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BuildPageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BuildPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  //it('should create', () => {
  //  expect(component).toBeTruthy();
  //});
});

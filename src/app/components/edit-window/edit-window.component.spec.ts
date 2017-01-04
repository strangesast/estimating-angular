/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { EditWindowComponent } from './edit-window.component';

describe('EditWindowComponent', () => {
  let component: EditWindowComponent;
  let fixture: ComponentFixture<EditWindowComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditWindowComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  //it('should create', () => {
  //  expect(component).toBeTruthy();
  //});
});

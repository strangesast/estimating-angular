/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { NestComponent } from './nest.component';

describe('NestComponent', () => {
  let component: NestComponent;
  let fixture: ComponentFixture<NestComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ NestComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

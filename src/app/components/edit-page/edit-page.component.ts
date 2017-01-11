import { Component, OnInit, OnChanges } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Observable, BehaviorSubject } from 'rxjs'

import { JobService } from '../../services/job.service';
import { Child, ComponentElement, FolderElement } from '../../models/classes';

@Component({
  selector: 'app-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: ['./edit-page.component.less']
})

export class EditPageComponent implements OnInit, OnChanges {
  public selectedElement: any = null;
  public openElements: any;
  public openElementIds: string[];
  private openElementsSubject: BehaviorSubject<any[]>;

  public newElement = new BehaviorSubject(null);

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit():void{
    this.route.parent.data.subscribe(({ job: { openElements }}) => {
      this.openElementsSubject = openElements;
      this.openElementsSubject.subscribe(elements => {
        this.openElementIds = Object.keys(elements);
        if(this.selectedElement == null || this.openElementIds.map(id=>elements[id]).indexOf(this.selectedElement) === -1) {
          this.selectedElement = this.openElementIds.length ? elements[this.openElementIds[0]].element : null;
        }
        this.openElements = elements;
      });
    });
  }

  backToBuild() {
    this.router.navigate(['build'], {relativeTo: this.route.parent});
  }

  ngOnDestroy() {
  }

  typeOf(element) {
    return element instanceof FolderElement ? element.type : element instanceof ComponentElement ? 'component' : element instanceof Child ? 'child' : 'unknown';
  }

  setCreateNew() {
    this.selectedElement = this.newElement;
  }

  setSelectedElement(element) {
    this.selectedElement = element;
  }

  ngOnChanges(changes) {
  }

}

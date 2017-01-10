import { Component, OnInit } from '@angular/core';
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

export class EditPageComponent implements OnInit {
  public selectedElement: any = null;
  public openElements: any[];
  public openElementIds: string[];
  private openElementsSubject: BehaviorSubject<any[]>;

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit():void{
    this.route.parent.data.subscribe(({ job: { openElements }}) => {
      this.openElementsSubject = openElements;
      this.openElementsSubject.switchMap(elements => {
        let ids = Object.keys(elements);
        let arr = ids.map(id => elements[id].element)
        console.log('arr', arr);
        return Observable.combineLatest(...arr);
      }).subscribe(elements => {
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
}

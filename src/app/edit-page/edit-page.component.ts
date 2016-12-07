import { ActivatedRoute, Params, Router }   from '@angular/router';
import { Location }                 from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  Input,
  Component,
  OnInit,
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/core';


import { JobService } from '../job.service';
import { Element } from '../element';
import { TreeBuilderService } from '../tree-builder.service';

import { Child, ComponentElement, Folder } from '../classes';

@Component({
  selector: 'app-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: ['./edit-page.component.less', '../app.component.less']
})

export class EditPageComponent implements OnInit {
  editElements: any[] = [];
  activeElementId: string|null;

  elementsSub: any;
  activeSub: any;
  sub: any;

  newElementForm: FormGroup;

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit():void{
    this.newElementForm = this.formBuilder.group({
      name: ['', [
        Validators.minLength(5),
        Validators.required]
      ],
      description: ''
    });

    this.jobService.getEditElements().subscribe(elements => {
      this.editElements = elements;
      if(elements.map(el=>el.id).indexOf(this.activeElementId) == -1) this.activeElementId = elements[0] ? elements[0].id : null;
    });

    this.route.data.subscribe((data:any) => {
      if(data.editService != null) {
        this.jobService.addEditElement(data.editService);
        this.activeElementId = data.editService.id;
      } else {
        this.activeElementId = null;
      }
    });
  }

  remove(el) {
    this.jobService.removeEditElement(el);
  }

  removeElement(el): void {
    //this.elementEditService.removeElement(el);
  }

  loadElement(el): void {
    if(el == null) {
      this.router.navigate(['edit'], {relativeTo: this.route.parent});
    } else {
      let t = el instanceof Child ? 'child' : el instanceof ComponentElement ? 'component' : el instanceof Folder ? 'folder' : 'unknown';
      let id = el.id;
      this.router.navigate(['edit', t, id], {relativeTo: this.route.parent});
    }
    //this.elementEditService.loadElement(el);
  }

  backToBuild() {
    this.router.navigate(['build'], {relativeTo: this.route.parent});
  }

  ngOnDestroy() {
    if(this.elementsSub) this.elementsSub.unsubscribe();
    if(this.activeSub) this.activeSub.unsubscribe();
    if(this.sub) this.sub.unsubscribe();
  }
}

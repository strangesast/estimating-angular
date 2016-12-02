import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router }   from '@angular/router';
import { Location }                 from '@angular/common';

import { Element } from '../element';
import { TreeBuilderService } from '../tree-builder.service';

import { SortablejsOptions } from 'angular-sortablejs';

@Component({
  selector: 'app-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: ['./edit-page.component.less', '../app.component.less']
})

export class EditPageComponent implements OnInit {
  elements: any[] = [];
  activeElement: any;

  elementsSub: any;
  activeSub: any;
  sub: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) { }

  ngOnInit():void{
    this.sub = this.route.data.subscribe((data:any) => {
      console.log('data', data);
      let obj = data.editService;
      if(obj == null) return; // go to new page
      if(this.elements.indexOf(obj) == -1) this.elements.push(obj);
      this.activeElement = obj;
    });
  }

  onChange(prop, evt) {
    console.log(evt);
  }

  removeElement(el): void {
    //this.elementEditService.removeElement(el);
  }

  loadElement(el): void {
    //this.elementEditService.loadElement(el);
  }

  childListOptions: SortablejsOptions = {
    group: {
      name: 'elements', pull: false, put: true
    }
  }
  tabListOptions: SortablejsOptions = {
    group: {
      name: 'tabs', pull: false, put: false
    },
    filter: '.remove',
    draggable: '.tab'
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

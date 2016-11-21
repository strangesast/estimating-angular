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
  elements: any[];
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
    this.sub = this.route.params.subscribe((params: Params) => {
      let kind = params['kind'];
      let id = params['id'];
      //this.elementEditService.loadElement(kind, id).then((res)=>{
      //  this.activeElement = res;

      //  this.elementsSub = this.elementsSub || this.elementEditService.elements.subscribe(els=>{
      //    this.elements = els;
      //  });
      //  this.activeSub = this.activeSub || this.elementEditService.activeElement.subscribe(el=>{
      //    this.activeElement = el;
      //    let arr = el == null ? ['edit'] : ['edit', el.type || 'component', el.id];
      //    this.router.navigate(arr, {relativeTo: this.route.parent});
      //  });
      //});
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

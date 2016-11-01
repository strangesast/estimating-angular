import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params }   from '@angular/router';
import { Location }                 from '@angular/common';

import { Element } from '../element';
import { TreeBuilderService } from '../tree-builder.service';
import { ElementEditService } from '../element-edit.service';

import { SortablejsOptions } from 'angular-sortablejs';

@Component({
  selector: 'app-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: ['./edit-page.component.less', '../app.component.less']
})

export class EditPageComponent implements OnInit {
  activeElement: Element | null = null;
  elements: Element[] = [];

  constructor(
    private elementEditService: ElementEditService,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit() : void {
    this.route.params.forEach((params: Params) => {
      // change to the tab of the id in the url bar
      // TODO: need to add 404 routing
      let id = params['id'];
      if(id == null) {
        this.activeElement = this.elementEditService.loadElement(null);
      } else {
        this.activeElement = this.elementEditService.loadElementById(+id); // numeric for now
      }
      this.elements = this.elementEditService.getElements();
      this.elementEditService.elements.subscribe((res) => this.elements = res);
      this.elementEditService.activeElement.subscribe((res) => this.activeElement = res);
    });
  }

  removeElement(element: Element): void {
    this.elementEditService.removeElement(element);
  }

  changeActiveElement(element: Element | null) {
    // change the active element (and tab) to 'element' or new tab (null)
    this.elementEditService.loadElement(element);
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
}

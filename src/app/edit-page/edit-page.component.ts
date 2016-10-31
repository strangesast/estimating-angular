import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params }   from '@angular/router';
import { Location }                 from '@angular/common';

import { Element } from '../element';
import { TreeBuilderService } from '../tree-builder.service';
import { ElementEditService } from '../element-edit.service';

@Component({
  selector: 'app-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: ['./edit-page.component.less', '../app.component.less']
})
export class EditPageComponent implements OnInit {

  constructor(
    private elementEditService: ElementEditService,
    private route: ActivatedRoute,
    private location: Location
  ) { }

  ngOnInit() : void {
    this.route.params.forEach((params: Params) => {
      let id = +params['id'];
      this.elementEditService.loadElement(id);
    });
  }
}

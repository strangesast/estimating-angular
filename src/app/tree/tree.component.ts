import {
  Component,
  OnInit,
  trigger,
  state,
  animate,
  transition,
  style } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

import { Element } from '../element';
import { Phase as PhaseElement } from '../phase';// as PhaseElement;
import { Component as ComponentElement } from '../component';// as ComponentElement;

import { TreeBuilderService } from '../tree-builder.service';

@Component({
  selector: 'app-tree',
  animations: [
    trigger('offset', [])
  ],
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.css']
})
export class TreeComponent implements OnInit {
  elements: Element[] = [];

  constructor(private route: ActivatedRoute, private treeBuilderService: TreeBuilderService) { }

  ngOnInit() {
    let subject = this.treeBuilderService.buildTree();
    subject.subscribe(res => {
      this.elements = res;
    });
  };
}

import { Component, OnInit } from '@angular/core';

import { Element } from '../element';
import { Phase as PhaseElement } from '../phase';// as PhaseElement;
import { Component as ComponentElement } from '../component';// as ComponentElement;

import { TreeBuilderService } from '../tree-builder.service';

@Component({
  selector: 'app-tree',
  templateUrl: './tree.component.html',
  styleUrls: ['./tree.component.css']
})
export class TreeComponent implements OnInit {
  elements: Element[] = [];

  constructor(private treeBuilderService: TreeBuilderService) { }

  ngOnInit() {
    this.treeBuilderService.buildTree().then((elements) => this.elements = elements).then(() => {
      setInterval(() => {
        this.elements = this.elements.length ? this.elements.slice(1).concat(this.elements[0]) : this.elements;
      }, 5000);
    });
  };
}

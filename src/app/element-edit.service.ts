import { Injectable } from '@angular/core';

import { Element } from './element';
import { TreeBuilderService } from './tree-builder.service';

@Injectable()
export class ElementEditService {
  elements: Element[] = [];
  activeElement: Element | null = null;

  constructor(private treeBuilderService: TreeBuilderService) { }

  loadElement(id: number) {
    let element = this.treeBuilderService.find(id)
    if(element == null) console.log('not found (404)');
    if(this.elements.indexOf(element) == -1) this.elements.push(element);
    this.activeElement = element;
  }
}

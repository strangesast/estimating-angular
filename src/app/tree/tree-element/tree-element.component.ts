import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  ElementRef,
  Injector
} from '@angular/core';

import { ComponentElement, Child, Folder } from '../../classes';

const ONEND = {'type':'on', value:'end'};
const ONSTART = {'type':'on', value:'start'};
const OVER = {'type':'over', value: 'over'};

@Component({
  selector: 'app-tree-element',
  templateUrl: './tree-element.component.html',
  styleUrls: ['./tree-element.component.less'],
  host: {
    '(dragstart)':'onDragStart($event)',
    '(dragover)':'onDragOver($event)',
    '(dragleave)':'onDragLeave($event)',
    '(dragenter)':'onDragEnter($event)',
    '(dragend)':'onDragEnd($event)',
    '(drop)':'onDragDrop($event)',
    '[draggable]':'draggable',
    '[class.dragged]':'dragged'
  }
})
export class TreeElementComponent implements OnInit, OnDestroy {
  data: any = {};
  kind: string = 'unknown';
  url: string;
  dragged: boolean = false;
  draggable: boolean = false;
  @Output() dragEmitter: EventEmitter<any> = new EventEmitter();

  constructor(private injector: Injector, public element: ElementRef) {
    this.data = this.injector.get('data');
    if(this.data.data instanceof Folder) {
      this.kind = 'folder';

    } else if (this.data.data instanceof Child) {
      this.kind = 'child';

    } else if (this.data.data instanceof ComponentElement) {
      this.kind = 'component';
    }

  }

  ngOnInit() {
  }
  ngOnDestroy() {
  }

  onDragStart() {
    //setTimeout(()=>this.dragged = true, 100);
    this.dragged = true;
    this.dragEmitter.emit(ONSTART);
  }
  onDragOver() {
    this.dragEmitter.emit(OVER);
  }
  onDragLeave() {
  }
  onDragEnter() {
  }
  onDragEnd() {
    this.dragged = false;
    this.dragEmitter.emit(ONEND);
  }
  onDragDrop() {
    console.log('drop');
  }
  gripHoverEnter() {
    // if grip hover
    this.draggable = true;
  }
  gripHoverLeave() {
    this.draggable = false;
  }
}

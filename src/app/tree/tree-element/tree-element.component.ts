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
const ENTER = {'type':'over', value: 'enter'};
const LEAVE = {'type':'over', value: 'leave'};
const DROP = {'type':'over', value: 'drop'};

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
    '[class.dragged]':'dragged',
    '(focus)':'focus($event)',
    '(focusout)':'blur($event)',
    '[class.active]':'focused'
  }
})
export class TreeElementComponent implements OnInit, OnDestroy {
  data: any = {};
  kind: string = 'unknown';
  url: string;
  dragged: boolean = false;
  draggable: boolean = false;
  focused: boolean = false;
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
  focus() {
    this.focused = true;
  }
  blur() {
    this.focused = false;
  }

  onDragStart() {
    //setTimeout(()=>this.dragged = true, 100);
    this.dragged = true;
    this.dragEmitter.emit(ONSTART);
  }
  onDragOver() {
    //this.dragEmitter.emit(OVER);
  }
  onDragLeave() {
    this.dragEmitter.emit(LEAVE);
  }
  onDragEnter() {
    this.dragEmitter.emit(ENTER);
  }
  onDragEnd() {
    this.dragged = false;
    this.dragEmitter.emit(ONEND);
  }
  onDragDrop() {
    this.dragEmitter.emit(DROP);
  }
  enableHover(rev) {
    this.focused = false;
    this.draggable = rev == null ? true : rev;
  }
}

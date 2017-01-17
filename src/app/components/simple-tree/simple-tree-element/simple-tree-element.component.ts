import {
  ElementRef,
  Component,
  OnChanges,
  Injector,
  OnInit,
  Input,
  Output,
  EventEmitter
} from '@angular/core';

import { nameStringToClass, classToNameString } from '../../../resources/util';

export const SIMPLE_TREE_ELEMENT_SELECTOR = 'app-simple-tree-element';

@Component({
  selector: SIMPLE_TREE_ELEMENT_SELECTOR,
  templateUrl: './simple-tree-element.component.html',
  styleUrls: ['./simple-tree-element.component.less'],
  /*
  host: {
    '(dragstart)': 'this.dragging = true; drag.emit({event: $event, component: this})',
    '(dragover)':  'drag.emit({event: $event, component: this})',
    '(dragleave)': 'drag.emit({event: $event, component: this})',
    '(dragenter)': 'drag.emit({event: $event, component: this})',
    '(dragend)':   'this.dragging = false; drag.emit({event: $event, component: this})',
    '(drop)':      'drag.emit({event: $event, component: this})',
    '[attr.draggable]': 'draggable'
  }
  */
  host: {
    '(dragstart)': 'onDragStart($event)',
    '(dragover)':  'onDragOver($event)',
    '(dragenter)':  'onDragEnter($event)',
    '(dragleave)':  'onDragLeave($event)',
    '(drop)':      'onDragDrop($event)',
    '(dragend)':   'onDragEnd($event)',
    '[attr.draggable]': 'draggable'
  }
})
export class SimpleTreeElementComponent implements OnInit, OnChanges {
  @Input() public data: any = {};
  @Input() startAt: number = 0;
  @Output() nameClicked = new EventEmitter();
  @Output() drag = new EventEmitter();
  @Output() collapse = new EventEmitter();
  @Output() dropEvt = new EventEmitter();

  draggable: boolean = false;
  dragover: boolean = false;
  dragging: boolean = false;

  constructor(
    private injector: Injector,
    public elementRef: ElementRef
  ) {
    this.data = this.injector.get('data');
  }

  ngOnInit() {}

  ngOnChanges(changes) {}
  
  setDraggable(val) {
    this.draggable = val;
  }

  onDragStart(evt) {
    this.dragging = true;
    console.log('data', this.data);
    evt.dataTransfer.setData('text', JSON.stringify({ object: this.data.data.toJSON(), type: classToNameString(this.data.data.constructor)}));
  }

  onDragOver(evt) {
    evt.preventDefault();
    this.dragover = true;
    return false;
  }

  onDragEnter(evt) {
    evt.preventDefault();
  }

  onDragLeave(evt) {
    this.dragover = false;
  }

  onDragDrop(evt) {
    this.dragover = false;
    let data = JSON.parse(evt.dataTransfer.getData('text'));
    if(data.object !== undefined && typeof data.type === 'string') {
      let obj = nameStringToClass(data.type).fromObject(data.object);
      this.dropEvt.emit({dropped: obj, on: this.data.data});
    }
  }

  onDragEnd(evt) {
    this.dragging = false;
  }
}

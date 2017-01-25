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

import { ClassToStringPipe } from '../../../pipes/class-to-string.pipe';
import { nameStringToClass, classToNameString } from '../../../resources/util';
import { ChildElement, FolderElement } from '../../../models';

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

  fragment: string = null;
  draggable: boolean = false;
  dragover: boolean = false;
  dragging: boolean = false;

  constructor(
    private injector: Injector,
    public elementRef: ElementRef,
    public classToStringPipe: ClassToStringPipe
  ) {
    this.data = this.injector.get('data');
  }

  ngOnInit() {
    if((this.data.data instanceof FolderElement || this.data.data instanceof ChildElement) && (this.data.data && this.data.data.id)) {
      this.fragment = [this.classToStringPipe.transform(this.data.data), this.data.data.id].join('/');
    }
  }

  ngOnChanges(changes) {}
  
  setDraggable(val) {
    this.draggable = val;
  }

  onDragStart(evt) {
    this.dragging = true;
    let obj = {
      object: this.data.data.toJSON(),
      type: this.classToStringPipe.transform(this.data.data)
    };
    evt.dataTransfer.setData('text', JSON.stringify(obj));
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
      let obj = this.classToStringPipe.transform(data.type).fromJSON(data.object);
      this.dropEvt.emit({dropped: obj, on: this.data.data});
    }
  }

  onDragEnd(evt) {
    this.dragging = false;
  }
}

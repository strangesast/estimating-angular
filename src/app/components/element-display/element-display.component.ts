import {
  EventEmitter,
  Component,
  Injector,
  ElementRef,
  OnChanges,
  OnInit,
  Output,
  Input,
} from '@angular/core';

import * as D3 from 'd3';
import { BehaviorSubject } from 'rxjs';

import { ClassToStringPipe } from '../../pipes';
import { ComponentElement, ChildElement, FolderElement, CatalogPart, Collection } from '../../models';

export const SELECTOR = 'app-element-display';

@Component({
  selector: SELECTOR,
  templateUrl: './element-display.component.html',
  styleUrls: ['./element-display.component.less'],
  host: {
    '[class]': 'size',
    '[tabindex]': '1',
    '(dragstart)': 'onDragStart($event)',
    '(dragover)':  'onDragOver($event)',
    '(dragenter)':  'onDragEnter($event)',
    '(dragleave)':  'onDragLeave($event)',
    '(drop)':      'onDragDrop($event)',
    '(dragend)':   'onDragEnd($event)',
    '[attr.draggable]': 'draggable'
  }
})
export class ElementDisplayComponent implements OnInit, OnChanges {
  @Input() element: ComponentElement|ChildElement|FolderElement|CatalogPart|Collection; 
  private elementSubject: BehaviorSubject<ComponentElement|ChildElement|FolderElement|CatalogPart|Collection>;
  @Input() config: any;
  size: 'small'|'large' = 'small';
  kind: string;
  uniqueRoot: boolean = false;
  fragment: string;

  @Output() dropEvt = new EventEmitter();

  draggable: boolean = false;
  dragging: boolean = false;
  dragover: boolean = false;

  constructor(
    private injector: Injector,
    private elementRef: ElementRef,
    private pipe: ClassToStringPipe
  ) {
    this.element = this.injector.get('element');
    this.config = this.injector.get('config');
    if (this.config.uniqueRoot && (this.element instanceof D3.hierarchy) && (<any>this.element).depth == 0) {
      this.uniqueRoot = true;
    }
    if (this.config.nameLink) {
      let data = this.element instanceof D3.hierarchy ? (<any>this.element).data : this.element;
      if (data.id) {
        this.fragment = [this.pipe.transform(data), data.id].join('/');
      }
    }
  }

  ngOnInit() {
    this.size = this.config.size || 'small';
  }

  ngOnChanges(changes) {
  }

  setDraggable(val) {
    this.draggable = val;
  }

  onDragStart(evt) {
    this.dragging = true;
    let data = this.element instanceof D3.hierarchy ? (<any>this.element).data : this.element;
    let obj = {
      object: data.toJSON(),
      type: this.pipe.transform(data)
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
    let dragData = JSON.parse(evt.dataTransfer.getData('text'));
    let data = this.element instanceof D3.hierarchy ? (<any>this.element).data : this.element;
    if(dragData.object !== undefined && typeof dragData.type === 'string') {
      let obj = this.pipe.transform(dragData.type).fromJSON(data.object);
      this.dropEvt.emit({ dropped: obj, on: data });
    }
  }

  onDragEnd(evt) {
    this.dragging = false;
  }
}

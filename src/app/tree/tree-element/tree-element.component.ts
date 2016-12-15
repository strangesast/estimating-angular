import {
  Component,
  EventEmitter,
  Host,
  Input,
  Output,
  OnInit,
  OnDestroy,
  ElementRef,
  Injector
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { TreeComponent } from '../tree.component';

import {
  ComponentElement,
  Child,
  Folder
} from '../../classes';

import { TreeOptions } from '../../tree-options';
import { defaultOptions } from '../../defaults';

const ONEND = {'type':'on', value:'end'};
const ONSTART = {'type':'on', value:'start'};
const ENTER = {'type':'over', value: 'enter'};
const LEAVE = {'type':'over', value: 'leave'};
const DROP = {'type':'on', value: 'drop'};

@Component({
  selector: 'app-tree-element',
  templateUrl: './tree-element.component.html',
  styleUrls: ['./tree-element.component.less'],
  host: {
    //'(drag)':         'dragEmitter.emit({ event: $event, component: this })',
    '(dragstart)':    'dragEmitter.emit({ event: $event, component: this })',
    '(dragover)':     '$event.preventDefault(); dragEmitter.emit({ event: $event, component: this })',
    '(dragleave)':    'dragEmitter.emit({ event: $event, component: this })',
    '(dragenter)':    'dragEmitter.emit({ event: $event, component: this })',
    '(dragend)':      'dragEmitter.emit({ event: $event, component: this })',
    '(drop)':         'dragEmitter.emit({ event: $event, component: this })',
    '[draggable]':    'draggable',
    '[class.dragged]':'dragged',
    'tabindex': '1',
    //'(focus)':'focus($event)',
    '(focusout)':'blur($event)',
    '[class.active]':'options.expand && focused'
  }
})
export class TreeElementComponent implements OnInit, OnDestroy {
  kind: string = 'unknown';
  url: string;
  @Input() data: any = {};
  @Input() options: TreeOptions;
  dragged: boolean = false;
  draggable: boolean = false;
  focused: boolean = false;
  isOpen: boolean = true; // folder only

  @Output() dragEmitter: EventEmitter<any> = new EventEmitter();

  constructor(private injector: Injector, public element: ElementRef, private router: Router, private route: ActivatedRoute) {
    this.data = this.injector.get('data');
    this.options = this.injector.get('options');
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

  // 'drag'
  //@Output() drag: EventEmitter<any> = new EventEmitter();
  //onDrag(event) {
  //  this.drag.emit({ component: this, event: event });
  //}

  // 'dragstart'
  //@Output() dragstart: EventEmitter<any> = new EventEmitter();
  //onDragStart(event) {
  //  this.dragged = true;
  //  this.dragstart.emit({ component: this, event: event });
  //}

  // 'dragover'
  //@Output() dragover: EventEmitter<any> = new EventEmitter();
  //onDragOver(event) {
  //  event.preventDefault();
  //  this.dragover.emit({ component: this, event: event });
  //}

  // 'dragleave'
  //@Output() dragleave: EventEmitter<any> = new EventEmitter();
  //onDragLeave(event) {
  //  this.dragleave.emit({ component: this, event: event });
  //}

  // 'dragexit'
  //@Output() dragexit: EventEmitter<any> = new EventEmitter();
  //onDragExit(event) {
  //  this.dragexit.emit({ component: this, event: event });
  //}

  // 'dragenter'
  //@Output() dragenter: EventEmitter<any> = new EventEmitter();
  //onDragEnter(event) {
  //  this.dragenter.emit({ component: this, event: event });
  //}

  // 'dragend'
  //@Output() dragend: EventEmitter<any> = new EventEmitter();
  //onDragEnd(event) {
  //  this.dragged = false;
  //  this.dragend.emit({ component: this, event: event });
  //}

  // 'drop'
  //@Output() drop: EventEmitter<any> = new EventEmitter();
  //onDrop(event) {
  //  event.preventDefault();
  //  this.drop.emit({ component: this, event: event });
  //}

  enableHover(rev) {
    this.focused = false;
    this.draggable = rev == null ? true : rev;
  }
  toggleOpen() {
    this.isOpen = !this.isOpen;
  }
  toggleFocus() {
    if(!this.focused) {
      this.focused = true;
      return;
    }
    this.router.navigate(['../edit', this.kind, this.data.data.id], {relativeTo: this.route});
  }
}

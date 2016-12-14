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
import { Router, ActivatedRoute } from '@angular/router';

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
    '(dragstart)':'onDragStart($event)',
    '(dragover)':'onDragOver($event)',
    '(dragleave)':'onDragLeave($event)',
    '(dragenter)':'onDragEnter($event)',
    '(dragend)':'onDragEnd($event)',
    '(drop)':'onDragDrop($event)',
    '[draggable]':'draggable',
    '[class.dragged]':'dragged',
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

  onDragStart() {
    //setTimeout(()=>this.dragged = true, 100);
    this.dragged = true;
    this.dragEmitter.emit(ONSTART);
  }
  onDragOver(event) {
    //this.dragEmitter.emit(OVER);
    event.preventDefault();
  }
  onDragLeave() {
    if(this.options.sink) this.dragEmitter.emit(LEAVE);
  }
  onDragEnter(event) {
    if(this.options.sink) this.dragEmitter.emit(ENTER);
  }
  onDragEnd() {
    this.dragged = false;
    this.dragEmitter.emit(ONEND);
  }
  onDragDrop(event) {
    event.preventDefault();
    if(this.options.sink) this.dragEmitter.emit(DROP);
    console.log('drop');
  }
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

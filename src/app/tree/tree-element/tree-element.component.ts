import {
  Component,
  EventEmitter,
  Host,
  Input,
  Output,
  OnInit,
  OnDestroy,
  ElementRef,
  Injector,
  trigger,
  state,
  animate,
  transition,
  style
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { Observable } from 'rxjs';

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
    '(dragstart)':    'this.dragged = true; dragEmitter.emit({ event: $event, component: this })',
    '(dragover)':     '$event.preventDefault(); dragEmitter.emit({ event: $event, component: this })',
    '(dragleave)':    'dragEmitter.emit({ event: $event, component: this })',
    '(dragenter)':    'dragEmitter.emit({ event: $event, component: this })',
    '(dragend)':      'this.dragged = false; dragEmitter.emit({ event: $event, component: this })',
    '(drop)':         'dragEmitter.emit({ event: $event, component: this })',
    '[draggable]':    'draggable',
    '[class.dragged]':'dragged',
    'tabindex': '1',
    //'(focus)':'focus($event)',
    '(focusout)':'blur($event)',
    '[class.active]':'options.expand && focused'
  },
  animations:[
    trigger('confirmActive', [
      state('active', style({opacity: 1})),
      state('inactive', style({opacity: 0})),
      transition('active => inactive', animate('100ms')),
      transition('inactive => active', animate('250ms'))
    ])
  ]
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

  confirmActive: boolean = false;
  confirmMessage: string = 'Are you sure?';

  @Output() confirmSink: EventEmitter<any> = new EventEmitter();
  @Output() dragEmitter: EventEmitter<any> = new EventEmitter();

  constructor(
    private injector: Injector,
    public element: ElementRef,
    private router: Router,
    private route: ActivatedRoute
  ) {
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
    console.log('created');
  }
  ngOnDestroy() {
  }
  focus() {
    this.focused = true;
  }
  blur() {
    this.focused = false;
  }

  confirmPlacement() {
    this.confirmActive = true;
    this.confirmMessage = 'Some message.';

    return this.confirmSink.take(1).map(res=>{
      console.log('result...', res);
      return res;
    }).finally(()=>{
      this.confirmActive = false;
      this.confirmMessage = '';
    });
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
    console.log(this.router, this.route);
    this.router.navigate(['../edit', this.kind, this.data.data.id]);//, {relativeTo: this.route});
  }
}

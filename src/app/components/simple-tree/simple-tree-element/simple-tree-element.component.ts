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

export const SIMPLE_TREE_ELEMENT_SELECTOR = 'app-simple-tree-element';

@Component({
  selector: SIMPLE_TREE_ELEMENT_SELECTOR,
  templateUrl: './simple-tree-element.component.html',
  styleUrls: ['./simple-tree-element.component.less'],
  host: {
    '(dragstart)': 'drag.emit({event: $event, component: this})',
    '(dragover)':  'drag.emit({event: $event, component: this})',
    '(dragleave)': 'drag.emit({event: $event, component: this})',
    '(dragenter)': 'drag.emit({event: $event, component: this})',
    '(dragend)':   'drag.emit({event: $event, component: this})',
    '(drop)':      'drag.emit({event: $event, component: this})',
    '[attr.draggable]': 'draggable'
  }
})
export class SimpleTreeElementComponent implements OnInit, OnChanges {
  @Input() public data: any = {};
  @Output() nameClicked = new EventEmitter();
  @Output() drag = new EventEmitter();
  @Output() collapse = new EventEmitter();

  draggable: boolean = false;

  constructor(
    private injector: Injector,
    public elementRef: ElementRef
  ) {
    this.data = this.injector.get('data');
  }

  ngOnInit() {}

  ngOnChanges(changes) {
  }
  
  setDraggable(val) {
    this.draggable = val;
  }
}

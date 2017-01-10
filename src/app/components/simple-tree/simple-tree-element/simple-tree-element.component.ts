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
  styleUrls: ['./simple-tree-element.component.less']
})
export class SimpleTreeElementComponent implements OnInit, OnChanges {
  @Input() public data: any = {};
  @Output() edit = new EventEmitter();

  constructor(
    private injector: Injector,
    public elementRef: ElementRef
  ) {
    this.data = this.injector.get('data');

  }

  ngOnInit() { 
  }

  ngOnChanges(changes) {
    console.log('changes', changes);
  }

  onEdit() {
    this.edit.emit(this.data);
  }
}

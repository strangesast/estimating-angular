import {
  ElementRef,
  Component,
  OnChanges,
  Injector,
  OnInit,
  Input
} from '@angular/core';

export const SIMPLE_TREE_ELEMENT_SELECTOR = 'app-simple-tree-element';

@Component({
  selector: SIMPLE_TREE_ELEMENT_SELECTOR,
  templateUrl: './simple-tree-element.component.html',
  styleUrls: ['./simple-tree-element.component.less']
})
export class SimpleTreeElementComponent implements OnInit {
  @Input() data: any = {};

  constructor(
    private injector: Injector,
    public elementRef: ElementRef
  ) {
    this.data = this.injector.get('data');
  }

  ngOnInit() { }

}

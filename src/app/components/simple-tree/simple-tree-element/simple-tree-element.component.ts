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
export class SimpleTreeElementComponent implements OnInit, OnChanges {
  @Input() public data: any = {};

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

  typeToClass(type: string) {
    switch (type) {
      case 'component':
        return 'fa-cubes';
      case 'filter':
        return 'fa-filter';
      case 'job':
        return 'fa-truck';
      case 'folder':
        return 'fa-folder-o';
      default:
        return 'fa-question';
    }
  }
}

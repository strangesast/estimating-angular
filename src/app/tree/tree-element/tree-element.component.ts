import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  Injector
} from '@angular/core';

@Component({
  selector: 'app-tree-element',
  templateUrl: './tree-element.component.html',
  styleUrls: ['./tree-element.component.less']
})
export class TreeElementComponent implements OnInit, OnDestroy {
  data: any = {};

  constructor(private injector: Injector, public element: ElementRef) {
    this.data = this.injector.get('data');
  }

  ngOnInit() {
  }
  ngOnDestroy() {
    console.log('destroyed');
  }
}

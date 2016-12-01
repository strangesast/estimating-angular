import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ElementRef,
  Injector
} from '@angular/core';

import { Child, Folder } from '../../classes';

@Component({
  selector: 'app-tree-element',
  templateUrl: './tree-element.component.html',
  styleUrls: ['./tree-element.component.less']
})
export class TreeElementComponent implements OnInit, OnDestroy {
  data: any = {};
  kind: string = 'unknown';

  constructor(private injector: Injector, public element: ElementRef) {
    this.data = this.injector.get('data');
    if(this.data.data instanceof Folder) {
      this.kind = 'folder';
    } else if (this.data.data instanceof Child) {
      this.kind = 'component';
    }
  }

  ngOnInit() {
  }
  ngOnDestroy() {
  }
}

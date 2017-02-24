import { Input, ElementRef, Component, Injector, OnInit, OnChanges } from '@angular/core';

export const ListElementComponentSelector = 'app-list-element';

@Component({
  selector: ListElementComponentSelector,
  templateUrl: './list-element.component.html',
  styleUrls: ['./list-element.component.less']
})
export class ListElementComponent implements OnInit, OnChanges {
  @Input() data;

  constructor(injector: Injector, public elementRef: ElementRef) {
    this.data = injector.get('data');
  }

  ngOnInit() {
  }

  ngOnChanges() {
  }

}

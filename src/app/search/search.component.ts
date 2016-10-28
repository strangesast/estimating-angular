import { Component, OnInit } from '@angular/core';

const AVAILABLE_FILTERS: string[] = ['building', 'phase', 'component', 'part'];

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.less']
})
export class SearchComponent implements OnInit {
  query: string = '';
  filters: string[] = [];

  constructor() { }

  ngOnInit() {
  }

  removeFilter(filter: string): void {
    let index = this.filters.indexOf(filter);
    if(index == -1) return;
    this.filters.splice(index, 1);
  }

  onKeyDown(event): void {
    if(event.key == 'Backspace' && this.query == '') {
      this.filters.pop()
    }
  }
  onInput(): void {
    for(let i=0; i < AVAILABLE_FILTERS.length; i++) {
      if((this.query == AVAILABLE_FILTERS[i] + ':') && (this.filters.indexOf(AVAILABLE_FILTERS[i]) == -1)) {
        this.query = '';
        this.filters.push(AVAILABLE_FILTERS[i]);
        break;
      }
    }
  }
}

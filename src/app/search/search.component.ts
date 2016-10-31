import { Component, OnInit } from '@angular/core';

import { SearchServiceService } from '../search-service.service';

import { Filter, AVAILABLE_FILTERS } from '../filter';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.less']
})
export class SearchComponent implements OnInit {
  query: string = '';

  constructor(private searchService: SearchServiceService) {
    this.query = searchService.query.getValue();
  }

  ngOnInit() {
  }

  removeFilter(filter: string): void {
    this.searchService.removeFilter(filter);
  }

  onKeyDown(event): void {
    if(event.key == 'Backspace' && this.query == '') {
      this.searchService.removeLastFilter();
    }
  }
  onInput(): void {
    let q = this.query;
    if(q.endsWith(':')) {
      for(let i=0; i < AVAILABLE_FILTERS.length; i++) {
        if(AVAILABLE_FILTERS[i].value == q.substring(0, q.length-1)) {
          if(this.searchService.addFilter(AVAILABLE_FILTERS[i].value) != null) {
            this.query = '';
            break;
          }
        }
      }
    }
    this.searchService.query.next(this.query);
  }
}

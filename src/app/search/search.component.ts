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

  constructor(private searchService: SearchServiceService) { }

  ngOnInit() {
    this.searchService.init();
    this.searchService.results.subscribe(arr => {
      //this.query = this.searchService.query.getValue();
    });
    this.searchService.filters.subscribe(arr => {
      console.log('filters', arr);
      let q = this.searchService.query.getValue();
      console.log('query', q);
      this.query = q;
    });
  }

  filterFilter():void {
    this.searchService.filterFilter();
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
    this.searchService.query.next(q);
  }
}

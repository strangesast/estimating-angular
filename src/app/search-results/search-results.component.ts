import { Component, OnInit } from '@angular/core';
import { Observable }        from 'rxjs/Observable';
import { SortablejsOptions } from 'angular-sortablejs';

import { SearchServiceService } from '../search-service.service';

import { Result } from '../result';
import { Filter } from '../filter';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.less']
})
export class SearchResultsComponent implements OnInit {
  //results: Observable<Result[]>;

  constructor(private searchService: SearchServiceService) { }

  ngOnInit() {
  }

  addFilter(filter: Filter): void {
    this.searchService.addFilter(filter.value);
  }

  add(result: Result) {
    this.searchService.addToJob(result);
  }

}

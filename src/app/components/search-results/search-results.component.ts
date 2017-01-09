import { Component, OnInit } from '@angular/core';
import { Observable }        from 'rxjs/Observable';

import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.less']
})
export class SearchResultsComponent implements OnInit {
  //results: Observable<Result[]>;

  constructor(private searchService: SearchService) { }

  ngOnInit() {
  }

}

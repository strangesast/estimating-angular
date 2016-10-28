import { Component, OnInit } from '@angular/core';

const RESULTS = [
  {
    name: 'Result 1'
  },
  {
    name: 'Result 2'
  },
  {
    name: 'Result 3'
  },
  {
    name: 'Result 4'
  }
]


@Component({
  selector: 'app-search-results',
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.less']
})
export class SearchResultsComponent implements OnInit {
  results: any[];

  constructor() { }

  ngOnInit() {
    this.results = RESULTS;
  }

}

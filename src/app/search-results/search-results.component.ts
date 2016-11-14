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

  options: SortablejsOptions = {
    animation: 150,
    group: {
      name: 'elements', pull: 'clone', put: false
    },
    draggable: '.search-result',
    filter: '.nodrag',
    sort: false,
    //onChoose: (evt) =>{
    //  console.log('choose');
    //},
    onStart: (evt) =>{
      console.log('start');
    },
    onEnd: (evt) =>{
      console.log('end');
    },
    onAdd: (evt) =>{
      console.log('add');
    },
    onUpdate: (evt) =>{
      console.log('update');
    },
    onSort: (evt) =>{
      console.log('sort');
    },
    onRemove: (evt) =>{
      console.log('remove');
    },
    onFilter: (evt) =>{
      console.log('filter');
    },
    onMove: (evt) =>{
      // placement checking here
      return evt.related.className.indexOf('tree-element') !== -1;
    },
    //onClone: (evt) =>{
    //  console.log('clone');
    //}
  }

  addFilter(filter: Filter): void {
    this.searchService.addFilter(filter.value);
  }

  add(result: Result) {
    this.searchService.addToJob(result);
  }

}

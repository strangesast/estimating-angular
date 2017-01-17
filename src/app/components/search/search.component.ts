import { Component, OnInit } from '@angular/core';

import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.less']
})
export class SearchComponent implements OnInit {
  query: string = '';

  constructor(private searchService: SearchService ) { }

  ngOnInit() {}
}

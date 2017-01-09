import { OnInit, Component } from '@angular/core';

import { HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';

import { SearchService } from '../services/search.service';

const TEST_DATA = {
  name: 'taost',
  description: 'test',
  children: [
    {
      name: 'toast toatws toast',
      description: 'test test',
      children: []
    }
  ]
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {
  title = 'Estimating';

  results: any[] = [];
  searchNode: HierarchyNode<any> = hierarchy(TEST_DATA);

  constructor(private searchService: SearchService) { }

  ngOnInit() {
    this.searchService.results.subscribe(results => {
      this.results = results;
    });
  }

}

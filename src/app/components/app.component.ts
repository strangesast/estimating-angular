import { OnInit, Component } from '@angular/core';

import { HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';

import { ReplaySubject } from 'rxjs';

import { DragService } from '../services/drag.service';
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

  results: ReplaySubject<any[]>;

  constructor(private searchService: SearchService, private dragService: DragService) { }

  ngOnInit() {
    this.results = this.searchService.results;
  }

  handleDrag(evt) {
    this.dragService.handle(evt);
  }
}

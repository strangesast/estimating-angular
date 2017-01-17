import { OnInit, Component } from '@angular/core';

import { FormGroup, FormBuilder } from '@angular/forms';

import { HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';

import { Subject, Observable, BehaviorSubject, ReplaySubject } from 'rxjs';

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

  results = new Subject();
  searchForm: FormGroup;

  searchFocused: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(private searchService: SearchService, private dragService: DragService, private formBuilder: FormBuilder) { }

  ngOnInit() {
    //this.results = this.searchService.results;
    this.searchForm = this.formBuilder.group({
      query: ''
    });

    this.searchForm.valueChanges.debounceTime(100).startWith({query: ''}).switchMap(({query}) => {
      if(query) {
        return this.searchService.search(query);
      } else {
        return this.searchService.results;
      }
    }).subscribe(this.results);
    //this.searchForm.valueChanges.debounceTime(100).switchMap(this.searchService.search.bind(this.searchService)).subscribe(this.results);
  }

  handleDrag(evt) {
    this.dragService.handle(evt);
  }

}

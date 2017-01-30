import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { SearchService } from '../../services/search.service';

import { Subject, BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['../../styles/general.less', './workspace.component.less']
})
export class WorkspaceComponent implements OnInit {
  results = new Subject();
  defaults = new Subject();

  treeConfig = {
    properties: ['name']
  };

  searchForm: FormGroup;

  searchFocused: BehaviorSubject<boolean> = new BehaviorSubject(false);

  constructor(private searchService: SearchService, private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.searchForm = this.formBuilder.group({
      query: ''
    });

    this.searchForm.valueChanges.debounceTime(10).startWith({query: ''}).switchMap(({query}) => {
      if(query) {
        return this.searchService.search(query);
      } else {
        return this.searchService.results;
      }
    }).subscribe(this.results);
  }

}

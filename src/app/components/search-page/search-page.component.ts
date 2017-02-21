import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AbstractControl, ValidatorFn, FormBuilder, FormGroup } from '@angular/forms';

import { Subject, Observable, Subscription } from 'rxjs';

import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-search-page',
  templateUrl: './search-page.component.html',
  styleUrls: ['../../styles/general.less', './search-page.component.less']
})
export class SearchPageComponent implements OnInit {
  advancedSearchVisible: boolean = false;

  searchSubscription: Subscription;
  searchForm: FormGroup;
  results: Subject<any[]>;

  constructor(private formBuilder: FormBuilder, private route: ActivatedRoute, private searchService: SearchService) { }

  ngOnInit() {
    this.searchForm = this.formBuilder.group({
      query: '',
      elementType: ''
    });

    this.results = new Subject();
    this.searchSubscription = this.searchService.searchSubject(this.searchForm.valueChanges).subscribe(this.results);
  }

  clearSearch() {
    this.searchForm.patchValue({ query: '' });
  }

}

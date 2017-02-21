import { Component, OnInit, OnChanges } from '@angular/core';
import { AbstractControl, ValidatorFn, FormBuilder, FormGroup } from '@angular/forms';

import { SearchService } from '../../services/search.service';
import { DataService } from '../../services/data.service';

import { Subscription, Observable, Subject, BehaviorSubject } from 'rxjs';

import { PART_TYPES, PART_KINDS } from '../../resources/names';

function inArrayValidator(arr: string[]): ValidatorFn {
  return (control: AbstractControl) => {
    let kind = control.value
    return arr.indexOf(kind) == -1 ? { inArrayValidator: true } : null;
  };
}

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['../../styles/general.less', './workspace.component.less']
})
export class WorkspaceComponent implements OnInit {
  results = new Subject();
  defaults = new Subject();

  kinds = PART_KINDS;
  types = PART_TYPES;
  collections;

  collapsed: boolean = true;
  wideSearch: boolean = false;

  advancedSearchVisible: boolean = false;

  treeConfig = {
    properties: ['name']
  };

  searchForm: FormGroup;
  searchFormSubscription: Subscription;

  searchFocused: BehaviorSubject<boolean> = new BehaviorSubject(false);

  searchPageResults: BehaviorSubject<any[]> = new BehaviorSubject([]);

  constructor(private searchService: SearchService, private formBuilder: FormBuilder, private db: DataService) { }

  async ngOnInit() {
    let db = this.db;
    this.collections = await db.collections.toArray();

    this.searchForm = this.formBuilder.group({
      query: '',
      elementType: ''
    });

    this.initForm(this.searchForm);
  }

  initForm(formGroup) {
    if (this.searchFormSubscription) this.searchFormSubscription.unsubscribe();

    let changes = formGroup.valueChanges;

    let onReset = changes.map(({elementType}) => elementType).startWith(formGroup.value.elementType).distinctUntilChanged().skip(1).take(1).subscribe(elementType => {
      let group: any = {
        query: this.searchForm && this.searchForm.value.query || '',
        elementType
      };
      if (elementType == '') {

      } else if (elementType == 'catalog') {
        group.attributes = this.formBuilder.group({
          kind: ['', inArrayValidator(this.kinds)],
          type: ['', inArrayValidator(this.types)],
          manufacturer: '',
          active: null
        });

      } else if (elementType == 'folder') {
        group.attributes = this.formBuilder.group({
          type: '',
          collection: ['', inArrayValidator(this.collections)],
        });

      } else if (elementType == 'component') {
        group.attributes = this.formBuilder.group({
          collection: ['', inArrayValidator(this.collections)],
        });

      }
      this.searchForm = this.formBuilder.group(group);
      this.initForm(this.searchForm);
    });

    let s = changes.debounceTime(100).startWith(formGroup.value);

    let stream = this.searchService.searchSubject(changes).subscribe(this.results);

    s.catch(err => {
      return Observable.never();
    }).subscribe();
    
    /*
    this.searchFormSubscription = s.switchMap(({query}) => {
      if(query) {
        return this.searchService.search(query);
      } else {
        return this.searchService.results;
      }
    }).subscribe(this.results);
    */
  }

  toggleSearch(close?) {
    if (close == undefined) close = !this.collapsed;
    if (close) {
      this.wideSearch = false;
      this.collapsed = true;
    } else {
      this.collapsed = false;
    }
  }

  clearSearch() {
    this.searchForm.patchValue({ query: '' });
  }

  resetForm() {
    this.searchForm = this.formBuilder.group({
      query: this.searchForm && this.searchForm.value.query || '',
      elementType: ''
    });
    this.initForm(this.searchForm);
  }

  ngOnChanges(changes) {}

}

import {
  Input,
  Component,
  OnInit,
  OnDestroy,
  OnChanges,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import {
  Subject,
  Observable,
  Subscription,
  BehaviorSubject
} from 'rxjs';

import { Nest } from 'd3';

import { NestComponent } from '../nest/nest.component';

import { JobService } from '../../services/job.service';
import { ChildElement, FolderElement, ComponentElement, NestConfig, Collection, TreeConfig, Filter } from '../../models';

function methodToSymbol(name: string) {
  switch(name) {
    case 'greaterThan':
      return '>';
    case 'lessThan':
      return '<';
    case 'equal':
      return '=';
    default:
      return name;
  }
}

@Component({
  selector: 'app-build-page',
  templateUrl: './build-page.component.html',
  styleUrls: ['./build-page.component.less']
})
export class BuildPageComponent implements OnInit, OnDestroy {
  private job: Collection;
  private jobSubject: BehaviorSubject<Collection>;
  private jobSubscription: Subscription;

  private filterSuggestions: any[] = [];
  private filterSuggestionsSubject: BehaviorSubject<any[]> = new BehaviorSubject([]);
  private filterFocused: BehaviorSubject<boolean> = new BehaviorSubject(false);

  //private nestEnabled: boolean = false;
  private folderEnabled: string = '';

  private trees: any[];
  private treesSubject: BehaviorSubject<any>;

  public filters: Filter[];

  public nest: { entries: any[], keys: any[], config: NestConfig };
  private nestConfig: NestConfig;
  private nestConfigSubject: BehaviorSubject<NestConfig>;
  private nestSubject: BehaviorSubject<any>

  private filterForm: FormGroup;

  @ViewChild(NestComponent) nestComponent: NestComponent;

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({ job: { collection, collectionSubject, nestConfigSubject, nestSubject } }) => {
      this.jobSubject = collectionSubject;
      this.job = collection;
      this.jobSubject.skip(1).subscribe(job => this.job = job);

      this.nestConfigSubject = nestConfigSubject;
      this.nestConfigSubject.subscribe(nestConfig => {
        let aa = nestConfig.filters.map(f => Object.assign({}, f, { affects: ['all'] }));
        let af = (<any>nestConfig.folders).order(name => nestConfig.folders.filters[name].map(f => Object.assign({}, f, { affects: [name] })));
        let ac = nestConfig.component.filters.map(f => Object.assign({}, f, { affects: ['all'] }));

        let filters = [].concat(aa, ...af, ac);
        for(let i = 0; i < filters.length; i++) {
          let f = filters[i];
          let other = filters.filter(_f => (_f != f) && (_f.type == f.type && _f.value == f.value));
          for(let j = 0; j < other.length; j ++) {
            let v = other[j];
            f.affects.push(v.affects[0]);
            filters.splice(i, 1)
            i--;
          }
        }
        console.log('filters', filters);
        this.nestConfig = nestConfig;
      });

      this.nestSubject = nestSubject;
      this.nestSubject.subscribe(nest => this.nest = nest);
    });
    /*
    console.log('data', this.route.parent.data);
    this.route.parent.data.subscribe(({job: { job: jobSubject, nest: nestSubject, nestConfig, trees }}) =>{
      this.nestConfigSubject = nestConfig;
      console.log('nestconfig', nestConfig);
      this.nestConfigSubject.subscribe(config => {
        let folderFilters = config.folders.order.map(name => config.folders.filters[name].map(f => {
          f.affects = [name];
          return f;
        })).reduce((a, b) => a.concat(b), []);
        let componentFilters = config.component.filters.map(f => {
          f.affects = ['component'];
          return f;
        });
        let generalFilters = config.filters.map(f => {
          f.affects = ['all'];
          return f;
        });
        this.filters = [].concat(
          componentFilters,
          folderFilters,
          generalFilters
        );
        this.nestConfig = config
      });

      this.filterForm = this.formBuilder.group({
        query: ''
      });

      Observable.combineLatest(
        this.filterFocused.switchMap(b => b ? Observable.of(b) : Observable.of(b).delay(500)).distinctUntilChanged(), // delay a bit if unfocusing
        this.filterForm.valueChanges.debounceTime(100),
        this.nestConfigSubject
      ).switchMap(this.queryFilter.bind(this)).subscribe(this.filterSuggestionsSubject)

      console.log('fsubject', this.filterSuggestionsSubject);
      this.filterSuggestionsSubject.subscribe(arr => this.filterSuggestions = arr);

      this.nestSubject = nestSubject;
      this.jobSubject = jobSubject;
      this.jobSubscription = this.jobSubject.subscribe(job => {
        this.job = job;
      }); this.treesSubject = trees;
      this.treesSubject.subscribe((trees) => {
        this.trees = trees;
      });
    });
    */
  }

  ngOnDestroy() {
    this.jobSubscription.unsubscribe();
  }

  toggleFolderVisibility(folderName: string, multiple=false) {
    let config = this.nestConfigSubject.getValue();
    let isEnabled = config.folders.enabled[folderName];
    let otherFolderEnabled = Object.keys(config.folders.enabled).filter(n=>n !== folderName ? config.folders.enabled[n] : false).length;
    let componentEnabled = config.component.enabled;

    // if other folder or component is enabled, enable this

    if(!multiple) {
      if(otherFolderEnabled || componentEnabled) {
        Object.keys(config.folders.enabled).forEach(n => config.folders.enabled[n] = false);
        config.component.enabled = false;
        config.folders.enabled[folderName] = true;
      }

    } else {
      if (!isEnabled || otherFolderEnabled || componentEnabled) {
        // disable other folders if enabling this one
        if(!isEnabled && !componentEnabled) Object.keys(config.folders.enabled).forEach(n=>folderName != config.folders.enabled[n] ? config.folders.enabled[n] = false : false);
        // toggle this
        config.folders.enabled[folderName] = !isEnabled;
      }
    }
    this.nestConfigSubject.next(config);
  }

  toggleComponentVisibility(multiple=false) {
    let config = this.nestConfigSubject.getValue();
    let isEnabled = config.component.enabled;
    let foldersEnabled = Object.keys(config.folders.enabled).filter(n=>config.folders.enabled[n]).length;
    if(!multiple) {
      Object.keys(config.folders.enabled).forEach(n => config.folders.enabled[n] = false) // always disable folders
      if(!isEnabled && foldersEnabled) {
        config.component.enabled = !isEnabled;
      }

    } else {
      config.component.enabled = foldersEnabled ? !isEnabled : true;
      // if disabling components, exactly one folder must be enabled
      if (!config.component.enabled && !foldersEnabled) return;
      if (!config.component.enabled && foldersEnabled > 1) {
        Object.keys(config.folders.enabled).forEach(n=>config.folders.enabled[n] = false);
        // enable at least one folder
        config.folders.enabled[this.job.folders.order[0]] = true;
      }
    }
    this.nestConfigSubject.next(config);
  }

  filterActive(filter) {
    let types = filter.affects;
    let config = this.nestConfigSubject.getValue();
    let enabledFolders = Object.keys(config.folders.enabled).filter(n=>config.folders.enabled[n])
    let enabledComponent = config.component.enabled ? ['component'] : [];
    return types.some(type => type == 'all' || [].concat(enabledFolders, enabledComponent).indexOf(type) > -1);
  }

  componentEdit(evt) {
    this.jobService.openElement(evt.data);
  }

  queryFilter([focused, { query }, config]:[boolean, any, NestConfig]) {
    if(!focused || !query) return Observable.of([]);
    query = query.trim();

    let affects = config.folders.order.filter(name => config.folders.enabled[name])
    if (config.component.enabled) affects.push('component');
    if (affects.length == config.folders.order.length + 1) affects = ['all'];

    let arr:Filter[] = [];

    
    // not a decimal number
    if(isNaN(query) || Number(query) % 1 === 0) {
      arr.unshift(...['startsWith', 'includes', 'endsWith'].map(method => ['name', 'description'].map(prop => {
        return { type: 'property', property: prop, method, value: query, affects, display: [prop, methodToSymbol(method)].join(' ') };
      })).reduce((a, b)=>a.concat(b)));
    }

    // a number + component enabled
    if(config.component.enabled && !isNaN(query)) {
      let n = Number(query);

      let props = ['buy', 'sell'];
      if(n % 1 === 0) props.push('qty');

      arr.unshift(...props.map(prop => ['greaterThan', 'lessThan', 'equal'].map(method => {
        return { type: 'property', property: prop, method, value: query, affects: ['component'], display: [prop, methodToSymbol(method)].join(' ') }
      })).reduce((a, b)=>a.concat(b)));
    }

    let emptyFolders = { type: 'emptyFolders', display: 'show empty folders', value: true, affects: config.folders.order };
    if(emptyFolders.display.includes(query)) arr.unshift(emptyFolders);

    return Observable.of(arr);
  }

  addFilter(filter: Filter) {
    this.jobService.addFilter(filter);
    this.filterForm.setValue({query: ''});
  }

  removeFilter(filter: Filter) {
    let i = this.filters.indexOf(filter);
    if(i == -1) return;
    this.filters.splice(i, 1);
    this.jobService.removeFilter(filter);
  }

  filterFormSubmit() {
    if(this.filterSuggestions.length) {
      this.addFilter(this.filterSuggestions[0]);
    }
  }

  handleDrop({dropped, on}) {
    return this.jobService.addChildElement(on, dropped)
  }
}

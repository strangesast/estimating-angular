import {
  Input,
  Component,
  OnInit,
  OnDestroy,
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

import { JobService } from '../../services/job.service';
import { TreeComponent } from '../tree/tree.component';
import { Child, ComponentElement, NestConfig, Collection, TreeConfig, Filter } from '../../models/classes';

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
  styleUrls: ['./build-page.component.less'],
  providers: [TreeComponent]
})
export class BuildPageComponent implements OnInit, OnDestroy {
  private job: Collection;
  private jobSubject: BehaviorSubject<Collection>;
  private jobSubscription: Subscription;

  private filterSuggestions: any[] = [];
  private filterSuggestionsSubject: BehaviorSubject<any[]> = new BehaviorSubject([]);
  private filterFocused: BehaviorSubject<boolean> = new BehaviorSubject(false);

  private nestEnabled: boolean = false;
  private folderEnabled: string = '';

  private trees: any[];
  private treesSubject: BehaviorSubject<any>;

  public filters: Filter[];

  private nestConfig: NestConfig;
  private nestConfigSubject: BehaviorSubject<NestConfig>;
  private nestSubject: BehaviorSubject<Nest<any, any>>;

  private filterForm: FormGroup;

  public FOLDER_ICONS = {
    phase: 'fa fa-bookmark-o fa-lg',
    building: 'fa fa-building-o fa-lg',
    component: 'fa fa-cubes fa-lg'
  };

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({job: { job: jobSubject, nest: nestSubject, nestConfig, trees }}) =>{
      this.nestConfigSubject = nestConfig;
      this.nestConfigSubject.subscribe(config => {
        this.filters = [].concat(
          config.component.filters.map(f=>Object.assign(f, { affects: ['component']})),
          Object.keys(config.folders.filters).map(name => config.folders.filters[name].map(f => Object.assign(f, { affects: [name] }))).reduce((a, b)=>a.concat(b)),
          config.filters.map(f=>Object.assign(f, { affects: ['all'] }))
        );

        this.nestConfig = config

        if(config.component.enabled) {
          // enable nest, disable tree
          this.nestEnabled = true;
          this.folderEnabled = '';

        } else {
          // disable nest, enable tree
          let name = Object.keys(config.folders.enabled).find(n=>config.folders.enabled[n]);
          this.folderEnabled = name;
          this.nestEnabled = false;
        }
      });

      this.filterForm = this.formBuilder.group({
        query: ''
      });

      Observable.combineLatest(
        this.filterFocused.switchMap(b => b ? Observable.of(b) : Observable.of(b).delay(500)).distinctUntilChanged(), // delay a bit if unfocusing
        this.filterForm.valueChanges.debounceTime(100),
        this.nestConfigSubject
      ).switchMap(this.queryFilter.bind(this)).subscribe(this.filterSuggestionsSubject)

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
  }

  ngOnDestroy() {
    this.jobSubscription.unsubscribe();
  }

  toggleFolderVisibility(folderName: string, multiple=false) {
    let val = this.nestConfigSubject.getValue();
    let isEnabled = val.folders.enabled[folderName];
    let otherFolderEnabled = Object.keys(val.folders.enabled).filter(n=>n !== folderName ? val.folders.enabled[n] : false).length;
    let componentEnabled = val.component.enabled;

    // if other folder or component is enabled, enable this

    if(!multiple) {
      if(otherFolderEnabled || componentEnabled) {
        Object.keys(val.folders.enabled).forEach(n => val.folders.enabled[n] = false);
        val.component.enabled = false;
        val.folders.enabled[folderName] = true;
        this.nestConfigSubject.next(val);
      }
      return;
    }

    if (!isEnabled || otherFolderEnabled || componentEnabled) {
      // disable other folders if enabling this one
      if(!isEnabled && !componentEnabled) Object.keys(val.folders.enabled).forEach(n=>folderName != val.folders.enabled[n] ? val.folders.enabled[n] = false : false);
      // toggle this
      val.folders.enabled[folderName] = !isEnabled;
      this.nestConfigSubject.next(val);
    }
  }

  toggleComponentVisibility(multiple=false) {
    let val = this.nestConfigSubject.getValue();
    let isEnabled = val.component.enabled;
    let foldersEnabled = Object.keys(val.folders.enabled).filter(n=>val.folders.enabled[n]).length;
    if(!multiple) {
      Object.keys(val.folders.enabled).forEach(n => val.folders.enabled[n] = false) // always disable folders
      if(!isEnabled && foldersEnabled) {
        val.component.enabled = !isEnabled;
      }
      this.nestConfigSubject.next(val);
      return;
    }
    val.component.enabled = foldersEnabled ? !isEnabled : true;
    // if disabling components, exactly one folder must be enabled
    if (!val.component.enabled && !foldersEnabled) return;
    if (!val.component.enabled && foldersEnabled > 1) {
      Object.keys(val.folders.enabled).forEach(n=>val.folders.enabled[n] = false);
      // enable at least one folder
      val.folders.enabled[this.job.folders.order[0]] = true;
    }
    this.nestConfigSubject.next(val);
  }

  filterActive(types: string[]) {
    let config = this.nestConfig;
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

      let props = ['price'];
      if(n % 1 === 0) props.push('qty');

      arr.unshift(...props.map(prop => ['greaterThan', 'lessThan', 'equal'].map(method => {
        return { type: 'property', property: prop, method, value: query, affects: ['component'], display: [prop, methodToSymbol(method)].join(' ') }
      })).reduce((a, b)=>a.concat(b)));
    }
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
    if (on instanceof Child) {
      if (dropped instanceof ComponentElement) {
        Promise.all([
          this.jobService.retrieveElement(dropped),
          this.jobService.retrieveElement(on)
        ]).then(([_dropped, _on]) => {
          return this.jobService.addChild(_on, _dropped).then(res => console.log('res', res));
        });
      }
    }
  }
}

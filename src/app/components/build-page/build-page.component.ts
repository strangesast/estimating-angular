import {
  Input,
  Component,
  SimpleChanges,
  OnInit,
  OnDestroy,
  OnChanges
} from '@angular/core';
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
import { NestConfig, Collection, TreeConfig } from '../../models/classes';

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

  private trees: any[];
  private treesSubject: BehaviorSubject<any>;

  private filters = [
    {
      name: 'All',
      affects: ['all']
    },
    {
      name: 'Phase Only',
      affects: ['phase']
    },
    {
      name: 'Building Only',
      affects: ['building']
    },
    {
      name: 'Folders',
      affects: ['building', 'phase']
    },
    {
      name: 'Component Only',
      affects: ['component']
    }
  ];

  private nestConfig: NestConfig;
  private nestConfigSubject: BehaviorSubject<NestConfig>;
  private nestSubject: BehaviorSubject<Nest<any, any>>;

  public FOLDER_ICONS = {
    phase: 'fa fa-bookmark-o fa-lg',
    building: 'fa fa-building-o fa-lg',
    component: 'fa fa-cubes fa-lg'
  };

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({job: { job: jobSubject, nest: nestSubject, nestConfig, trees }}) =>{
      this.nestConfigSubject = nestConfig;
      this.nestConfigSubject.subscribe(config => {
        this.nestConfig = config

        if(config.component.enabled && Object.keys(config.folders.enabled).filter(n=>config.folders.enabled[n]).length) {
          // enable nest, disable tree
          console.log('nest')

        } else {
          // disable nest, enable tree
          let name = Object.keys(config.folders.enabled).find(n=>config.folders.enabled[n]) || 'component';
          console.log('tree: name', name);
        }
      });
      this.nestSubject = nestSubject;
      this.jobSubject = jobSubject;
      this.jobSubscription = this.jobSubject.subscribe(job => {
        this.job = job;
      });
      this.treesSubject = trees;
      this.treesSubject.subscribe((trees) => {
        console.log('trees updated');
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
    val.component.enabled = !isEnabled;
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
}

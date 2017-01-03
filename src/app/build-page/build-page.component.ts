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

import { TreeComponent }  from '../tree/tree.component';
import { TreeOptions }    from '../tree-options';
import { JobService }     from '../job.service';
import { defaultOptions } from '../defaults';
import { Collection, TreeConfig }      from '../classes';

@Component({
  selector: 'app-build-page',
  templateUrl: './build-page.component.html',
  styleUrls: ['./build-page.component.less', '../app.component.less'],
  providers: [TreeComponent]
})
export class BuildPageComponent implements OnInit, OnDestroy, OnChanges {
  private treeBuildSub: Subscription;
  private elSub: Subscription;
  private elements: any[] = [];

  private config: any = {};
  private sort: string = '';

  private enabled: any;
  private enabledSubject: BehaviorSubject<any>;

  private tree: any[];
  private treeSubject: BehaviorSubject<any[]>;
  private treeConfig: TreeConfig;
  private treeConfigSubject: BehaviorSubject<TreeConfig>;

  private treeOptions: TreeOptions = {
    expand: true,
    source: true,
    sink: true,
    reorder: true,
    sort: true,
    animationTime: 250
  };

  private job: Collection;

  public FOLDER_ICONS = {
    phase: 'fa fa-bookmark-o fa-lg',
    building: 'fa fa-building-o fa-lg',
    component: 'fa fa-cubes fa-lg'
  };

  objToArray(obj) {
    return Object.keys(obj);
  }

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({jobData:{job, tree, treeConfig}})=>{
      this.treeConfigSubject = treeConfig;
      this.treeSubject = tree;
      this.treeBuildSub = this.treeConfigSubject.switchMap(this.jobService.buildTree.bind(this.jobService)).subscribe(this.treeSubject);
      this.treeSubject.subscribe(tree => {
        console.log('tree', tree);
        this.tree = tree;
      })
      this.treeConfigSubject.subscribe(treeConfig => {
        this.treeConfig = treeConfig;
      });
    });
  }

  changeSort(sort: string) {
    this.jobService.changeSort(sort);
    this.sort = sort;
  }

  buildTree() {
    //return this.jobService.buildTree();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('changes', changes);
  }

  toggleEnabled(name:string) {
    let config = this.treeConfigSubject.getValue();
    if(name in config.roots || name == 'component') {
      let val = !config.enabled[name];
      if(val || Object.keys(config.enabled).map(n=>config.enabled[n]).filter(n=>!!n).length > 1) {
        config.enabled[name] = val;
        this.treeConfigSubject.next(config);
      }
    }
  }

  treeChanges(evt) {
    console.log('changes', evt);
  }

  ngOnDestroy() {
    this.treeBuildSub.unsubscribe();
  }
}

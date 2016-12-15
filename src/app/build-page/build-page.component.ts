import {
  Input,
  Component,
  SimpleChanges,
  OnInit,
  OnDestroy,
  OnChanges
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subscription } from 'rxjs';

import { TreeComponent }  from '../tree/tree.component';
import { TreeOptions }    from '../tree-options';
import { JobService }     from '../job.service';
import { defaultOptions } from '../defaults';
import { Job }            from '../classes';

@Component({
  selector: 'app-build-page',
  templateUrl: './build-page.component.html',
  styleUrls: ['./build-page.component.less', '../app.component.less'],
  providers: [TreeComponent]
})
export class BuildPageComponent implements OnInit, OnDestroy, OnChanges {
  private jobSub: Subscription;
  private elSub: Subscription;
  private elements: any[];

  private config: any = {};
  private enabled: any;
  private sort: string = '';

  private treeOptions: TreeOptions = {
    expand: true,
    source: true,
    sink: true,
    reorder: true,
    sort: true,
    animationTime: 250
  };

  private job: Job;

  private FOLDER_ICONS = {
    phase: 'fa fa-bookmark-o fa-lg',
    building: 'fa fa-building-o fa-lg',
    component: 'fa fa-cubes fa-lg'
  };

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.jobSub = this.route.parent.data.subscribe((data:any) => {
      let job = data.jobService.job;
      let elements = data.jobService.elements;

      let options = this.jobService.getOptions();
      this.enabled = options.enabled;

      this.job = job;
      this.elements = elements;
      //                       called by / updated by buildTree
      this.jobService.elements.skip(1).subscribe(elements => this.elements = elements);
    });
  }

  changeSort(sort: string) {
    this.jobService.changeSort(sort);
    this.sort = sort;
  }

  buildTree() {
    return this.jobService.buildTree();
  }

  ngOnChanges(changes: SimpleChanges) {
  }

  toggleEnabled(name:string) {
    let ne = !this.enabled[name];
    if(!ne && Object.keys(this.enabled).filter(k=>this.enabled[k]).length < 2) return false;
    let ob = {};
    ob[name] = ne;
    this.jobService.changeEnabled(ob);
    this.enabled[name] = ne;
  }

  ngOnDestroy() {
    this.jobSub.unsubscribe();
  }
}

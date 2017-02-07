import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  OnChanges, // used with input
  Inject,
  ElementRef,
  ViewChild
} from '@angular/core';

import {
  ActivatedRoute,
  Router,
  Params
} from '@angular/router';

import { Subscription, BehaviorSubject, Observable } from 'rxjs';

import { HierarchyNode } from 'd3';
import { hierarchy } from 'd3-hierarchy';
import * as D3 from 'd3';

import { SimpleTreeComponent } from '../simple-tree/simple-tree.component';
import { TreeComponent } from '../tree/tree.component';

import { ClassToStringPipe } from '../../pipes';

import {
  ComponentElement,
  FolderElement,
  TreeConfig,
  Collection
} from '../../models';

import { ElementService, SearchService, JobService } from '../../services';

const fragRe = /^(\w*)\/([\w-]*)$/;
const STATS_INIT = { buy: 0, sell: 0, childCnt: 0, componentCnt: 0, folderCnt: 0 };

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['../../styles/general.less', './project-page.component.less']
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private job: Collection;
  private jobSubject: BehaviorSubject<Collection>;
  private jobSubscription: Subscription;

  private nestSubscription: Subscription;

  public editWindowsEnabled: boolean = true;

  private stats:any = STATS_INIT;

  private openElementsSubject: BehaviorSubject<any>;
  private openElementIds: string[] = [];
  private openElements: any = {};

  constructor(
    private elementService: ElementService,
    private searchService: SearchService,
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.route.data.subscribe(({ job: { collectionSubject, openElements, nestSubject, editWindowsEnabled } }) => {
      editWindowsEnabled.subscribe(enabled => this.editWindowsEnabled = enabled);
      this.searchService.setJob(collectionSubject.getValue());
      this.jobSubscription = (this.jobSubject = collectionSubject).subscribe(collection => this.job = collection);

      (this.openElementsSubject = openElements).subscribe(els => {
        this.openElements = els;
        this.openElementIds = Object.keys(els).reverse();
      });

      this.nestSubscription = nestSubject.subscribe(({ keys, entries, config }) => {
        // TODO: improve efficiency of the following
        let nest = D3.nest();
        this.stats.folderCnt = keys.map(k => k.descendants().slice(1)).reduce((a, b)=> a+b.length, 0);

        if (config.component.enabled) {
          this.stats.childCnt = entries.length;
          this.stats.componentCnt = (<any>nest).rollup((d:any) => D3.map(d, (e:any)=> e.data.ref).size()).entries(entries)
        } else {
          Object.assign(this.stats, { childCnt: 0, componentCnt: 0 });
        }
        // could be done in the same rollup
        this.stats.buy =  nest.rollup(leaves => leaves.map((n:any) => n.sum(m => m.data ? m.data.buy  : 0)).reduce((a, b) => a + b.value, 0)).entries(entries);
        this.stats.sell = nest.rollup(leaves => leaves.map((n:any) => n.sum(m => m.data ? m.data.sell : 0)).reduce((a, b) => a + b.value, 0)).entries(entries);
      });
    });

    // open window on fragment change
    this.route.fragment.subscribe((frag) => {
      let match = fragRe.exec(frag);
      if(match) {
        let [_, kind, id] = match;
        return this.jobService.openElement(id, kind);
      } else if (typeof frag === 'string' && frag.startsWith('new')) {
        return this.jobService.selectedElementSubject.next(null);
      } else {
        this.jobService.selectedElementSubject.next(undefined);
      }
    });
  }

  ngAfterViewInit() {
  }

  ngOnChanges() {
  }

  ngOnDestroy() {
    this.jobSubscription.unsubscribe();
    this.nestSubscription.unsubscribe();
  }

  closeOpenElement(element) {
    this.jobService.closeOpenElement(element);
    this.router.navigate([], { fragment: null });
  }

}

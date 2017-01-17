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

import { ClassToStringPipe } from '../../pipes/pipes';

import {
  ComponentElement,
  FolderElement,
  TreeConfig,
  Collection
} from '../../models/classes';

import { ElementService } from '../../services/element.service';
import { SearchService } from '../../services/search.service';
import { JobService }     from '../../services/job.service';

@Component({
  selector: 'app-project-page',
  templateUrl: './project-page.component.html',
  styleUrls: ['./project-page.component.less'],
  providers: [ SimpleTreeComponent, ClassToStringPipe ]
})
export class ProjectPageComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {
  private job: Collection;
  private jobSubject: BehaviorSubject<Collection>;
  private jobSubscription: Subscription;

  public editWindowsEnabled: boolean = true;

  private stats:any = { componentCnt: 0, folderCnt: 0 };

  private openElementsSubject: BehaviorSubject<any>;
  private openElementIds: string[] = [];
  private openElements: any = {};

  constructor(
    private elementService: ElementService,
    private searchService: SearchService,
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private classToStringPipe: ClassToStringPipe
  ) { }

  ngOnInit() {
    this.route.data.subscribe(({job: { job: jobSubject, openElements, nest, nestConfig, trees }}) => {
      this.jobSubject = jobSubject;
      this.jobSubscription = this.jobSubject.subscribe(job => {
        this.searchService.setJob(job);
        this.job = job;
      });

      this.openElementsSubject = openElements;
      this.openElementsSubject.subscribe(els => {
        this.openElements = els;
        this.openElementIds = Object.keys(els).reverse();
      });


      let [folderCount, nestCount] = nestConfig.map(config => {
        if(config.component.enabled) return ''
        return config.folders.order.find(n => config.folders.enabled[n]);
      }).distinctUntilChanged().partition(x=>x!=='');

      nestCount.switchMap(x => nest).subscribe(({ keys, entries }) => {
        let nest = D3.nest();
        this.stats.folderCnt = keys.map(k => k.descendants()).reduce((a, b)=> a+b.length, 0);
        this.stats.childCnt = entries.length;
        this.stats.componentCnt = (<any>nest).rollup((d:any) => D3.map(d, (e:any)=> e.data.ref).size()).entries(entries)

        // could be done in the same rollup
        this.stats.buy =  nest.rollup(leaves => leaves.map((n:any) => n.sum(m => m.data ? m.data.buy  : 0)).reduce((a, b) => a + b.value, 0)).entries(entries);
        this.stats.sell = nest.rollup(leaves => leaves.map((n:any) => n.sum(m => m.data ? m.data.sell : 0)).reduce((a, b) => a + b.value, 0)).entries(entries);
      });

      folderCount.withLatestFrom(trees).switchMap(([folder, trees]) => {
        return trees[folder];
      }).subscribe(res => {
        this.stats.folderCnt = res.descendants().length;
        this.stats.childCnt = 0;
        this.stats.componentCnt = 0;
      })
    });

    this.route.fragment.subscribe((frag) => {
      if(frag) {
        let [kind, id] = frag.split('/');
        let _class = this.classToStringPipe.transform(kind);
        return this.jobService.retrieveElement(id, _class).then((element: any) => {
          if(element) {
            return this.jobService.openElement(element);
          } else {
            // removed / doesn't exist
          }
        });
      }
    });
  }

  ngAfterViewInit() {
  }

  ngOnChanges() {
  }

  ngOnDestroy() {
    this.jobSubscription.unsubscribe();
  }

  closeOpenElement(element) {
    this.jobService.closeOpenElement(element);
    this.router.navigate([], { fragment: null });
  }

}

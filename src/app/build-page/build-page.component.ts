import { Component, OnInit, OnDestroy } from '@angular/core';

import { TreeElement } from '../classes';
import { JobService } from '../job.service';

import { SortablejsOptions } from 'angular-sortablejs';

@Component({
  selector: 'app-build-page',
  templateUrl: './build-page.component.html',
  styleUrls: ['./build-page.component.less', '../app.component.less']
})
export class BuildPageComponent implements OnInit, OnDestroy {
  tree: TreeElement[];

  sub: any;

  constructor(private jobService: JobService) { }

  ngOnInit() {
    this.sub = this.jobService.tree.asObservable().subscribe(tree => {
      this.tree = tree;
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  options: SortablejsOptions = {
    group: {
      name: 'elements', pull: true, put: true
    },
    draggable: '.tree-element',
    ghostClass: 'ghost',
    chosenClass: 'dragged',
    animation: 150
  }


}

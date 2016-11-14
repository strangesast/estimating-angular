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
  visible: any;

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

  setVisible(folderType:string, enabled:boolean) {
    let visible = this.jobService.visibleFolders.getValue();
    console.log(visible);
  }

  options: SortablejsOptions = {
    group: {
      name: 'elements', pull: true, put: true
    },
    draggable: '.tree-element',
    ghostClass: 'ghost',
    chosenClass: 'dragged',
    animation: 150,
    onStart: (evt) =>{
      console.log('tree start');
    },
    onEnd: (evt) =>{
      console.log('tree end');
    },
    onAdd: (evt) =>{
      console.log('tree add');
    },
    onUpdate: (evt) =>{
      console.log('tree update');
    },
    onSort: (evt) =>{
      console.log('tree sort');
    },
    onRemove: (evt) =>{
      console.log('tree remove');
    },
    onFilter: (evt) =>{
      console.log('tree filter');
    },
    onMove: (evt) =>{
      // placement checking here
      //return evt.related.className.indexOf('tree-element') !== -1;
      return false;
    }
    //store: {
    //  get: (sortable):any[] => {
    //    console.log('get');
    //    return [];
    //  },
    //  set: (sortable):any[] => {
    //    console.log('set');
    //    return [];
    //  }
    //}
  }
}

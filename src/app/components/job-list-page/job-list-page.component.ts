import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';

import { JobListService } from '../../services/job-list.service';
import { SearchService } from '../../services/search.service';
import { UserService } from '../../services/user.service';

import { User, Collection } from '../../models';

interface CollectionRecord {
  folderCount: number,
  componentCount: number,
  childCount: number,
  buy: number,
  sell: number,
  collection: Collection
}

@Component({
  selector: 'app-job-list-page',
  templateUrl: './job-list-page.component.html',
  styleUrls: ['./job-list-page.component.less']
})
export class JobListPageComponent implements OnInit {
  jobs: Collection[] = [];
  users: User[] = [];

  editing: Collection = null;

  newCollection: Collection;
  newCollectionForm: FormGroup;

  aboutJob: any = {}; // { job: about }

  jobsSubject: BehaviorSubject<BehaviorSubject<Collection>[]>;
  constructor(private route: ActivatedRoute, private formBuilder: FormBuilder, private jobListService: JobListService, private searchService: SearchService, public userService: UserService) { }

  ngOnInit() {
    this.route.data.subscribe(({ jobs }) => {
      this.jobs = jobs;
    });
    this.searchService.setJob(null);
  }

  createNewJob() {
    let user = this.userService.currentUser;
    let name = 'New Collection ' + Math.ceil(Math.random()*100);
    let shortName = name.split(' ').join('_').replace(/[^\w-]/gi, '').toLowerCase().substring(0, 50);
    let collection = new Collection(name, 'description', user, shortName, { order: ['phase', 'building'] }, 'job');
    this.newCollectionForm = this.formBuilder.group({
      name: collection.name,
      description: collection.description,
      kind: collection.kind
    });
    this.newCollection = collection;

  }

  createNewJobSubmit(form) {
    let collection = Object.assign(this.newCollection, form.value)
    this.jobListService.createCollection(collection).then(() => this.newCollection = undefined);
  }

  cancelNewJob() {
    this.newCollection = undefined;
  }

  renameJob(job:Collection) {
    this.editing = job;
  }

  finishRename(job: Collection) {
    if(this.editing === job) {
      this.jobListService.update(job.id, { name: job.name}).then(() => this.editing = undefined);
    }
  }

  removeJob(job:Collection) {
    this.jobListService.remove(job);
  }

  filter(jobs: Collection[], filter?) {
    if(filter) return [];
    return jobs;
  }
}

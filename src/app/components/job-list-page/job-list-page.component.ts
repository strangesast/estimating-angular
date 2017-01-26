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

  newCollection: boolean;
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
    this.newCollectionForm = this.formBuilder.group({
      name: 'New Collection ' + Math.ceil(Math.random()*100),
      description: 'description',
      kind: 'job'
    });
    this.newCollection = true;

  }

  createNewJobSubmit(form) {
    let user = this.userService.currentUser;

    let description = 'description';

    let kind = form.value.kind;
    let shortName = form.value.name.split(' ').join('_').replace(/[^\w-]/gi, '').toLowerCase().substring(0, 50);
    let order = ['phase', 'building'].slice(kind == 'job' ? 0 : 1)
    let collection = new Collection(form.value.name, form.value.description, user, shortName, { order }, kind); 
    this.jobListService.createCollection(collection).then(() => this.newCollection = false);
  }

  cancelNewJob() {
    this.newCollection = false;
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

import { Component, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';

class User {
  id: number;
  name: string;
  username: string;
  email: string;
}

class Job {
  id: number;
  name: string;
  description: string;
  start_date?: Date;
  end_date?: Date;
  owner: number;
  local: boolean;
  remote: boolean;
}

const USERS: User[] = [
  {
    id: 0,
    name: 'Sam Zagrobelny',
    username: 'sazagrobelny',
    email: 'Samuel.Zagrobelny@dayautomation.com'
  }
];

var date1 = new Date();
var date2 = new Date();
date2.setDate(date1.getDate() - 1);

const JOBS: Job[] = [
  {
    id: 1,
    name: 'Job 123',
    description: 'This job is really great.',
    start_date: date1,
    end_date: date2,
    owner: USERS[0].id,
    local: true,
    remote: false
  },
  {
    id: 2,
    name: 'Job 234',
    description: 'This job is really great.',
    start_date: date1,
    end_date: date2,
    owner: USERS[0].id,
    local: true,
    remote: true
  }
];

@Component({
  selector: 'app-job-list-page',
  templateUrl: './job-list-page.component.html',
  styleUrls: ['./job-list-page.component.less']
})
export class JobListPageComponent implements OnInit {
  jobs: BehaviorSubject<Job[]> = new BehaviorSubject([]);
  users: BehaviorSubject<User[]> = new BehaviorSubject([]);

  job: Job = {
    id: 3,
    name: '',
    description: '',
    start_date: new Date(),
    end_date: new Date(),
    local: false,
    remote: false,
    owner: null
  };

  constructor() { }

  ngOnInit() {
    this.jobs.next(JOBS);
    this.users.next(USERS);
  }

  createNewJob():void {
    console.log(this.job);
  }

}

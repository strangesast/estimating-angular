import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { JobService } from '../job.service';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Job } from '../classes';


@Component({
  selector: 'app-details-page',
  templateUrl: './details-page.component.html',
  styleUrls: ['./details-page.component.less']
}) export class DetailsPageComponent implements OnInit {
  private sub: Subscription;
  private job: Job;
  private jobForm: FormGroup;
  private status: any[] = [];

  private availableUsers = [
    {name: 'Sam Zagrobelny', username: 'sazagrobelny', id: '1231231231231'}
  ];

  constructor(
    private jobService: JobService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit() {
    this.sub = this.jobService.job.subscribe(job => {
      this.jobForm = this.formBuilder.group({
        name: [job.name, [
          Validators.minLength(5),
          Validators.required]
        ],
        description: job.description,
        owner: this.formBuilder.group({
          name: [job.owner.name, Validators.required],
          username: [job.owner.username, [Validators.required, Validators.pattern('^[A-Za-z0-9]+$')]],
          email: [job.owner.email, Validators.required],
        }),
        shortname: [job.shortname, [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[A-Za-z0-9-_]+$')]
        ]
      });

      this.job = job;
      this.jobService.findChanges().then(hist => {
        console.log('history', hist);
      });
    });
    this.jobService.status.subscribe(s=>{
      console.log('status', s);
      this.status = s;
    });
  }
  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  reset() {
    this.jobForm.reset();
    this.jobForm.setValue({
      name: this.job.name,
      description: this.job.description,
      owner: {
        name: this.job.owner.name,
        username: this.job.owner.username,
        email: this.job.owner.email
      },
      shortname: this.job.shortname
    })
  }

  onSubmit({ dirty, value, valid }: { dirty: boolean, value: Job, valid: boolean}) {
    if(dirty && valid) {
      let j = Job.create(Object.assign({}, this.job.toJSON(false), value))
      console.log('val!', value, j);
      this.jobService.updateJob(j).then((r)=>{
        console.log('result', r);

      });
    } else if (!valid) {
      alert('invalid');
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder, 
  FormGroup, 
  Validators 
} from '@angular/forms';

import { Subscription } from 'rxjs';

import { JobService } from '../../services/job.service';

import { Collection } from '../../models/classes';


@Component({
  selector: 'app-details-page',
  templateUrl: './details-page.component.html',
  styleUrls: ['./details-page.component.less']
}) export class DetailsPageComponent implements OnInit {
  private sub1: Subscription;
  private sub2: Subscription;
  private sub3: Subscription;
  private job: Collection;
  private jobForm: FormGroup;
  private status: any[] = [];

  private availableUsers = [
    {name: 'Sam Zagrobelny', username: 'sazagrobelny', id: '1231231231231'}
  ];

  constructor(
    private jobService: JobService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.sub1 = this.route.parent.data.subscribe(({jobData: {job:jobSubject}})=>{
      jobSubject.first().subscribe(job => {
        this.job = job;
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
      });
      // probably ugly way of doing this
      this.sub2 = jobSubject.skip(1).subscribe(job => {
        this.jobForm.patchValue(job)
        this.jobForm.markAsPristine();
        this.job = job;
      });
    });
    this.jobService.status.subscribe(s=>{
      this.status = s;
    });
  }
  ngOnDestroy() {
    this.sub2.unsubscribe();
    this.sub1.unsubscribe();
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

  onSubmit({ dirty, value, valid }: { dirty: boolean, value: Collection, valid: boolean}) {
    if(dirty && valid) {
      let j = Collection.fromObject(Object.assign({}, this.job.toJSON(0), value))
      console.log('val!', value, j);
      /*
      this.jobService.updateJob(j).then((r)=>{
        console.log('result', r);

      });
      */
    } else if (!valid) {
      alert('invalid');
    }
  }
}

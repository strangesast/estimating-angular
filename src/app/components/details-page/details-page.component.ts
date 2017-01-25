import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder, 
  FormGroup, 
  Validators 
} from '@angular/forms';

import { Subscription } from 'rxjs';

import { JobService } from '../../services/job.service';

import { Collection } from '../../models';


@Component({
  selector: 'app-details-page',
  templateUrl: './details-page.component.html',
  styleUrls: ['./details-page.component.less']
}) export class DetailsPageComponent implements OnInit {
  private job: Collection;
  private jobForm: FormGroup;
  private jobUpdateSub: Subscription;

  private status: any[] = [];
  private exampleDate: Date = new Date();

  private availableUsers = [
    {name: 'Sam Zagrobelny', username: 'sazagrobelny', id: '1231231231231'}
  ];

  constructor(
    private jobService: JobService,
    private formBuilder: FormBuilder,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    this.route.parent.data.subscribe(({ job: { job: jobSubject }}) => {
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
      this.jobUpdateSub = jobSubject.skip(1).subscribe(job => {
        this.jobForm.patchValue(job)
        this.jobForm.markAsPristine();
        this.job = job;
      });
    });
  }

  ngOnDestroy() {
    this.jobUpdateSub.unsubscribe();
  }

  reset() {
    /*
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
    */
  }

  onSubmit({ dirty, value, valid }: { dirty: boolean, value: Collection, valid: boolean}) {
    if(dirty && valid) {
      let j = Collection.fromJSON(Object.assign({}, this.job.toJSON(), value))
      this.jobService.updateJob(j);

    } else if (!valid) {
      alert('invalid');
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  FormBuilder, 
  FormGroup, 
  Validators 
} from '@angular/forms';

import { BehaviorSubject, Subscription } from 'rxjs';

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

  private jobSubject: BehaviorSubject<Collection>;

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
    this.route.parent.data.subscribe(({ job: { collection, collectionSubject, editWindowsEnabled }}) => {
      editWindowsEnabled.next(true); // enable window visibility

      this.job = collection;
      this.jobForm = this.formBuilder.group({
        name: [collection.name, [
          Validators.minLength(5),
          Validators.required]
        ],
        description: collection.description,
        owner: this.formBuilder.group({
          name: [collection.owner.name, Validators.required],
          username: [collection.owner.username, [Validators.required, Validators.pattern('^[A-Za-z0-9]+$')]],
          email: [collection.owner.email, Validators.required],
        }),
        shortname: [collection.shortname, [
          Validators.required,
          Validators.minLength(3),
          Validators.pattern('^[A-Za-z0-9-_]+$')]
        ]
      });

      this.jobUpdateSub = (this.jobSubject = collectionSubject).skip(1).subscribe(job => {
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
      this.jobSubject.next(Object.assign(this.jobSubject.getValue(), value))

    } else if (!valid) {
      alert('invalid');
    }
  }
}

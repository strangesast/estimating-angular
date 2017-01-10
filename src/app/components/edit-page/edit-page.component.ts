import { ActivatedRoute, Params, Router }   from '@angular/router';
import { Location }                 from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  Component,
  OnInit,
} from '@angular/core';


import { JobService } from '../../services/job.service';

import { Child, ComponentElement, FolderElement } from '../../models/classes';

@Component({
  selector: 'app-edit-page',
  templateUrl: './edit-page.component.html',
  styleUrls: ['./edit-page.component.less']
})

export class EditPageComponent implements OnInit {

  constructor(
    private jobService: JobService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit():void{
    this.route.data.subscribe((data:any) => {
    });
  }

  backToBuild() {
    this.router.navigate(['build'], {relativeTo: this.route.parent});
  }

  ngOnDestroy() {
  }
}

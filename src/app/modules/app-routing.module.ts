import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { JobListPageComponent }       from '../components/job-list-page/job-list-page.component';
import { UserListPageComponent }      from '../components/user-list-page/user-list-page.component';
import { ProjectPageComponent }       from '../components/project-page/project-page.component';
import { BuildPageComponent }         from '../components/build-page/build-page.component';
import { EditPageComponent }          from '../components/edit-page/edit-page.component';
import { DetailsPageComponent }       from '../components/details-page/details-page.component';
import { EstimatingPageComponent }    from '../components/estimating-page/estimating-page.component';

import { ElementService }     from '../services/element.service';
import { JobService }         from '../services/job.service';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/jobs',
    pathMatch: 'full'
  },
  {
    path: 'jobs/:username',
    resolve: {
      elementService: ElementService
    },
    children: [
      {
        path: ':shortname',
        component: ProjectPageComponent,
        resolve: {
          jobData: JobService
        },
        children: [
          {
            path: '',
            redirectTo: 'build',
            pathMatch: 'full'
          },
          {
            path: 'details',
            component: DetailsPageComponent
          },
          {
            path: 'edit',
            component: EditPageComponent
          },
          {
            path: 'edit/:kind/:id',
            component: EditPageComponent
          },
          {
            path: 'build',
            component: BuildPageComponent
          },
          {
            path: 'estimate',
            component: EstimatingPageComponent
          }
        ]
      }
    ]
  },
  {
    path: 'jobs',
    component: JobListPageComponent,
    resolve: {
      elements: ElementService
    }
  },
  {
    path: 'users',
    resolve: {
      elements: ElementService,
    },
    children: [{
      path: '',
      component: UserListPageComponent
    }]
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [
    RouterModule
  ],
  providers: [
    ElementService,
    JobService
  ]
})
export class AppRoutingModule { }

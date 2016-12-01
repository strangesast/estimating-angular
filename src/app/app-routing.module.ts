import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TreeComponent } from './tree/tree.component';
import { TreeElementDetailComponent } from './tree-element-detail/tree-element-detail.component';

import { StartPageComponent } from './start-page/start-page.component';
import { UserSelectComponent } from './start-page/user-select/user-select.component';
import { UserCreateComponent } from './start-page/user-create/user-create.component';
import { JobListPageComponent } from './job-list-page/job-list-page.component';
import { SavePageComponent } from './save-page/save-page.component';

import { ProjectPageComponent } from './project-page/project-page.component';
import { BuildPageComponent }   from './build-page/build-page.component';
import { EditPageComponent }    from './edit-page/edit-page.component';
import { DetailsPageComponent } from './details-page/details-page.component';

import { ElementService } from './element.service';
import { JobService } from './job.service';
import { UserService } from './user.service';
import { ElementEditService } from './element-edit.service';

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
          jobService: JobService,
          userService: UserService
        },
        children: [
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
            component: EditPageComponent,
            resolve: {
              editService: ElementEditService
            }
          },
          {
            path: 'build',
            component: BuildPageComponent
          },
          {
            path: 'saves',
            component: SavePageComponent
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
    path: 'edit',
    component: EditPageComponent
  },
  {
    path: 'edit/:id',
    component: EditPageComponent
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
    JobService,
    UserService,
    ElementEditService
  ]
})
export class AppRoutingModule { }

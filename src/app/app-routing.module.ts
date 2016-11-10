import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TreeComponent } from './tree/tree.component';
import { TreeElementDetailComponent } from './tree-element-detail/tree-element-detail.component';

import { StartPageComponent } from './start-page/start-page.component';
import { UserSelectComponent } from './start-page/user-select/user-select.component';
import { UserCreateComponent } from './start-page/user-create/user-create.component';
import { JobListPageComponent } from './job-list-page/job-list-page.component';

import { ProjectPageComponent } from './project-page/project-page.component';
import { BuildPageComponent }   from './build-page/build-page.component';
import { EditPageComponent }    from './edit-page/edit-page.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/jobs',
    pathMatch: 'full'
  },
  {
    path: 'jobs/:username/:shortname',
    component: ProjectPageComponent,
    children: [
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
      }
    ]
  },
  {
    path: 'jobs',
    component: JobListPageComponent
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
  ]
})
export class AppRoutingModule { }

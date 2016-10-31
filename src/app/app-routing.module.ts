import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TreeComponent } from './tree/tree.component';
import { TreeElementDetailComponent } from './tree-element-detail/tree-element-detail.component';

import { BuildPageComponent } from './build-page/build-page.component';
import { EditPageComponent }  from './edit-page/edit-page.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/build',
    pathMatch: 'full'
  },
  {
    path: 'build',
    component: BuildPageComponent,
    children: [
      {
        path: '',
        component: TreeComponent
      }
    ]
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

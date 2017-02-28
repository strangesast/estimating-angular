import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { JobListPageComponent }    from './components/job-list-page/job-list-page.component';
import { UserListPageComponent }   from './components/user-list-page/user-list-page.component';
import { ProjectPageComponent }    from './components/project-page/project-page.component';
import { BuildPageComponent }      from './components/build-page/build-page.component';
import { EditPageComponent }       from './components/edit-page/edit-page.component';
import { DetailsPageComponent }    from './components/details-page/details-page.component';
import { EstimatingPageComponent } from './components/estimating-page/estimating-page.component';
import { SettingsPageComponent }   from './components/settings-page/settings-page.component';
import { SearchPageComponent }     from './components/search-page/search-page.component';
import { WorkspaceComponent }      from './components/workspace/workspace.component';
import { HistoryPageComponent }    from './components/history-page/history-page.component';
import { PageNotFoundComponent }   from './components/page-not-found/page-not-found.component';
import { JobNotFoundComponent }    from './components/job-not-found/job-not-found.component';
import { LoginPageComponent }      from './components/login-page/login-page.component';
import { OAuthComponent }          from './components/oauth/oauth.component';

import { ElementService } from './services/element.service';
import { SearchService }  from './services/search.service';
import { JobService }     from './services/job.service';
import { JobListService } from './services/job-list.service';
import { GitService }     from './services/git.service';
import { UserService }    from './services/user.service';

const routes: Routes = [
  {
    path: '',
    redirectTo: '/jobs',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginPageComponent,
    resolve: { user: UserService }
  },
  {
    path: '',
    component: WorkspaceComponent,
    canActivate: [UserService],
    children: [
      {
        path: 'jobs/:username',
        resolve: {
          elementService: ElementService,
          search: SearchService
        },
        children: [
          {
            path: ':shortname',
            component: ProjectPageComponent,
            resolve: {
              job: JobService
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
              },
              {
                path: 'history',
                component: HistoryPageComponent,
                resolve: {
                  git: GitService
                }
              }
            ]
          },
          {
            path: '**',
            component: JobNotFoundComponent
          }
        ]
      },
      {
        path: 'jobs',
        component: JobListPageComponent,
        resolve: {
          jobs: JobListService
        }
      },
      {
        path: 'users',
        resolve: {
          elements: ElementService,
          search: SearchService
        },
        children: [{
          path: '',
          component: UserListPageComponent
        }]
      }
    ]
  },
  {
    path: 'search',
    component: SearchPageComponent,
    resolve: {
      elements: ElementService
    }
  },
  {
    path: 'settings',
    component: SettingsPageComponent,
    resolve: {
      elements: ElementService
    }
  },
  {
    path: 'oauth',
    component: OAuthComponent
  },
  {
    path: '**',
    component: PageNotFoundComponent
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
    JobListService,
    GitService
  ]
})
export class AppRoutingModule { }

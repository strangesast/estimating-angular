import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule,ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent }           from './app.component';
import { TreeComponent }          from './tree/tree.component';
import { TreeElementComponent }   from './tree/tree-element/tree-element.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { SearchComponent }        from './search/search.component';

import { ElementRetrievalService } from './element-retrieval.service';
import { TreeBuilderService }      from './tree-builder.service';
import { SearchServiceService }    from './search-service.service';
import { ElementService }          from './element.service';

import { UserService }             from './user.service';
import { AppRoutingModule }           from './app-routing.module';
import { TreeElementDetailComponent } from './tree-element-detail/tree-element-detail.component';
import { EditPageComponent }          from './edit-page/edit-page.component';
import { BuildPageComponent }         from './build-page/build-page.component';
import { CreatePageComponent }        from './create-page/create-page.component';

import { SortablejsModule } from 'angular-sortablejs';
import { ProjectPageComponent } from './project-page/project-page.component';
import { StartPageComponent } from './start-page/start-page.component';
import { UserSelectComponent } from './start-page/user-select/user-select.component';
import { UserCreateComponent } from './start-page/user-create/user-create.component';
import { JobSelectComponent } from './start-page/job-select/job-select.component';
import { JobCreateComponent } from './start-page/job-create/job-create.component';
import { JobListPageComponent } from './job-list-page/job-list-page.component';
import { SavePageComponent } from './save-page/save-page.component';
import { DetailsPageComponent } from './details-page/details-page.component';
import { EstimatingPageComponent } from './estimating-page/estimating-page.component';
import { UserListPageComponent } from './user-list-page/user-list-page.component';

@NgModule({
  declarations: [
    AppComponent,
    TreeComponent,
    TreeElementComponent,
    SearchResultsComponent,
    SearchComponent,
    TreeElementDetailComponent,
    EditPageComponent,
    BuildPageComponent,
    CreatePageComponent,
    ProjectPageComponent,
    StartPageComponent,
    UserSelectComponent,
    UserCreateComponent,
    JobSelectComponent,
    JobCreateComponent,
    JobListPageComponent,
    SavePageComponent,
    DetailsPageComponent,
    EstimatingPageComponent,
    UserListPageComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    AppRoutingModule,
    SortablejsModule
  ],
  providers: [
    TreeBuilderService,
    SearchServiceService,
    ElementRetrievalService,
    ElementService,
    UserService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

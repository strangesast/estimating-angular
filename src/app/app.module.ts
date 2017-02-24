import { BrowserModule } from '@angular/platform-browser';
import { NgModule }      from '@angular/core';
import { HttpModule }    from '@angular/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { CoreModule }       from './core/core.module';

import {
  SearchService,
  ElementService,
  DragService,
  JobService,
  UserService,
  TreeService
} from './services';

import { AppComponent }               from './components/app.component';
import { SearchComponent }            from './components/search/search.component';
import { EditPageComponent }          from './components/edit-page/edit-page.component';
import { BuildPageComponent }         from './components/build-page/build-page.component';
import { CreatePageComponent }        from './components/create-page/create-page.component';
import { JobListPageComponent }       from './components/job-list-page/job-list-page.component';
import { DetailsPageComponent }       from './components/details-page/details-page.component';
import { EstimatingPageComponent }    from './components/estimating-page/estimating-page.component';
import { UserListPageComponent }      from './components/user-list-page/user-list-page.component';
import { EditWindowComponent }        from './components/edit-window/edit-window.component';
import { NestComponent }              from './components/nest/nest.component';
import { ProjectPageComponent }       from './components/project-page/project-page.component';
import { SimpleTreeComponent }        from './components/simple-tree/simple-tree.component';
import { SimpleTreeElementComponent } from './components/simple-tree/simple-tree-element/simple-tree-element.component';
import { SettingsPageComponent }      from './components/settings-page/settings-page.component';
import { SearchPageComponent }        from './components/search-page/search-page.component';
import { WorkspaceComponent }         from './components/workspace/workspace.component';
import { HistoryPageComponent }       from './components/history-page/history-page.component';
import { FilterArrayPipe }            from './pipes/filter-array.pipe';
import { TreeComponent }              from './components/tree/tree.component';
import { ElementDisplayComponent }    from './components/element-display/element-display.component';


import {
  TypeToClassPipe,
  ClassToStringPipe
} from './pipes';
import { LoginPageComponent } from './components/login-page/login-page.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { JobNotFoundComponent } from './components/job-not-found/job-not-found.component';
import { D3ExampleComponent } from './components/d3-example/d3-example.component';
import { ExampleComponent } from './components/d3-example/example-component/example-component.component';
import { ListComponent } from './components/list/list.component';
import { ListElementComponent } from './components/list/list-element/list-element.component';


@NgModule({
  declarations: [
    AppComponent,
    SearchComponent,
    EditPageComponent,
    BuildPageComponent,
    CreatePageComponent,
    ProjectPageComponent,
    JobListPageComponent,
    DetailsPageComponent,
    EstimatingPageComponent,
    UserListPageComponent,
    EditWindowComponent,
    NestComponent,
    SimpleTreeComponent,
    SimpleTreeElementComponent,
    TypeToClassPipe,
    ClassToStringPipe,
    SettingsPageComponent,
    SearchPageComponent,
    WorkspaceComponent,
    HistoryPageComponent,
    FilterArrayPipe,
    TreeComponent,
    ElementDisplayComponent,
    LoginPageComponent,
    PageNotFoundComponent,
    JobNotFoundComponent,
    D3ExampleComponent,
    ExampleComponent,
    ListComponent,
    ListElementComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    AppRoutingModule,
    CoreModule
  ],
  providers: [
    SearchService,
    ElementService,
    DragService,
    JobService,
    UserService,
    ClassToStringPipe,
    TreeService
  ],
  entryComponents: [ SimpleTreeElementComponent, ElementDisplayComponent, ListElementComponent ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }

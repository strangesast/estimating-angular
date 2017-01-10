import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppRoutingModule }           from './app-routing.module';

import { SearchService }  from './services/search.service';
import { ElementService } from './services/element.service';

import { AppComponent }               from './components/app.component';
import { TreeComponent }              from './components/tree/tree.component';
import { TreeElementComponent }       from './components/tree/tree-element/tree-element.component';
import { SearchResultsComponent }     from './components/search-results/search-results.component';
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

import { TypeToClassPipe }            from './pipes/type-to-class.pipe';


@NgModule({
  declarations: [
    AppComponent,
    TreeComponent,
    TreeElementComponent,
    SearchResultsComponent,
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
    TypeToClassPipe
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    AppRoutingModule
  ],
  providers: [
    SearchService,
    ElementService
  ],
  entryComponents: [ SimpleTreeElementComponent, TreeElementComponent ],
  bootstrap: [AppComponent]
})
export class AppModule { }

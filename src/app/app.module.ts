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
  UserService
} from './services';

import {
  AppComponent,
  SearchComponent,
  EditPageComponent,
  BuildPageComponent,
  CreatePageComponent,
  JobListPageComponent,
  DetailsPageComponent,
  EstimatingPageComponent,
  UserListPageComponent,
  EditWindowComponent,
  NestComponent,
  ProjectPageComponent,
  SimpleTreeComponent,
  SimpleTreeElementComponent,
  SettingsPageComponent,
  SearchPageComponent,
  WorkspaceComponent } from './components'; import {
  TypeToClassPipe,
  ClassToStringPipe
} from './pipes';
import { HistoryPageComponent } from './components/history-page/history-page.component';


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
    HistoryPageComponent
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
    ClassToStringPipe
  ],
  entryComponents: [ SimpleTreeElementComponent ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }

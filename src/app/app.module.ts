import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { TreeComponent } from './tree/tree.component';
import { TreeElementComponent } from './tree/tree-element/tree-element.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { SearchComponent } from './search/search.component';

import { TreeBuilderService } from './tree-builder.service';
import { ElementEditService } from './element-edit.service';
import { SearchServiceService } from './search-service.service';

import { AppRoutingModule } from './app-routing.module';
import { TreeElementDetailComponent } from './tree-element-detail/tree-element-detail.component';
import { EditPageComponent } from './edit-page/edit-page.component';
import { BuildPageComponent } from './build-page/build-page.component';
import { CreatePageComponent } from './create-page/create-page.component';

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
    CreatePageComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule,
    AppRoutingModule
  ],
  providers: [
    TreeBuilderService,
    ElementEditService,
    SearchServiceService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

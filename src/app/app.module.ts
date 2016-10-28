import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { TreeComponent } from './tree/tree.component';
import { TreeElementComponent } from './tree/tree-element/tree-element.component';
import { SearchResultsComponent } from './search-results/search-results.component';
import { TreeNavigationComponent } from './tree-navigation/tree-navigation.component';
import { SearchComponent } from './search/search.component';

import { TreeBuilderService } from './tree-builder.service';

@NgModule({
  declarations: [
    AppComponent,
    TreeComponent,
    TreeElementComponent,
    SearchResultsComponent,
    TreeNavigationComponent,
    SearchComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpModule
  ],
  providers: [
    TreeBuilderService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.less']
})
export class SettingsPageComponent implements OnInit {

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
  }

  resetEverything() {
    (<any>indexedDB).webkitGetDatabaseNames().onsuccess = (res) => [].slice.call(res.target.result).forEach((db) => indexedDB.deleteDatabase(db));

  }

}

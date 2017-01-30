import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['../../styles/general.less', './settings-page.component.less']
})
export class SettingsPageComponent implements OnInit {
  locked = false;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
  }

  resetEverything() {
    return new Promise((resolve, reject) => {
      (<any>indexedDB).webkitGetDatabaseNames().onsuccess = (res) => {
        let dbs = [].slice.call(res.target.result)
        let result = [];
        let complete = (e) => {
          result.push(e.target.result);
          if(result.length == dbs.length) resolve(result);
        }
        // doesn't call success but works
        dbs.forEach((db) => indexedDB.deleteDatabase(db).onsuccess = complete);
      }
      this.locked = true;
      setTimeout(() => window.location.reload(), 500)
    })
  }

}

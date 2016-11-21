import { Component, OnInit } from '@angular/core';

import { Observable, BehaviorSubject } from 'rxjs';
import { ElementService } from '../element.service';
import { JobService } from '../job.service';

class Save {
  constructor(public commit:string, public message:string) { }
}

@Component({
  selector: 'app-save-page',
  templateUrl: './save-page.component.html',
  styleUrls: ['./save-page.component.less', '../app.component.less']
})
export class SavePageComponent implements OnInit {
  commits: BehaviorSubject<any[]> = new BehaviorSubject([]);

  constructor(private elementService: ElementService) { }

  ngOnInit() {
  }

  getHistory(start:string, arr?) : Promise<any[]> {
    arr = arr || [];
    return this.elementService.loadAs('commit', start).then(res => {
      arr.unshift(res);
      if(res.parents.length) {
        return this.getHistory(res.hash, arr);
      }
      return arr
    });
  }

}

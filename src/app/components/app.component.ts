import { OnInit, Component } from '@angular/core';

import { Subject, Observable, BehaviorSubject, ReplaySubject } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {
  title = 'Estimating';

  constructor() { }

  ngOnInit() {
  }

}

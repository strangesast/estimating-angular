import { Input, Component, OnInit } from '@angular/core';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { ElementService } from '../../element.service';

@Component({
  selector: 'app-user-select',
  templateUrl: './user-select.component.html',
  styleUrls: ['./user-select.component.less']
})
export class UserSelectComponent implements OnInit {

  constructor(private elementService: ElementService) { }

  ngOnInit() {
  }

  createNew() {

  }

}

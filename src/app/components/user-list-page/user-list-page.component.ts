import { Component, OnInit } from '@angular/core';

import { ElementService } from '../../services/element.service';

import { User } from '../../models';

@Component({
  selector: 'app-user-list-page',
  templateUrl: './user-list-page.component.html',
  styleUrls: ['../../styles/general.less', './user-list-page.component.less']
})
export class UserListPageComponent implements OnInit {
  users: User[];

  constructor(private elementService: ElementService) { }

  ngOnInit() {}

}

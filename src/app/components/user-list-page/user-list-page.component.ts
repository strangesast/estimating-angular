import { Component, OnInit } from '@angular/core';

import { ElementService } from '../../services/element.service';

import { User } from '../../models/classes';

@Component({
  selector: 'app-user-list-page',
  templateUrl: './user-list-page.component.html',
  styleUrls: ['../app.component.less', './user-list-page.component.less']
})
export class UserListPageComponent implements OnInit {
  users: User[];

  constructor(private elementService: ElementService) { }

  ngOnInit() {
    /*
    this.elementService.getUsers().then(users => {
      this.users = users;
    });
    */
  }

}

import { Component, OnInit, OnDestroy } from '@angular/core';

import { Observable } from 'rxjs';

import { UserService } from '../../services/user.service';
import { User } from '../../models';

let USERS = [
  new User('John Doe', 'john.doe', 'john.doe@google.com')
];

@Component({
  selector: 'app-user-list-page',
  templateUrl: './user-list-page.component.html',
  styleUrls: ['../../styles/general.less', './user-list-page.component.less']
})
export class UserListPageComponent implements OnInit, OnDestroy {
  users: User[] = [];

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.users = USERS;
    this.userService.currentUser.subscribe(user => {
      this.users = [user];
    });
  }

  ngOnDestroy() {}

}

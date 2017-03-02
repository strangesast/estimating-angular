import { Component, Renderer, OnInit, OnDestroy } from '@angular/core';
import { URLSearchParams } from '@angular/http';

import { Observable } from 'rxjs';

import { UserService } from '../../services/user.service';
import { OAuthService } from '../../services/oauth.service';
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

  constructor(private userService: UserService, private oauth: OAuthService, private renderer: Renderer) {}

  ngOnInit() {
    this.users = USERS;
    this.userService.currentUser.subscribe(user => {
      this.users = [user];
    });

    this.test();
  }

  ngOnDestroy() {}

  async test() {
    let renderer = this.renderer;

    let tokens: any = {};
    // github
    tokens.core = await this.oauth.authorizeCore(renderer);
    tokens.github = await this.oauth.authorizeGithub(renderer);
    tokens.salesforce = await this.oauth.authorizeSalesforce(renderer);

    console.log('tokens', tokens);
  }

}

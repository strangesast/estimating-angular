import { Injectable } from '@angular/core';

import { Http, Response } from '@angular/http';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

import { ElementService } from './element.service';

import { User } from './classes';

const TEST_USER: User = new User(
  'Sam Zagrobelny', // name
  'sazagrobelny', // username
  'sazagrobelny@dayautomation.com' // email
);

@Injectable()
export class UserService {
  activeUser: BehaviorSubject<User | null>;
  _isAuthenticated: BehaviorSubject<boolean> = new BehaviorSubject(false);
  users: User[] = [TEST_USER];

  constructor(private elementService: ElementService) { }

  resolve():Promise<any>|boolean {
    return this.elementService.getUsers();
  }

  isAuthenticated():Observable<Boolean> {
    return this._isAuthenticated.asObservable();
  }

  userFromUsername(username: string): Promise<User> {
    return this.elementService.retrieveUser(username);
  }

  getActiveUser(): User {
    return TEST_USER;
    //return this.activeUser.getValue();
  }

  getUsers(): Promise<User[]> {
    return Promise.resolve(this.users);
  }


}

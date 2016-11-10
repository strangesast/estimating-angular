import { Injectable } from '@angular/core';

import { Http, Response } from '@angular/http';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';

import { ElementService } from './element.service';

class User {
  name: string;
  username: string;
  email: string;
}

@Injectable()
export class UserService {
  activeUser: BehaviorSubject<User | null>;
  isAuthenticated: BehaviorSubject<boolean> = new BehaviorSubject(false);
  users: User[];

  init() {
    return this.elementService.init().then(()=>{
      return this.elementService.getUsers();
    });

  }

  constructor(private elementService: ElementService) { }

}

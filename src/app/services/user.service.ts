import { Injectable } from '@angular/core';
import { User } from '../models';

const TEST_USER = new User('Sam Zagrobelny', 'sazagrobelny', 'Samuel.Zagrobelny@dayautomation.com');

@Injectable()
export class UserService {
  public currentUser: User = TEST_USER;

  constructor() { }

}

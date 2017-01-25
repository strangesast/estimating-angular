export interface IUser {
  _id?: string|number;
  username: string;
  name: string;
}

export class User implements IUser {
  static readonly store = 'users';

  static fromJSON(obj) {
    let user = Object.create(User.prototype);
    return Object.assign(user, obj);
  }

  toJSON() {
    return Object.assign({}, this);
  }

  public _id: string|number;

  constructor(public name: string, public username: string, public email: string) { }
}

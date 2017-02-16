export interface IUser {
  _id?: string|number;
  username: string;
  name?: string;
  active: boolean;
  email: string;
  employer_id: string;
  first_name: string;
  id: string;
  last_name: string;
  middle_name: string;
  title: string;
  user_id: string;
  version_id: string;
}

export class User implements IUser {
  static readonly store = 'users';
  static readonly keys = ['username', 'name'];

  public active;
  public employer_id;
  public id;
  public middle_name;
  public title;
  public user_id;
  public version_id;
  public first_name;
  public last_name;

  get name() {
    return this.first_name + ' ' + this.last_name;
  }

  static fromJSON(obj) {
    let user = Object.create(User.prototype);
    return Object.assign(user, obj);
  }

  toJSON() {
    return Object.assign({}, this);
  }

  public _id: string|number;

  constructor(name: string, public username: string, public email: string) {
    let [first, last] = name.split(' ');
    this.first_name = first;
    this.last_name = last;
  }
}

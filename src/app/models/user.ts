export class User {
  static storeName = 'users';

  public _id?: string;

  static fromObject(obj) {
    let user = new User(obj.name, obj.username, obj.email);
    if (obj._id) {
      user._id = obj._id;
    }
    return user;
  }


  constructor(
    public name: string,
    public username: string,
    public email: string
  ) { }
}

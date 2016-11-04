import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

class NewUser {
  name: string;
  username: string;
  email: string;
};

@Component({
  selector: 'app-user-create',
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.less']
})

export class UserCreateComponent implements OnInit {
  user: NewUser = {name: 'Jon Doe', username: 'jon_doe', email: 'jon@doe'};
  JSON: any = JSON;

  constructor(private location: Location) { }

  ngOnInit() {
  }

  goBack(): void {
    this.location.back();
  }

}

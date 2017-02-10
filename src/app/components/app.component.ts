import { OnInit, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BehaviorSubject } from 'rxjs';

import { UserService } from '../services/user.service';
import { User } from '../models';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['../styles/general.less', './app.component.less']
})
export class AppComponent implements OnInit {
  title = 'Estimating';
  user: User;

  constructor(private userService: UserService, private route: ActivatedRoute) { }

  ngOnInit() {
    this.userService.currentUser.subscribe(user => this.user = user);
  }

}

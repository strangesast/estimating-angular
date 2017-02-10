import { Renderer, Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Subscription } from 'rxjs';

import { UserService } from '../../services/user.service';
import { User } from '../../models';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.less']
})
export class LoginPageComponent implements OnInit, OnDestroy {
  windowObjectReference = null;
  windowMessageListener: Function;
  user: User;

  userWaitSub: Subscription;

  constructor(private route: ActivatedRoute, private userService: UserService, private renderer: Renderer) { }

  ngOnInit() {
    this.route.data.subscribe(({ user: userSubject }) => {
      let wait = userSubject.skip(1).filter(user => user != null);
      userSubject.take(1).subscribe(user => {
        if (user) {

        } else {
          this.userWaitSub = wait.subscribe(user => {
            this.userService.completeNavigation();
          });
        }
      });
    });
  }

  openLogin() {
    if (this.windowObjectReference && !this.windowObjectReference.closed) {
      this.windowObjectReference.focus();

    } else {
      if (this.windowMessageListener) this.windowMessageListener();
      this.windowObjectReference = window.open(this.userService.authWindowURL, 'Core Login', 'toolbar=no,dependent=yes,height=600,width=600');
      this.windowMessageListener = this.renderer.listenGlobal('window', 'message', async(event) => {
        let data = event.data;
        let code = data.code;
        if (!code) {
          return;
        }
        this.windowObjectReference.close();
        this.windowObjectReference = null;
        return this.userService.login(code);
      });
    }
  }

  anon() {};

  ngOnDestroy() {
    if (this.windowObjectReference) {
      this.windowObjectReference.close();
      this.windowMessageListener();
    }
  }
}

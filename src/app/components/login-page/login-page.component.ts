import { Renderer, Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { Subscription } from 'rxjs';

import { UserService } from '../../services/user.service';
import { User } from '../../models';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.less']
})
export class LoginPageComponent implements OnInit, OnDestroy { windowObjectReference = null;
  windowMessageListener: Function;

  user: User;
  userSub: Subscription;

  coreStatus;
  coreSub: Subscription;

  sfStatus;
  sfSub;

  userWaitSub: Subscription;

  constructor(private router: Router, private route: ActivatedRoute, private userService: UserService, private renderer: Renderer) { }

  ngOnInit() {
    // current user
    // core status
    // salesforce status
    this.route.data.subscribe(({ user: { user: userSubject, core: coreSubject } }) => {
      let redirect = this.route.snapshot.queryParams['redirect'];

      this.userSub = userSubject.subscribe(user => {
        this.user = user;
        if (user && redirect) {
          this.router.navigateByUrl(redirect);
        }
      });

      this.coreSub = coreSubject.subscribe(s => this.coreStatus = s);
    });
  }

  openLogin() {
    if (this.windowObjectReference && !this.windowObjectReference.closed) {
      this.windowObjectReference.focus();

    } else {
      if (this.windowMessageListener) this.windowMessageListener();
      this.windowObjectReference = window.open(this.userService.coreAuthURL, 'Core Login', 'toolbar=no,dependent=yes,height=600,width=600');
      this.windowMessageListener = this.renderer.listenGlobal('window', 'message', async(event) => {
        let data = event.data;
        let code = data.code;
        if (!code) {
          return;
        }
        this.windowObjectReference.close();
        this.windowObjectReference = null;
        return this.userService.login(code).toPromise();
      });
    }
  }

  logout() {
    return this.userService.logout().toPromise();
  }

  changeUser(user) {
    if (!this.coreStatus) this.userService.changeUser(user);
  }

  anon() {};

  ngOnDestroy() {
    if (this.windowMessageListener) {
      this.windowMessageListener();
    }
    if (this.windowObjectReference) {
      this.windowObjectReference.close();
    }
  }
}

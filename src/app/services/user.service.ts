import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { URLSearchParams, Http, Headers, RequestOptions } from '@angular/http';
import { NavigationExtras, Resolve, Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { Observable, BehaviorSubject } from 'rxjs';

import { User } from '../models';

import { environment } from '../../environments/environment';
const { LOCAL_ADDR, API_ADDR, CLIENT_ID, CLIENT_SECRET } = environment;

const AnonymousUser = new User('Anonymous', 'anonymous', 'anon@anon.com');

@Injectable()
export class UserService implements OnInit, OnDestroy, CanActivate, Resolve<any> {
  currentUser: BehaviorSubject<User> = new BehaviorSubject<User>(null);
  coreAccessToken: string;
  authorizationCode: string;

  get authorizationOptions(): RequestOptions {
    return this.coreAccessToken ? new RequestOptions({ headers: new Headers({ 'Authorization': 'Bearer ' + this.coreAccessToken }) }) : null;
  };

  get coreRedirectURL(): string {
    return `${ LOCAL_ADDR }/oauth`;
  }

  get coreAuthURL(): string {
    let params = new URLSearchParams();
    params.set('client_id', CLIENT_ID);
    params.set('response_type', 'code');
    params.set('redirect_uri', this.coreRedirectURL);
    params.set('scopes', 'user');
    return `${ API_ADDR }/oauth/authorize?${ params.toString() }`;
  }

  coreRefreshToken: string;

  coreAuthState = new BehaviorSubject(0); // 0, 1, 2
  sfAuthState = new BehaviorSubject(0); // 0, 1, 2

  initialized = new BehaviorSubject(false);


  constructor(private router: Router, private http: Http) {
    this.init();
  }

  async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    let user = this.currentUser.getValue();
    if (user) {
      return true;
    } else if (this.coreAccessToken) {
      user = await this.getCurrentUser();
      if (user) {
        this.currentUser.next(user);
        return true;
      }
    }

    let extras: NavigationExtras = { queryParams: { redirect: state.url } };
    this.router.navigate(['/login'], extras);
    return false;
  }

  async init() {
    let user = JSON.parse(localStorage.getItem('user'));
    this.currentUser.next(user ? User.fromJSON(user) : null);

    // core stuff
    this.coreAccessToken = localStorage.getItem('core_access_token');
    this.authorizationCode = localStorage.getItem('core_authorization_code'); // 'code'
    this.coreRefreshToken = localStorage.getItem('core_refresh_token');

    if (this.coreAccessToken) {
      let t = await this.testCore();

    } else {
    }
  }

  async testCore() {
    if (!this.authorizationOptions) return false;
    let test = await this.http.get(`${ API_ADDR }/sessions/me.json`, this.authorizationOptions).map(res => res.json()).toPromise();
    if (!test || test.user) {
      await this.refresh();
    }
    this.coreAuthState.next(1);
    return true;
  }

  async getCurrentUser() {
    if (!this.coreAccessToken) return null;
    let r1 = await this.http.get(`${ API_ADDR }/sessions/me.json`, this.authorizationOptions)
      .map(res => res.json())
      .toPromise();

    if (r1 && r1.user ) {
      let user = r1.user;
      let r2 = await this.http.get(`${ API_ADDR }/data/people/${ user.person_id }.json`, this.authorizationOptions)
        .map(res => res.json())
        .toPromise();

      if (!r2 || !r2.person) {
        throw new Error('person info not accessible');
      }

      this.coreAuthState.next(1);

      let person = r2.person;
      return User.fromJSON(Object.assign(person, { username: user.name, user_id: user.id }));
    }
    this.coreAuthState.next(0);
    return null;
  }

  async refresh() {
    if (!this.coreRefreshToken) throw new Error('need a refresh token for refresh');
    return this.login(this.coreRefreshToken, true);
  }

  async login(authorizationCode: string, refresh = false) {
    if (!authorizationCode) throw new Error('no auth code provided');
    let body = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: this.coreRedirectURL,
      grant_type: refresh ? 'refresh_token' : 'authorization_code'
    };
    body[refresh ? 'refresh_token' : 'code'] = authorizationCode;
    let headers = new Headers({ 'Content-Type': 'application/x-www-form-urlencoded' });
    let { access_token: coreAccessToken, refresh_token: coreRefreshToken } = await this.http.post(`${ API_ADDR }/oauth/token`, body, headers).map(response => response.json()).toPromise();

    this.coreAccessToken = coreAccessToken;
    localStorage.setItem('core_access_token', coreAccessToken);
    this.coreRefreshToken = coreRefreshToken;
    localStorage.setItem('core_refresh_token', coreRefreshToken);

    let user = await this.getCurrentUser();

    localStorage.setItem('user', JSON.stringify(user));
    
    this.currentUser.next(user);

    return user;
  }

  async logout() {
    if (this.authorizationOptions) {
      let body = {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        token: this.coreAccessToken
      };
      let res = await this.http.post(`${ API_ADDR }/oauth/revoke`, body, this.authorizationOptions).map(res => res.json()).toPromise();
      this.coreAccessToken = null;
      localStorage.removeItem('core_access_token');
      this.coreRefreshToken = null;
      localStorage.removeItem('core_refresh_token');

      this.coreAuthState.next(0);

      /*
      this.currentUser.next(null);
      localStorage.removeItem('user');
      */

    } else {
      throw new Error('not logged in');
    }
  }

  async changeUser(user) {
    // currently only for removing user
    if (!user) {
      localStorage.removeItem('user');
    }
    this.currentUser.next(user);
  }

  async resolve() {
    return { user: this.currentUser, core: this.coreAuthState };
  }
  ngOnInit() {}
  ngOnDestroy() {}


}
